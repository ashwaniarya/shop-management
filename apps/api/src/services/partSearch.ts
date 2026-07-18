import type { Prisma } from '@prisma/client';

import { normalizeNumber } from '../lib/normalize';
import { prisma } from '../lib/prisma';
import { DomainValidationError } from './errors';

export type PartNumberMatchSource = 'SKU' | 'MPN' | 'CROSS_REFERENCE' | 'SUPPLIER_NUMBER';

type PartWithCatalogRelations = Prisma.PartGetPayload<{
  include: { manufacturer: true; category: true };
}>;

export interface PartNumberSearchResult {
  part: PartWithCatalogRelations;
  matchedBy: PartNumberMatchSource;
  matchedNumber: string;
}

const partWithCatalogRelationsInclude = { manufacturer: true, category: true } as const;

export async function searchPartsByNumber(rawNumber: string): Promise<PartNumberSearchResult[]> {
  const normalized = normalizeNumber(rawNumber);
  if (normalized === '') {
    throw new DomainValidationError('Search number must contain at least one alphanumeric character');
  }

  const matchedPartIds = new Set<number>();
  const results: PartNumberSearchResult[] = [];

  const skuMatches = await prisma.part.findMany({
    where: { skuNormalized: normalized },
    include: partWithCatalogRelationsInclude,
  });
  for (const part of skuMatches) {
    matchedPartIds.add(part.id);
    results.push({ part, matchedBy: 'SKU', matchedNumber: part.sku });
  }

  const mpnMatches = await prisma.part.findMany({
    where: { mpnNormalized: normalized, id: { notIn: [...matchedPartIds] } },
    include: partWithCatalogRelationsInclude,
  });
  for (const part of mpnMatches) {
    matchedPartIds.add(part.id);
    results.push({ part, matchedBy: 'MPN', matchedNumber: part.manufacturerPartNumber });
  }

  const crossReferenceMatches = await prisma.partCrossReference.findMany({
    where: { refNumberNormalized: normalized, partId: { notIn: [...matchedPartIds] } },
    include: { part: { include: partWithCatalogRelationsInclude } },
  });
  for (const crossReference of crossReferenceMatches) {
    if (matchedPartIds.has(crossReference.partId)) {
      continue;
    }
    matchedPartIds.add(crossReference.partId);
    results.push({
      part: crossReference.part,
      matchedBy: 'CROSS_REFERENCE',
      matchedNumber: crossReference.refNumber,
    });
  }

  const supplierPartMatches = await prisma.supplierPart.findMany({
    where: { supplierPartNumberNormalized: normalized, partId: { notIn: [...matchedPartIds] } },
    include: { part: { include: partWithCatalogRelationsInclude } },
  });
  for (const supplierPart of supplierPartMatches) {
    if (matchedPartIds.has(supplierPart.partId)) {
      continue;
    }
    matchedPartIds.add(supplierPart.partId);
    results.push({
      part: supplierPart.part,
      matchedBy: 'SUPPLIER_NUMBER',
      matchedNumber: supplierPart.supplierPartNumber ?? '',
    });
  }

  return results;
}
