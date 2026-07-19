import type {
  InventoryItem,
  Part,
  PartCrossReference,
  PartFitment,
  StockTransaction,
  SupplierPart,
  User,
} from '@prisma/client';

interface DecimalLike {
  toNumber(): number;
}

function toNumberOrNull(value: DecimalLike | null): number | null {
  return value === null ? null : value.toNumber();
}

// Explicit field lists rather than a `{...part}` spread: the inputs here often carry
// extra relations attached by an `include` (manufacturer, category, fitments, ...),
// and this is the DTO boundary that must emit exactly the contract's shape.
export function serializePart(part: Part) {
  return {
    id: part.id,
    sku: part.sku,
    manufacturerId: part.manufacturerId,
    manufacturerPartNumber: part.manufacturerPartNumber,
    name: part.name,
    categoryId: part.categoryId,
    description: part.description,
    unitOfMeasure: part.unitOfMeasure,
    mrp: toNumberOrNull(part.mrp),
    gradeId: part.gradeId,
    copyOfPartId: part.copyOfPartId,
    isActive: part.isActive,
    createdAt: part.createdAt,
    updatedAt: part.updatedAt,
  };
}

export function serializeInventoryItem(item: InventoryItem) {
  return {
    id: item.id,
    shopId: item.shopId,
    partId: item.partId,
    quantityOnHand: item.quantityOnHand.toNumber(),
    reorderLevel: toNumberOrNull(item.reorderLevel),
    costPrice: toNumberOrNull(item.costPrice),
    sellingPrice: toNumberOrNull(item.sellingPrice),
    storageLocation: item.storageLocation,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function serializeStockTransaction(transaction: StockTransaction) {
  return {
    id: transaction.id,
    shopId: transaction.shopId,
    partId: transaction.partId,
    userId: transaction.userId,
    type: transaction.type,
    quantity: transaction.quantity.toNumber(),
    unitPrice: toNumberOrNull(transaction.unitPrice),
    notes: transaction.notes,
    createdAt: transaction.createdAt,
  };
}

// Excludes passwordHash on purpose — this is the DTO boundary the login-round-trip
// crosses, and the hash must never leave the API.
export function serializeUser(user: User) {
  return {
    id: user.id,
    shopId: user.shopId,
    name: user.name,
    phone: user.phone,
    email: user.email,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function serializePartFitment(fitment: PartFitment) {
  return {
    id: fitment.id,
    partId: fitment.partId,
    vehicleClassId: fitment.vehicleClassId,
    vehicleMakeId: fitment.vehicleMakeId,
    vehicleModelId: fitment.vehicleModelId,
    notes: fitment.notes,
  };
}

export function serializePartCrossReference(crossReference: PartCrossReference) {
  return {
    id: crossReference.id,
    partId: crossReference.partId,
    refType: crossReference.refType,
    refNumber: crossReference.refNumber,
    refBrand: crossReference.refBrand,
    notes: crossReference.notes,
    createdAt: crossReference.createdAt,
  };
}

export function serializeSupplierPart(supplierPart: SupplierPart) {
  return {
    id: supplierPart.id,
    partId: supplierPart.partId,
    supplierId: supplierPart.supplierId,
    supplierPartNumber: supplierPart.supplierPartNumber,
    isPreferred: supplierPart.isPreferred,
    createdAt: supplierPart.createdAt,
    updatedAt: supplierPart.updatedAt,
  };
}
