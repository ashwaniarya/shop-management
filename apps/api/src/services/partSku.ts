import { randomInt } from 'node:crypto';

import { Prisma, type Part } from '@prisma/client';

import { normalizeNumber } from '../lib/normalize';
import { prisma } from '../lib/prisma';
import { ConflictError } from './errors';

// Unambiguous alphabet: no 0/1/I/L/O, so a SKU read off a shelf, dictated over the phone,
// or re-typed can't be misread. 31 symbols ^ 6 places ≈ 887M codes.
export const SKU_SUFFIX_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const SKU_SUFFIX_LENGTH = 6;
const DEFAULT_SKU_PREFIX = 'PRT';
const MAX_SKU_ATTEMPTS = 8;

// `pick` is injectable so tests can force a specific (and colliding) suffix; production
// uses crypto.randomInt for an unbiased draw.
export function randomSkuSuffix(pick: (max: number) => number = randomInt): string {
  let suffix = '';
  for (let index = 0; index < SKU_SUFFIX_LENGTH; index += 1) {
    suffix += SKU_SUFFIX_ALPHABET[pick(SKU_SUFFIX_ALPHABET.length)];
  }
  return suffix;
}

// A short, readable prefix so an auto SKU still hints at its maker; falls back to a
// generic tag when the manufacturer has no code.
export async function resolveSkuPrefix(manufacturerId: number): Promise<string> {
  const manufacturer = await prisma.manufacturer.findUnique({
    where: { id: manufacturerId },
    select: { code: true },
  });
  const code = manufacturer?.code ? normalizeNumber(manufacturer.code).slice(0, 4) : '';
  return code || DEFAULT_SKU_PREFIX;
}

function isSkuUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  // meta.target names the offending column(s). Retry only on the sku index — a
  // manufacturer + part-number clash is a real conflict and must surface as its own 409.
  const target = error.meta?.target;
  const columns = Array.isArray(target) ? target.join(',') : String(target ?? '');
  return columns.toLowerCase().includes('sku');
}

// Creates a part with a server-generated SKU. Auto SKUs are globally unique, so on the
// astronomically rare collision we regenerate rather than fail the request. A
// manufacturer + part-number conflict is NOT a sku collision and propagates unchanged.
export async function createPartWithGeneratedSku(
  data: Omit<Prisma.PartUncheckedCreateInput, 'sku' | 'skuNormalized'>,
  options: { nextSuffix?: () => string } = {},
): Promise<Part> {
  const nextSuffix = options.nextSuffix ?? (() => randomSkuSuffix());
  const prefix = await resolveSkuPrefix(data.manufacturerId);

  for (let attempt = 0; attempt < MAX_SKU_ATTEMPTS; attempt += 1) {
    const sku = `${prefix}-${nextSuffix()}`;
    try {
      return await prisma.part.create({
        data: { ...data, sku, skuNormalized: normalizeNumber(sku) },
      });
    } catch (error) {
      if (isSkuUniqueViolation(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new ConflictError('Could not generate a unique SKU, please try again');
}
