// Behavioural test: SKU auto-generation. randomSkuSuffix/prefix are pure; the retry path
// runs against the real DB so a genuine unique-index collision drives the regeneration.
import { afterAll, describe, expect, it } from 'vitest';

import { normalizeNumber } from '../lib/normalize';
import { prisma } from '../lib/prisma';
import {
  SKU_SUFFIX_ALPHABET,
  SKU_SUFFIX_LENGTH,
  createPartWithGeneratedSku,
  randomSkuSuffix,
  resolveSkuPrefix,
} from './partSku';

describe('randomSkuSuffix', () => {
  it('is the configured length and draws only from the unambiguous alphabet', () => {
    const suffix = randomSkuSuffix();
    expect(suffix).toHaveLength(SKU_SUFFIX_LENGTH);
    expect([...suffix].every((char) => SKU_SUFFIX_ALPHABET.includes(char))).toBe(true);
  });

  it('excludes the ambiguous 0/1/I/L/O characters', () => {
    expect(SKU_SUFFIX_ALPHABET).not.toMatch(/[01ILO]/);
  });

  it('maps the injected index into the alphabet', () => {
    expect(randomSkuSuffix(() => 0)).toBe(SKU_SUFFIX_ALPHABET[0].repeat(SKU_SUFFIX_LENGTH));
  });
});

describe('resolveSkuPrefix + createPartWithGeneratedSku', () => {
  const ts = Date.now();
  const createdPartIds: number[] = [];
  const createdManufacturerIds: number[] = [];
  let manufacturerSeq = 0;
  let categoryId: number;

  async function manufacturer(code: string | null): Promise<number> {
    // Manufacturer.name is globally unique, so each call needs its own name.
    manufacturerSeq += 1;
    const created = await prisma.manufacturer.create({
      data: { name: `SKU Mfr ${ts}-${manufacturerSeq}`, code },
    });
    createdManufacturerIds.push(created.id);
    return created.id;
  }

  async function ensureCategory(): Promise<number> {
    if (categoryId === undefined) {
      const category = await prisma.category.create({ data: { name: `SKU Category ${ts}` } });
      categoryId = category.id;
    }
    return categoryId;
  }

  function baseData(manufacturerId: number, mpn: string) {
    return {
      manufacturerId,
      manufacturerPartNumber: mpn,
      mpnNormalized: normalizeNumber(mpn),
      name: 'Auto SKU Part',
      categoryId,
    };
  }

  afterAll(async () => {
    await prisma.part.deleteMany({ where: { id: { in: createdPartIds } } });
    await prisma.manufacturer.deleteMany({ where: { id: { in: createdManufacturerIds } } });
    if (categoryId !== undefined) {
      await prisma.category.delete({ where: { id: categoryId } });
    }
  });

  it("derives the prefix from a normalized, truncated manufacturer code", async () => {
    const manufacturerId = await manufacturer('exd-2');
    expect(await resolveSkuPrefix(manufacturerId)).toBe('EXD2');
  });

  it('falls back to PRT when the manufacturer has no code', async () => {
    const manufacturerId = await manufacturer(null);
    expect(await resolveSkuPrefix(manufacturerId)).toBe('PRT');
  });

  it('creates a part with a generated <prefix>-<suffix> SKU and its normalized form', async () => {
    await ensureCategory();
    const manufacturerId = await manufacturer(null);

    const part = await createPartWithGeneratedSku(baseData(manufacturerId, `MPN-AUTO-${ts}`), {
      nextSuffix: () => 'ABCDEF',
    });
    createdPartIds.push(part.id);

    expect(part.sku).toBe('PRT-ABCDEF');
    expect(part.skuNormalized).toBe(normalizeNumber('PRT-ABCDEF'));
  });

  it('regenerates on a SKU collision instead of failing the request', async () => {
    await ensureCategory();
    const manufacturerId = await manufacturer(null);

    const taken = await createPartWithGeneratedSku(baseData(manufacturerId, `MPN-TAKEN-${ts}`), {
      nextSuffix: () => 'AAAAAA',
    });
    createdPartIds.push(taken.id);
    expect(taken.sku).toBe('PRT-AAAAAA');

    // First candidate collides with the row above; the second is free.
    const suffixes = ['AAAAAA', 'BBBBBB'];
    let call = 0;
    const second = await createPartWithGeneratedSku(baseData(manufacturerId, `MPN-FREE-${ts}`), {
      nextSuffix: () => suffixes[call++],
    });
    createdPartIds.push(second.id);

    expect(second.sku).toBe('PRT-BBBBBB');
    expect(call).toBe(2);
  });

  // A manufacturer + part-number clash is a real conflict, not a SKU collision, so it
  // must propagate (as P2002) rather than be swallowed by the regeneration loop.
  it('does not swallow a manufacturer + part-number conflict', async () => {
    await ensureCategory();
    const manufacturerId = await manufacturer(null);
    const mpn = `MPN-CLASH-${ts}`;

    const first = await createPartWithGeneratedSku(baseData(manufacturerId, mpn));
    createdPartIds.push(first.id);

    await expect(createPartWithGeneratedSku(baseData(manufacturerId, mpn))).rejects.toMatchObject({ code: 'P2002' });
  });
});
