// Behavioural test: exercises the append-only stock ledger and its aggregation against the real DB
import { Prisma, StockTransactionType, UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../lib/prisma';
import { DomainValidationError, InsufficientStockError, NotFoundError } from './errors';
import { appendStockTransaction, getTransactionsSummary } from './stockLedger';
import { createCatalogFixture, createPartFixture } from './test-fixtures';

describe('stockLedger', () => {
  const ts = Date.now();
  let partCounter = 0;

  let manufacturerId: number;
  let categoryId: number;
  let shopAId: number;
  let shopBId: number;
  let userAId: number;
  let userBId: number;

  const partIds: number[] = [];
  const shopIds: number[] = [];
  const userIds: number[] = [];

  async function createTestPart(): Promise<number> {
    partCounter += 1;
    const part = await createPartFixture(prisma, {
      sku: `SL-SKU-${ts}-${partCounter}`,
      manufacturerPartNumber: `SL-MPN-${ts}-${partCounter}`,
      name: `StockLedger Test Part ${ts}-${partCounter}`,
      manufacturerId,
      categoryId,
    });
    partIds.push(part.id);
    return part.id;
  }

  beforeAll(async () => {
    const catalog = await createCatalogFixture(prisma, `StockLedger Test ${ts}`);
    manufacturerId = catalog.manufacturerId;
    categoryId = catalog.categoryId;

    const shopA = await prisma.shop.create({ data: { name: `StockLedger Test Shop A ${ts}` } });
    shopAId = shopA.id;
    shopIds.push(shopAId);

    const shopB = await prisma.shop.create({ data: { name: `StockLedger Test Shop B ${ts}` } });
    shopBId = shopB.id;
    shopIds.push(shopBId);

    const userA = await prisma.user.create({
      data: { shopId: shopAId, name: `StockLedger Test User A ${ts}`, role: UserRole.OWNER },
    });
    userAId = userA.id;
    userIds.push(userAId);

    const userB = await prisma.user.create({
      data: { shopId: shopBId, name: `StockLedger Test User B ${ts}`, role: UserRole.OWNER },
    });
    userBId = userB.id;
    userIds.push(userBId);
  });

  afterAll(async () => {
    await prisma.stockTransaction.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.inventoryItem.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.part.deleteMany({ where: { id: { in: partIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
    await prisma.manufacturer.delete({ where: { id: manufacturerId } });
    await prisma.category.delete({ where: { id: categoryId } });
  });

  describe('appendStockTransaction', () => {
    it('creates an inventory item at the purchased quantity when none exists yet', async () => {
      const partId = await createTestPart();

      const result = await appendStockTransaction({
        shopId: shopAId,
        partId,
        userId: userAId,
        type: StockTransactionType.PURCHASE,
        quantity: 10,
        unitPrice: 100,
      });

      expect(result.transaction.type).toBe(StockTransactionType.PURCHASE);
      expect(result.transaction.quantity.toNumber()).toBe(10);
      expect(result.inventoryItem.quantityOnHand.toNumber()).toBe(10);
    });

    it('decrements inventory on a sale', async () => {
      const partId = await createTestPart();
      await appendStockTransaction({
        shopId: shopAId,
        partId,
        userId: userAId,
        type: StockTransactionType.PURCHASE,
        quantity: 10,
        unitPrice: 100,
      });

      const result = await appendStockTransaction({
        shopId: shopAId,
        partId,
        userId: userAId,
        type: StockTransactionType.SALE,
        quantity: 4,
        unitPrice: 150,
      });

      expect(result.transaction.quantity.toNumber()).toBe(-4);
      expect(result.inventoryItem.quantityOnHand.toNumber()).toBe(6);
    });

    it('applies an adjustment signed both upward and downward', async () => {
      const partId = await createTestPart();

      const up = await appendStockTransaction({
        shopId: shopAId,
        partId,
        userId: userAId,
        type: StockTransactionType.ADJUSTMENT,
        quantity: 5,
      });
      expect(up.transaction.quantity.toNumber()).toBe(5);
      expect(up.transaction.unitPrice).toBeNull();
      expect(up.inventoryItem.quantityOnHand.toNumber()).toBe(5);

      const down = await appendStockTransaction({
        shopId: shopAId,
        partId,
        userId: userAId,
        type: StockTransactionType.ADJUSTMENT,
        quantity: -3,
      });
      expect(down.transaction.quantity.toNumber()).toBe(-3);
      expect(down.inventoryItem.quantityOnHand.toNumber()).toBe(2);
    });

    it('throws InsufficientStockError on a sale below zero and rolls back completely', async () => {
      const partId = await createTestPart();
      await appendStockTransaction({
        shopId: shopAId,
        partId,
        userId: userAId,
        type: StockTransactionType.PURCHASE,
        quantity: 5,
        unitPrice: 100,
      });

      const transactionCountBefore = await prisma.stockTransaction.count({ where: { shopId: shopAId, partId } });

      await expect(
        appendStockTransaction({
          shopId: shopAId,
          partId,
          userId: userAId,
          type: StockTransactionType.SALE,
          quantity: 10,
          unitPrice: 50,
        }),
      ).rejects.toThrow(InsufficientStockError);

      const transactionCountAfter = await prisma.stockTransaction.count({ where: { shopId: shopAId, partId } });
      const inventoryItem = await prisma.inventoryItem.findUniqueOrThrow({
        where: { shopId_partId: { shopId: shopAId, partId } },
      });

      expect(transactionCountAfter).toBe(transactionCountBefore);
      expect(inventoryItem.quantityOnHand.toNumber()).toBe(5);
    });

    it('allows exactly one of two concurrent sales competing for the remaining stock', async () => {
      const partId = await createTestPart();
      await appendStockTransaction({
        shopId: shopAId,
        partId,
        userId: userAId,
        type: StockTransactionType.PURCHASE,
        quantity: 5,
        unitPrice: 100,
      });

      const sellAllFive = () =>
        appendStockTransaction({
          shopId: shopAId,
          partId,
          userId: userAId,
          type: StockTransactionType.SALE,
          quantity: 5,
          unitPrice: 150,
        });

      const outcomes = await Promise.allSettled([sellAllFive(), sellAllFive()]);

      const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled');
      const rejected = outcomes.filter(
        (outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected',
      );
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(InsufficientStockError);

      const inventoryItem = await prisma.inventoryItem.findUniqueOrThrow({
        where: { shopId_partId: { shopId: shopAId, partId } },
      });
      const transactions = await prisma.stockTransaction.findMany({
        where: { shopId: shopAId, partId },
        select: { quantity: true },
      });
      const ledgerSum = transactions.reduce((sum, row) => sum.plus(row.quantity), new Prisma.Decimal(0));

      expect(inventoryItem.quantityOnHand.toNumber()).toBe(0);
      expect(inventoryItem.quantityOnHand.equals(ledgerSum)).toBe(true);
    });

    it('rolls back the freshly-created inventory item when a sale on a brand-new part goes negative', async () => {
      const partId = await createTestPart();

      await expect(
        appendStockTransaction({
          shopId: shopAId,
          partId,
          userId: userAId,
          type: StockTransactionType.SALE,
          quantity: 1,
          unitPrice: 10,
        }),
      ).rejects.toThrow(InsufficientStockError);

      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { shopId_partId: { shopId: shopAId, partId } },
      });
      const transactionCount = await prisma.stockTransaction.count({ where: { shopId: shopAId, partId } });

      expect(inventoryItem).toBeNull();
      expect(transactionCount).toBe(0);
    });

    it('throws DomainValidationError when unitPrice is missing on a purchase', async () => {
      const partId = await createTestPart();

      await expect(
        appendStockTransaction({
          shopId: shopAId,
          partId,
          userId: userAId,
          type: StockTransactionType.PURCHASE,
          quantity: 1,
        }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('throws DomainValidationError when unitPrice is missing on a sale', async () => {
      const partId = await createTestPart();

      await expect(
        appendStockTransaction({
          shopId: shopAId,
          partId,
          userId: userAId,
          type: StockTransactionType.SALE,
          quantity: 1,
        }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('throws DomainValidationError for a negative purchase quantity', async () => {
      const partId = await createTestPart();

      await expect(
        appendStockTransaction({
          shopId: shopAId,
          partId,
          userId: userAId,
          type: StockTransactionType.PURCHASE,
          quantity: -5,
          unitPrice: 10,
        }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('throws DomainValidationError for a negative sale quantity', async () => {
      const partId = await createTestPart();

      await expect(
        appendStockTransaction({
          shopId: shopAId,
          partId,
          userId: userAId,
          type: StockTransactionType.SALE,
          quantity: -5,
          unitPrice: 10,
        }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('throws DomainValidationError for a zero adjustment quantity', async () => {
      const partId = await createTestPart();

      await expect(
        appendStockTransaction({
          shopId: shopAId,
          partId,
          userId: userAId,
          type: StockTransactionType.ADJUSTMENT,
          quantity: 0,
        }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('throws DomainValidationError when the user belongs to a different shop', async () => {
      const partId = await createTestPart();

      await expect(
        appendStockTransaction({
          shopId: shopAId,
          partId,
          userId: userBId,
          type: StockTransactionType.PURCHASE,
          quantity: 1,
          unitPrice: 10,
        }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('throws NotFoundError when the shop does not exist', async () => {
      const partId = await createTestPart();

      await expect(
        appendStockTransaction({
          shopId: -1,
          partId,
          userId: userAId,
          type: StockTransactionType.PURCHASE,
          quantity: 1,
          unitPrice: 10,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when the part does not exist', async () => {
      await expect(
        appendStockTransaction({
          shopId: shopAId,
          partId: -1,
          userId: userAId,
          type: StockTransactionType.PURCHASE,
          quantity: 1,
          unitPrice: 10,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when the user does not exist', async () => {
      const partId = await createTestPart();

      await expect(
        appendStockTransaction({
          shopId: shopAId,
          partId,
          userId: -1,
          type: StockTransactionType.PURCHASE,
          quantity: 1,
          unitPrice: 10,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('ledger invariant and transaction summary', () => {
    let shopId: number;
    let userId: number;
    let partId: number;

    beforeAll(async () => {
      const shop = await prisma.shop.create({ data: { name: `StockLedger Summary Shop ${ts}` } });
      shopId = shop.id;
      shopIds.push(shopId);

      const user = await prisma.user.create({
        data: { shopId, name: `StockLedger Summary User ${ts}`, role: UserRole.OWNER },
      });
      userId = user.id;
      userIds.push(userId);

      partId = await createTestPart();

      await appendStockTransaction({
        shopId,
        partId,
        userId,
        type: StockTransactionType.PURCHASE,
        quantity: 20,
        unitPrice: 50,
      });
      await appendStockTransaction({
        shopId,
        partId,
        userId,
        type: StockTransactionType.PURCHASE,
        quantity: 10,
        unitPrice: 55,
      });
      await appendStockTransaction({
        shopId,
        partId,
        userId,
        type: StockTransactionType.SALE,
        quantity: 12,
        unitPrice: 80,
      });
      await appendStockTransaction({
        shopId,
        partId,
        userId,
        type: StockTransactionType.ADJUSTMENT,
        quantity: -3,
      });
      await appendStockTransaction({
        shopId,
        partId,
        userId,
        type: StockTransactionType.ADJUSTMENT,
        quantity: 2,
      });
    });

    it('keeps the inventory cache equal to the sum of the ledger after a sequence of mixed operations', async () => {
      const transactions = await prisma.stockTransaction.findMany({
        where: { shopId, partId },
        select: { quantity: true },
      });
      const ledgerSum = transactions.reduce((sum, row) => sum.plus(row.quantity), new Prisma.Decimal(0));

      const inventoryItem = await prisma.inventoryItem.findUniqueOrThrow({
        where: { shopId_partId: { shopId, partId } },
      });

      expect(inventoryItem.quantityOnHand.equals(ledgerSum)).toBe(true);
      expect(inventoryItem.quantityOnHand.toNumber()).toBe(17);
    });

    it('computes exact revenue, cost, and quantity totals over the known sequence', async () => {
      const summary = await getTransactionsSummary(shopId);

      expect(summary).toEqual({
        sales: { count: 1, quantity: 12, revenue: 960 },
        purchases: { count: 2, quantity: 30, cost: 1550 },
        adjustments: { count: 2, quantity: 1 },
      });
    });

    it('excludes transactions outside the given date range', async () => {
      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const summary = await getTransactionsSummary(shopId, { from: farFuture });

      expect(summary).toEqual({
        sales: { count: 0, quantity: 0, revenue: 0 },
        purchases: { count: 0, quantity: 0, cost: 0 },
        adjustments: { count: 0, quantity: 0 },
      });
    });
  });
});
