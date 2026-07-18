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

  return prisma.$transaction(async (tx) => {
    let inventoryItem = await tx.inventoryItem.findUnique({
      where: { shopId_partId: { shopId, partId } },
    });

    if (!inventoryItem) {
      inventoryItem = await tx.inventoryItem.create({
        data: { shopId, partId, quantityOnHand: 0 },
      });
    }

    const newQuantity = inventoryItem.quantityOnHand.plus(signedQuantity);

    if (newQuantity.lessThan(0)) {
      throw new InsufficientStockError(inventoryItem.quantityOnHand.toNumber(), signedQuantity.abs().toNumber());
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

    const updatedInventoryItem = await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: { quantityOnHand: newQuantity },
    });

    return { transaction, inventoryItem: updatedInventoryItem };
  });
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
    (sum, row) => sum.plus(row.quantity.times(row.unitPrice ?? new Prisma.Decimal(0))),
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
