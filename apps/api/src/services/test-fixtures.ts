import type { Part, PrismaClient, User, UserRole } from '@prisma/client';

import { normalizeNumber } from '../lib/normalize';
import { prisma } from '../lib/prisma';
import { hashPin, signToken } from './auth';

export interface CatalogFixture {
  manufacturerId: number;
  categoryId: number;
}

export async function createCatalogFixture(client: PrismaClient, label: string): Promise<CatalogFixture> {
  const manufacturer = await client.manufacturer.create({ data: { name: `${label} Manufacturer` } });
  const category = await client.category.create({ data: { name: `${label} Category` } });
  return { manufacturerId: manufacturer.id, categoryId: category.id };
}

export interface PartFixtureInput extends CatalogFixture {
  sku: string;
  manufacturerPartNumber: string;
  name?: string;
  gradeId?: number;
  copyOfPartId?: number;
}

export async function createPartFixture(client: PrismaClient, input: PartFixtureInput): Promise<Part> {
  return client.part.create({
    data: {
      sku: input.sku,
      skuNormalized: normalizeNumber(input.sku),
      manufacturerId: input.manufacturerId,
      manufacturerPartNumber: input.manufacturerPartNumber,
      mpnNormalized: normalizeNumber(input.manufacturerPartNumber),
      name: input.name ?? input.sku,
      categoryId: input.categoryId,
      gradeId: input.gradeId,
      copyOfPartId: input.copyOfPartId,
    },
  });
}

export interface UserWithCredentialsInput {
  shopId: number;
  role: UserRole;
  username: string;
  pin: string;
  name?: string;
}

export async function createUserWithCredentials(input: UserWithCredentialsInput): Promise<User> {
  const passwordHash = await hashPin(input.pin);
  return prisma.user.create({
    data: {
      shopId: input.shopId,
      role: input.role,
      name: input.name ?? input.username,
      username: input.username,
      passwordHash,
    },
  });
}

export function tokenFor(user: { id: number; shopId: number; role: UserRole }): string {
  return signToken(user);
}
