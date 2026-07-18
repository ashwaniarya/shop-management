// Behavioural test: exercises number search across sku/mpn/cross-ref/supplier-part against the real DB
import { RefType } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { normalizeNumber } from '../lib/normalize';
import { prisma } from '../lib/prisma';
import { DomainValidationError } from './errors';
import { searchPartsByNumber } from './partSearch';

describe('searchPartsByNumber', () => {
  const ts = Date.now();

  const sku = `KB-100-X-${ts}`;
  const mpn = `0 001 109 015 ${ts}`;
  const crossRefNumber = `31100-KVB-901-${ts}`;
  const supplierPartNumber = `LTV/STM/44/${ts}`;
  const dedupSku = `DEDUP-SKU-${ts}`;

  let manufacturerId: number;
  let categoryId: number;
  let supplierId: number;
  let partId: number;
  let dedupPartId: number;

  beforeAll(async () => {
    const manufacturer = await prisma.manufacturer.create({
      data: { name: `PartSearch Test Manufacturer ${ts}` },
    });
    manufacturerId = manufacturer.id;

    const category = await prisma.category.create({
      data: { name: `PartSearch Test Category ${ts}` },
    });
    categoryId = category.id;

    const supplier = await prisma.supplier.create({
      data: { name: `PartSearch Test Supplier ${ts}` },
    });
    supplierId = supplier.id;

    const part = await prisma.part.create({
      data: {
        sku,
        skuNormalized: normalizeNumber(sku),
        manufacturerId,
        manufacturerPartNumber: mpn,
        mpnNormalized: normalizeNumber(mpn),
        name: `PartSearch Fixture Part ${ts}`,
        categoryId,
      },
    });
    partId = part.id;

    await prisma.partCrossReference.create({
      data: {
        partId,
        refType: RefType.OEM,
        refNumber: crossRefNumber,
        refNumberNormalized: normalizeNumber(crossRefNumber),
      },
    });

    await prisma.supplierPart.create({
      data: {
        partId,
        supplierId,
        supplierPartNumber,
        supplierPartNumberNormalized: normalizeNumber(supplierPartNumber),
      },
    });

    const dedupPart = await prisma.part.create({
      data: {
        sku: dedupSku,
        skuNormalized: normalizeNumber(dedupSku),
        manufacturerId,
        manufacturerPartNumber: `DEDUP-MPN-${ts}`,
        mpnNormalized: normalizeNumber(`DEDUP-MPN-${ts}`),
        name: `PartSearch Dedup Fixture Part ${ts}`,
        categoryId,
      },
    });
    dedupPartId = dedupPart.id;

    // Same normalized value as the dedup part's own SKU, filed as a cross-reference too,
    // so a search for it must dedupe down to the higher-priority SKU match.
    await prisma.partCrossReference.create({
      data: {
        partId: dedupPartId,
        refType: RefType.OEM,
        refNumber: dedupSku,
        refNumberNormalized: normalizeNumber(dedupSku),
      },
    });
  });

  afterAll(async () => {
    await prisma.part.deleteMany({ where: { id: { in: [partId, dedupPartId] } } });
    await prisma.supplier.delete({ where: { id: supplierId } });
    await prisma.manufacturer.delete({ where: { id: manufacturerId } });
    await prisma.category.delete({ where: { id: categoryId } });
  });

  it('finds a part by exact SKU', async () => {
    const results = await searchPartsByNumber(sku);

    expect(results).toHaveLength(1);
    expect(results[0].matchedBy).toBe('SKU');
    expect(results[0].matchedNumber).toBe(sku);
    expect(results[0].part.id).toBe(partId);
  });

  it('finds a part by exact manufacturer part number', async () => {
    const results = await searchPartsByNumber(mpn);

    expect(results).toHaveLength(1);
    expect(results[0].matchedBy).toBe('MPN');
    expect(results[0].matchedNumber).toBe(mpn);
    expect(results[0].part.id).toBe(partId);
  });

  it('finds a part by exact cross-reference number', async () => {
    const results = await searchPartsByNumber(crossRefNumber);

    expect(results).toHaveLength(1);
    expect(results[0].matchedBy).toBe('CROSS_REFERENCE');
    expect(results[0].matchedNumber).toBe(crossRefNumber);
    expect(results[0].part.id).toBe(partId);
  });

  it('finds a part by exact supplier part number', async () => {
    const results = await searchPartsByNumber(supplierPartNumber);

    expect(results).toHaveLength(1);
    expect(results[0].matchedBy).toBe('SUPPLIER_NUMBER');
    expect(results[0].matchedNumber).toBe(supplierPartNumber);
    expect(results[0].part.id).toBe(partId);
  });

  it('normalizes case and punctuation before matching, across all four source types', async () => {
    const bySku = await searchPartsByNumber(sku.toLowerCase().replace(/-/g, ' '));
    expect(bySku).toHaveLength(1);
    expect(bySku[0].matchedBy).toBe('SKU');

    const byMpn = await searchPartsByNumber(mpn.replace(/\s+/g, '-'));
    expect(byMpn).toHaveLength(1);
    expect(byMpn[0].matchedBy).toBe('MPN');

    const byCrossRef = await searchPartsByNumber(crossRefNumber.toLowerCase().replace(/-/g, ' '));
    expect(byCrossRef).toHaveLength(1);
    expect(byCrossRef[0].matchedBy).toBe('CROSS_REFERENCE');

    const bySupplierNumber = await searchPartsByNumber(supplierPartNumber.toLowerCase().replace(/\//g, ' '));
    expect(bySupplierNumber).toHaveLength(1);
    expect(bySupplierNumber[0].matchedBy).toBe('SUPPLIER_NUMBER');
  });

  it('includes manufacturer and category relations on the matched part', async () => {
    const results = await searchPartsByNumber(sku);

    expect(results[0].part.manufacturer.id).toBe(manufacturerId);
    expect(results[0].part.category.id).toBe(categoryId);
  });

  it('deduplicates a part matched by both SKU and a cross-reference, keeping the higher-priority match', async () => {
    const results = await searchPartsByNumber(dedupSku);

    expect(results).toHaveLength(1);
    expect(results[0].matchedBy).toBe('SKU');
    expect(results[0].part.id).toBe(dedupPartId);
  });

  it('throws DomainValidationError for empty input', async () => {
    await expect(searchPartsByNumber('')).rejects.toThrow(DomainValidationError);
  });

  it('throws DomainValidationError for input that normalizes to nothing', async () => {
    await expect(searchPartsByNumber('---   ...')).rejects.toThrow(DomainValidationError);
  });
});
