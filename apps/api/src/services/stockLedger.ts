import { Prisma, StockTransactionType, type InventoryItem, type StockTransaction } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { DomainValidationError, InsufficientStockError, NotFoundError } from './errors';

export interface AppendStockTransactionInput {
  shopId: number;
  partId: number;
  userId: number;
  type: StockTransactionType;
  quantity: number;
  unitPrice?: number;
  notes?: string;
}

export interface AppendStockTransactionResult {
  transaction: StockTransaction;
  inventoryItem: InventoryItem;
}

export async function appendStockTransaction(
  input: AppendStockTransactionInput,
): Promise<AppendStockTransactionResult> {
  const { shopId, partId, userId, type, quantity, unitPrice, notes } = input;

  if (type === StockTransactionType.SALE || type === StockTransactionType.PURCHASE) {
    if (quantity <= 0) {
      throw new DomainValidationError(`quantity must be positive for ${type}, received ${quantity}`);
    }
    if (unitPrice === undefined) {
      throw new DomainValidationError(`unitPrice is required for ${type}`);
    }
  } else if (quantity === 0) {
    throw new DomainValidationError('quantity must be non-zero for ADJUSTMENT');
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) {
    throw new NotFoundError(`Shop ${shopId} not found`);
  }

  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!part) {
    throw new NotFoundError(`Part ${partId} not found`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError(`User ${userId} not found`);
  }
  if (user.shopId !== shopId) {
    throw new DomainValidationError(`User ${userId} does not belong to shop ${shopId}`);
  }

  const signedQuantity =
    type === StockTransactionType.SALE ? new Prisma.Decimal(quantity).negated() : new Prisma.Decimal(quantity);

  return prisma.$transaction((tx) =>
    applyStockDelta(tx, { shopId, partId, userId, type, signedQuantity, unitPrice, notes }),
  );
}

export interface ApplyStockDeltaInput {
  shopId: number;
  partId: number;
  userId: number;
  type: StockTransactionType;
  signedQuantity: Prisma.Decimal;
  unitPrice?: Prisma.Decimal | number | null;
  notes?: string | null;
}

// Tx-scoped core of a ledger append: seeds the inventory row, applies the
// guarded delta, and records the SALE/PURCHASE/ADJUSTMENT row — all against the
// caller's `tx` so it composes into a larger atomic unit (e.g. invoice checkout,
// where an oversell on any line must roll back the whole basket). The caller
// owns the sign (SALE passes a negated quantity) and all pre-tx validation.
export async function applyStockDelta(
  tx: Prisma.TransactionClient,
  input: ApplyStockDeltaInput,
): Promise<AppendStockTransactionResult> {
  const { shopId, partId, userId, type, signedQuantity, unitPrice, notes } = input;

  // Seed the row so the guarded update always has a target, and so the
  // unique (shopId, partId) index — not a lost INSERT — arbitrates a
  // concurrent first-ever transaction for this part.
  await tx.inventoryItem.upsert({
    where: { shopId_partId: { shopId, partId } },
    create: { shopId, partId, quantityOnHand: 0 },
    update: {},
  });

  // Atomic guard + mutation: under READ COMMITTED the WHERE re-evaluates
  // against the latest committed quantity, so a concurrent sale cannot
  // pass the non-negative check on a stale read.
  const applied = await tx.inventoryItem.updateMany({
    where: { shopId, partId, quantityOnHand: { gte: signedQuantity.negated() } },
    data: { quantityOnHand: { increment: signedQuantity } },
  });

  const inventoryItem = await tx.inventoryItem.findUniqueOrThrow({
    where: { shopId_partId: { shopId, partId } },
  });

  if (applied.count === 0) {
    throw new InsufficientStockError(
      inventoryItem.quantityOnHand.toNumber(),
      signedQuantity.abs().toNumber(),
    );
  }

  const transaction = await tx.stockTransaction.create({
    data: {
      shopId,
      partId,
      userId,
      type,
      quantity: signedQuantity,
      unitPrice: unitPrice ?? null,
      notes: notes ?? null,
    },
  });

  return { transaction, inventoryItem };
}

export interface TransactionsSummaryRange {
  from?: Date;
  to?: Date;
}

export interface TransactionsSummary {
  sales: { count: number; quantity: number; revenue: number };
  purchases: { count: number; quantity: number; cost: number };
  adjustments: { count: number; quantity: number };
}

export async function getTransactionsSummary(
  shopId: number,
  range: TransactionsSummaryRange = {},
): Promise<TransactionsSummary> {
  const { from, to } = range;
  const createdAtFilter: Prisma.StockTransactionWhereInput =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  const grouped = await prisma.stockTransaction.groupBy({
    by: ['type'],
    where: { shopId, ...createdAtFilter },
    _count: { _all: true },
    _sum: { quantity: true },
  });

  const aggregateByType = new Map(
    grouped.map((row) => [
      row.type,
      { count: row._count._all, quantity: row._sum.quantity ?? new Prisma.Decimal(0) },
    ]),
  );

  const saleRows = await prisma.stockTransaction.findMany({
    where: { shopId, type: StockTransactionType.SALE, ...createdAtFilter },
    select: { quantity: true, unitPrice: true },
  });
  const revenue = saleRows.reduce(
    (sum, row) => sum.plus(row.quantity.abs().times(row.unitPrice ?? new Prisma.Decimal(0))),
    new Prisma.Decimal(0),
  );

  const purchaseRows = await prisma.stockTransaction.findMany({
    where: { shopId, type: StockTransactionType.PURCHASE, ...createdAtFilter },
    select: { quantity: true, unitPrice: true },
  });
  const cost = purchaseRows.reduce(
    (sum, row) => sum.plus(row.quantity.abs().times(row.unitPrice ?? new Prisma.Decimal(0))),
    new Prisma.Decimal(0),
  );

  const salesAggregate = aggregateByType.get(StockTransactionType.SALE);
  const purchasesAggregate = aggregateByType.get(StockTransactionType.PURCHASE);
  const adjustmentsAggregate = aggregateByType.get(StockTransactionType.ADJUSTMENT);

  return {
    sales: {
      count: salesAggregate?.count ?? 0,
      quantity: (salesAggregate?.quantity ?? new Prisma.Decimal(0)).abs().toNumber(),
      revenue: revenue.toNumber(),
    },
    purchases: {
      count: purchasesAggregate?.count ?? 0,
      quantity: (purchasesAggregate?.quantity ?? new Prisma.Decimal(0)).abs().toNumber(),
      cost: cost.toNumber(),
    },
    adjustments: {
      count: adjustmentsAggregate?.count ?? 0,
      quantity: (adjustmentsAggregate?.quantity ?? new Prisma.Decimal(0)).abs().toNumber(),
    },
  };
}
