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
