import type { Part, PrismaClient } from '@prisma/client';

import { normalizeNumber } from '../lib/normalize';

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
    },
  });
}
