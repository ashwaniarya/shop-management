import { NotFoundError } from '../services/errors';
import { prisma } from './prisma';

export async function requireShop(id: number) {
  const shop = await prisma.shop.findUnique({ where: { id } });
  if (!shop) {
    throw new NotFoundError(`Shop ${id} not found`);
  }
  return shop;
}

export async function requirePart(id: number) {
  const part = await prisma.part.findUnique({ where: { id } });
  if (!part) {
    throw new NotFoundError(`Part ${id} not found`);
  }
  return part;
}

export async function requireManufacturer(id: number) {
  const manufacturer = await prisma.manufacturer.findUnique({ where: { id } });
  if (!manufacturer) {
    throw new NotFoundError(`Manufacturer ${id} not found`);
  }
  return manufacturer;
}

export async function requireCategory(id: number) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new NotFoundError(`Category ${id} not found`);
  }
  return category;
}

export async function requireVehicleClass(id: number) {
  const vehicleClass = await prisma.vehicleClass.findUnique({ where: { id } });
  if (!vehicleClass) {
    throw new NotFoundError(`Vehicle class ${id} not found`);
  }
  return vehicleClass;
}

export async function requireVehicleMake(id: number) {
  const vehicleMake = await prisma.vehicleMake.findUnique({ where: { id } });
  if (!vehicleMake) {
    throw new NotFoundError(`Vehicle make ${id} not found`);
  }
  return vehicleMake;
}

export async function requireParentCategory(parentCategoryId: number | null | undefined) {
  if (parentCategoryId === undefined || parentCategoryId === null) {
    return null;
  }
  return requireCategory(parentCategoryId);
}
