// Behavioural test: exercises the atomic invoice checkout against the real DB
import { Prisma, StockTransactionType, UserRole, type Part } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../lib/prisma';
import { DomainValidationError, InsufficientStockError, NotFoundError } from './errors';
import { createInvoice } from './invoicing';
import { appendStockTransaction } from './stockLedger';
import { createCatalogFixture, createPartFixture } from './test-fixtures';

describe('invoicing', () => {
  const ts = Date.now();
  let partCounter = 0;
  let shopCounter = 0;

  let manufacturerId: number;
  let categoryId: number;

  const partIds: number[] = [];
  const shopIds: number[] = [];
  const userIds: number[] = [];

  async function createShopWithUser(): Promise<{ shopId: number; userId: number }> {
    shopCounter += 1;
    const shop = await prisma.shop.create({ data: { name: `Invoicing Test Shop ${ts}-${shopCounter}` } });
    shopIds.push(shop.id);
    const user = await prisma.user.create({
      data: { shopId: shop.id, name: `Invoicing Test User ${ts}-${shopCounter}`, role: UserRole.OWNER },
    });
    userIds.push(user.id);
    return { shopId: shop.id, userId: user.id };
  }

  async function createPart(): Promise<Part> {
    partCounter += 1;
    const part = await createPartFixture(prisma, {
      sku: `INV-SKU-${ts}-${partCounter}`,
      manufacturerPartNumber: `INV-MPN-${ts}-${partCounter}`,
      name: `Invoicing Test Part ${ts}-${partCounter}`,
      manufacturerId,
      categoryId,
    });
    partIds.push(part.id);
    return part;
  }

  async function createStockedPart(
    shopId: number,
    userId: number,
    quantity: number,
  ): Promise<Part> {
    const part = await createPart();
    await appendStockTransaction({
      shopId,
      partId: part.id,
      userId,
      type: StockTransactionType.PURCHASE,
      quantity,
      unitPrice: 50,
    });
    return part;
  }

  async function quantityOnHand(shopId: number, partId: number): Promise<number> {
    const item = await prisma.inventoryItem.findUnique({
      where: { shopId_partId: { shopId, partId } },
    });
    return item ? item.quantityOnHand.toNumber() : 0;
  }

  beforeAll(async () => {
    const catalog = await createCatalogFixture(prisma, `Invoicing Test ${ts}`);
    manufacturerId = catalog.manufacturerId;
    categoryId = catalog.categoryId;
  });

  afterAll(async () => {
    await prisma.invoiceLine.deleteMany({ where: { invoice: { shopId: { in: shopIds } } } });
    await prisma.invoice.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.invoiceSequence.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.stockTransaction.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.inventoryItem.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.part.deleteMany({ where: { id: { in: partIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
    await prisma.manufacturer.delete({ where: { id: manufacturerId } });
    await prisma.category.delete({ where: { id: categoryId } });
  });

  describe('createInvoice — happy path', () => {
    it('decrements every line, records one SALE per line, and reconciles the total', async () => {
      const { shopId, userId } = await createShopWithUser();
      const partA = await createStockedPart(shopId, userId, 10);
      const partB = await createStockedPart(shopId, userId, 10);
      const partC = await createStockedPart(shopId, userId, 10);

      // Input deliberately out of partId order to exercise the internal sort.
      const invoice = await createInvoice({
        shopId,
        userId,
        customerName: 'Walk-in',
        customerPhone: '99999',
        lines: [
          { partId: partC.id, quantity: 0.333, unitPrice: 3.0 }, // 0.999 -> HALF_UP 1.00
          { partId: partA.id, quantity: 2, unitPrice: 150.0 }, // 300.00
          { partId: partB.id, quantity: 3, unitPrice: 99.99 }, // 299.97
        ],
      });

      expect(invoice.invoiceNumber).toBe('INV-000001');
      expect(invoice.total.toNumber()).toBe(600.97);
      expect(invoice.lines).toHaveLength(3);

      // Line totals reconcile exactly to the grand total (round-then-sum).
      const sumOfLines = invoice.lines.reduce(
        (sum, line) => sum.plus(line.lineTotal),
        new Prisma.Decimal(0),
      );
      expect(invoice.total.equals(sumOfLines)).toBe(true);

      // Inventory decremented per line.
      expect(await quantityOnHand(shopId, partA.id)).toBe(8);
      expect(await quantityOnHand(shopId, partB.id)).toBe(7);
      expect(await quantityOnHand(shopId, partC.id)).toBe(9.667);

      // Exactly one negated SALE stock_transaction per line.
      const sales = await prisma.stockTransaction.findMany({
        where: { shopId, type: StockTransactionType.SALE },
      });
      expect(sales).toHaveLength(3);
      for (const sale of sales) {
        expect(sale.quantity.isNegative()).toBe(true);
      }

      // Each returned line's snapshot + stockTransactionId is real and points at a SALE row.
      const partById = new Map([partA, partB, partC].map((part) => [part.id, part]));
      for (const line of invoice.lines) {
        const source = partById.get(line.partId);
        expect(source).toBeDefined();
        expect(line.partSku).toBe(source!.sku);
        expect(line.partName).toBe(source!.name);

        const linked = await prisma.stockTransaction.findUnique({
          where: { id: line.stockTransactionId },
        });
        expect(linked).not.toBeNull();
        expect(linked!.type).toBe(StockTransactionType.SALE);
        expect(linked!.quantity.equals(line.quantity.negated())).toBe(true);
      }
    });
  });

  describe('createInvoice — partial oversell rolls back the whole basket', () => {
    it('leaves the first line untouched, writes no rows, and does not consume a number', async () => {
      const { shopId, userId } = await createShopWithUser();
      const inStock = await createStockedPart(shopId, userId, 10);
      const shortStock = await createStockedPart(shopId, userId, 2);

      const salesBefore = await prisma.stockTransaction.count({
        where: { shopId, type: StockTransactionType.SALE },
      });

      await expect(
        createInvoice({
          shopId,
          userId,
          lines: [
            { partId: inStock.id, quantity: 5, unitPrice: 100 },
            { partId: shortStock.id, quantity: 5, unitPrice: 100 }, // exceeds stock of 2
          ],
        }),
      ).rejects.toThrow(InsufficientStockError);

      // First line's stock is unchanged — the whole tx rolled back.
      expect(await quantityOnHand(shopId, inStock.id)).toBe(10);
      expect(await quantityOnHand(shopId, shortStock.id)).toBe(2);

      // No invoice / invoice_line rows exist for the shop.
      expect(await prisma.invoice.count({ where: { shopId } })).toBe(0);
      expect(await prisma.invoiceLine.count({ where: { invoice: { shopId } } })).toBe(0);

      // No new SALE stock_transaction rows.
      const salesAfter = await prisma.stockTransaction.count({
        where: { shopId, type: StockTransactionType.SALE },
      });
      expect(salesAfter).toBe(salesBefore);

      // The number was never allocated — no sequence row was consumed.
      const sequence = await prisma.invoiceSequence.findUnique({ where: { shopId } });
      expect(sequence).toBeNull();
    });

    it('rejects a part that has never been stocked in this shop, and rolls back the whole basket', async () => {
      const { shopId, userId } = await createShopWithUser();
      const inStock = await createStockedPart(shopId, userId, 10);
      // Exists in the catalog, but appendStockTransaction was never called for
      // it in this shop, so it has no inventory_item row at all yet.
      const neverStocked = await createPart();

      await expect(
        createInvoice({
          shopId,
          userId,
          lines: [
            { partId: inStock.id, quantity: 1, unitPrice: 100 },
            { partId: neverStocked.id, quantity: 1, unitPrice: 100 },
          ],
        }),
      ).rejects.toThrow(InsufficientStockError);

      // First line's stock is unchanged — the whole tx rolled back.
      expect(await quantityOnHand(shopId, inStock.id)).toBe(10);

      // The never-stocked part still has no inventory row: the guarded
      // upsert-then-update inside the failed transaction never committed.
      const neverStockedItem = await prisma.inventoryItem.findUnique({
        where: { shopId_partId: { shopId, partId: neverStocked.id } },
      });
      expect(neverStockedItem).toBeNull();

      // No invoice / invoice_line / stock_transaction rows exist for the shop.
      expect(await prisma.invoice.count({ where: { shopId } })).toBe(0);
      expect(await prisma.invoiceLine.count({ where: { invoice: { shopId } } })).toBe(0);
      expect(await prisma.stockTransaction.count({ where: { shopId, partId: neverStocked.id } })).toBe(0);

      // The number was never allocated — no sequence row was consumed.
      const sequence = await prisma.invoiceSequence.findUnique({ where: { shopId } });
      expect(sequence).toBeNull();
    });
  });

  describe('createInvoice — concurrency', () => {
    it('assigns distinct sequential numbers to concurrent checkouts on the same shop', async () => {
      const { shopId, userId } = await createShopWithUser();
      const partA = await createStockedPart(shopId, userId, 10);
      const partB = await createStockedPart(shopId, userId, 10);

      const outcomes = await Promise.allSettled([
        createInvoice({ shopId, userId, lines: [{ partId: partA.id, quantity: 1, unitPrice: 100 }] }),
        createInvoice({ shopId, userId, lines: [{ partId: partB.id, quantity: 1, unitPrice: 100 }] }),
      ]);

      expect(outcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(true);
      const numbers = outcomes
        .filter((o): o is PromiseFulfilledResult<Awaited<ReturnType<typeof createInvoice>>> => o.status === 'fulfilled')
        .map((o) => o.value.invoiceNumber)
        .sort();
      expect(numbers).toEqual(['INV-000001', 'INV-000002']);

      const sequence = await prisma.invoiceSequence.findUniqueOrThrow({ where: { shopId } });
      expect(sequence.lastSeq).toBe(2);
    });

    it('lets exactly one of two checkouts win the last unit, without consuming a number for the loser', async () => {
      const { shopId, userId } = await createShopWithUser();
      const contested = await createStockedPart(shopId, userId, 1);

      const buyLastUnit = () =>
        createInvoice({ shopId, userId, lines: [{ partId: contested.id, quantity: 1, unitPrice: 100 }] });

      const outcomes = await Promise.allSettled([buyLastUnit(), buyLastUnit()]);

      const fulfilled = outcomes.filter(
        (o): o is PromiseFulfilledResult<Awaited<ReturnType<typeof createInvoice>>> => o.status === 'fulfilled',
      );
      const rejected = outcomes.filter(
        (o): o is PromiseRejectedResult => o.status === 'rejected',
      );
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(InsufficientStockError);

      // The winner took the first (and only) number; the loser consumed nothing.
      expect(fulfilled[0].value.invoiceNumber).toBe('INV-000001');
      expect(await quantityOnHand(shopId, contested.id)).toBe(0);
      const sequence = await prisma.invoiceSequence.findUniqueOrThrow({ where: { shopId } });
      expect(sequence.lastSeq).toBe(1);
    });

    it('never deadlocks when concurrent checkouts list the same parts in opposite order', async () => {
      const { shopId, userId } = await createShopWithUser();
      const partA = await createStockedPart(shopId, userId, 20);
      const partB = await createStockedPart(shopId, userId, 20);

      const rounds = 5;
      const allOutcomes: PromiseSettledResult<unknown>[] = [];
      for (let round = 0; round < rounds; round += 1) {
        const outcomes = await Promise.allSettled([
          // Ascending input order.
          createInvoice({
            shopId,
            userId,
            lines: [
              { partId: partA.id, quantity: 1, unitPrice: 10 },
              { partId: partB.id, quantity: 1, unitPrice: 10 },
            ],
          }),
          // Opposite (descending) input order — would deadlock without the partId sort.
          createInvoice({
            shopId,
            userId,
            lines: [
              { partId: partB.id, quantity: 1, unitPrice: 10 },
              { partId: partA.id, quantity: 1, unitPrice: 10 },
            ],
          }),
        ]);
        allOutcomes.push(...outcomes);
      }

      // Every checkout resolved — no 40P01 deadlock surfaced as a 500.
      expect(allOutcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(true);
      expect(await quantityOnHand(shopId, partA.id)).toBe(20 - rounds * 2);
      expect(await quantityOnHand(shopId, partB.id)).toBe(20 - rounds * 2);
    });
  });

  describe('createInvoice — validation', () => {
    it('rejects an empty line list', async () => {
      const { shopId, userId } = await createShopWithUser();
      await expect(createInvoice({ shopId, userId, lines: [] })).rejects.toThrow(DomainValidationError);
    });

    it('rejects a zero quantity', async () => {
      const { shopId, userId } = await createShopWithUser();
      const part = await createStockedPart(shopId, userId, 5);
      await expect(
        createInvoice({ shopId, userId, lines: [{ partId: part.id, quantity: 0, unitPrice: 10 }] }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('rejects a negative quantity', async () => {
      const { shopId, userId } = await createShopWithUser();
      const part = await createStockedPart(shopId, userId, 5);
      await expect(
        createInvoice({ shopId, userId, lines: [{ partId: part.id, quantity: -1, unitPrice: 10 }] }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('rejects a negative unit price', async () => {
      const { shopId, userId } = await createShopWithUser();
      const part = await createStockedPart(shopId, userId, 5);
      await expect(
        createInvoice({ shopId, userId, lines: [{ partId: part.id, quantity: 1, unitPrice: -1 }] }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('rejects duplicate part ids across lines', async () => {
      const { shopId, userId } = await createShopWithUser();
      const part = await createStockedPart(shopId, userId, 10);
      await expect(
        createInvoice({
          shopId,
          userId,
          lines: [
            { partId: part.id, quantity: 1, unitPrice: 10 },
            { partId: part.id, quantity: 2, unitPrice: 10 },
          ],
        }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('rejects an unknown part id with NotFoundError', async () => {
      const { shopId, userId } = await createShopWithUser();
      await expect(
        createInvoice({ shopId, userId, lines: [{ partId: -1, quantity: 1, unitPrice: 10 }] }),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects a user that does not belong to the shop', async () => {
      const main = await createShopWithUser();
      const other = await createShopWithUser();
      const part = await createStockedPart(main.shopId, main.userId, 5);
      await expect(
        createInvoice({
          shopId: main.shopId,
          userId: other.userId,
          lines: [{ partId: part.id, quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('rejects an unknown shop with NotFoundError', async () => {
      const { userId } = await createShopWithUser();
      await expect(
        createInvoice({ shopId: -1, userId, lines: [{ partId: 1, quantity: 1, unitPrice: 10 }] }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
