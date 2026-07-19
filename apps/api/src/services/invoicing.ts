import { formatInvoiceNumber } from '@shop/shared';
import { Prisma, StockTransactionType } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { DomainValidationError, NotFoundError } from './errors';
import { applyStockDelta } from './stockLedger';

export interface CreateInvoiceLineInput {
  partId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceInput {
  shopId: number;
  userId: number;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  lines: CreateInvoiceLineInput[];
}

export type InvoiceWithLines = Prisma.InvoiceGetPayload<{ include: { lines: true } }>;

interface InvoiceLineRow {
  partId: number;
  stockTransactionId: number;
  partSku: string;
  partName: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceWithLines> {
  const { shopId, userId, customerName, customerPhone, notes, lines } = input;

  // --- Pre-transaction validation: cheap, fail fast before opening a tx ---
  if (lines.length === 0) {
    throw new DomainValidationError('an invoice needs at least one line');
  }

  const seenPartIds = new Set<number>();
  for (const line of lines) {
    if (seenPartIds.has(line.partId)) {
      throw new DomainValidationError(
        `Part ${line.partId} appears on more than one line; merge duplicate part into one line`,
      );
    }
    seenPartIds.add(line.partId);

    if (line.quantity <= 0) {
      throw new DomainValidationError(
        `quantity must be positive, received ${line.quantity} for part ${line.partId}`,
      );
    }
    if (line.unitPrice < 0) {
      throw new DomainValidationError(
        `unitPrice must be non-negative, received ${line.unitPrice} for part ${line.partId}`,
      );
    }
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) {
    throw new NotFoundError(`Shop ${shopId} not found`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError(`User ${userId} not found`);
  }
  if (user.shopId !== shopId) {
    throw new DomainValidationError(`User ${userId} does not belong to shop ${shopId}`);
  }

  const partIds = lines.map((line) => line.partId);
  const parts = await prisma.part.findMany({
    where: { id: { in: partIds } },
    select: { id: true, sku: true, name: true },
  });
  const partById = new Map(parts.map((part) => [part.id, part]));
  const missingPartIds = partIds.filter((partId) => !partById.has(partId));
  if (missingPartIds.length > 0) {
    throw new NotFoundError(`Part(s) not found: ${missingPartIds.join(', ')}`);
  }

  // Take every inventory row lock in one global order (partId ascending) so two
  // concurrent checkouts touching the same parts acquire them in the same order
  // and can never deadlock (40P01 — which the error handler does not map, so it
  // would surface as a 500).
  const sortedLines = [...lines].sort((a, b) => a.partId - b.partId);

  return prisma.$transaction(async (tx) => {
    let total = new Prisma.Decimal(0);
    const lineRows: InvoiceLineRow[] = [];

    for (const line of sortedLines) {
      const snapshot = partById.get(line.partId);
      if (!snapshot) {
        throw new NotFoundError(`Part ${line.partId} not found`);
      }

      const quantity = new Prisma.Decimal(line.quantity);
      const unitPrice = new Prisma.Decimal(line.unitPrice);
      // Round each line to paise BEFORE summing, so the printed line totals
      // reconcile exactly to the grand total.
      const lineTotal = quantity.times(unitPrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      total = total.plus(lineTotal);

      // A negated SALE delta; an oversell on ANY line throws
      // InsufficientStockError, rolling back the ENTIRE checkout.
      const { transaction } = await applyStockDelta(tx, {
        shopId,
        partId: line.partId,
        userId,
        type: StockTransactionType.SALE,
        signedQuantity: quantity.negated(),
        unitPrice,
        notes: null,
      });

      lineRows.push({
        partId: line.partId,
        stockTransactionId: transaction.id,
        partSku: snapshot.sku,
        partName: snapshot.name,
        quantity,
        unitPrice,
        lineTotal,
      });
    }

    // Allocate the invoice number LAST: a rolled-back oversell never reaches
    // here, so a failed checkout never consumes a number — per-shop numbering
    // stays gapless.
    const sequence = await tx.invoiceSequence.upsert({
      where: { shopId },
      create: { shopId, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    const invoiceNumber = formatInvoiceNumber(sequence.lastSeq);

    return tx.invoice.create({
      data: {
        shopId,
        userId,
        invoiceNumber,
        customerName: customerName ?? null,
        customerPhone: customerPhone ?? null,
        notes: notes ?? null,
        total,
        lines: { createMany: { data: lineRows } },
      },
      include: { lines: { orderBy: { id: 'asc' } } },
    });
  });
}
