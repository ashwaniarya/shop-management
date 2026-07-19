// Unit test: pure logic, isolated schema
import { describe, expect, it } from 'vitest';

import { partCreateSchema, partUpdateSchema } from './part';

describe('partCreateSchema', () => {
  it('rejects an empty name', () => {
    const result = partCreateSchema.safeParse({
      sku: 'SKU-1',
      manufacturerId: 1,
      manufacturerPartNumber: 'MPN-1',
      name: '',
      categoryId: 1,
    });
    expect(result.success).toBe(false);
  });

  it('defaults unitOfMeasure to piece when omitted', () => {
    const result = partCreateSchema.parse({
      sku: 'SKU-1',
      manufacturerId: 1,
      manufacturerPartNumber: 'MPN-1',
      name: 'Test Part',
      categoryId: 1,
    });
    expect(result.unitOfMeasure).toBe('piece');
  });

  it('keeps an explicit unitOfMeasure', () => {
    const result = partCreateSchema.parse({
      sku: 'SKU-1',
      manufacturerId: 1,
      manufacturerPartNumber: 'MPN-1',
      name: 'Test Part',
      categoryId: 1,
      unitOfMeasure: 'tub',
    });
    expect(result.unitOfMeasure).toBe('tub');
  });

  it('leaves gradeId and copyOfPartId undefined when omitted', () => {
    const result = partCreateSchema.parse({
      sku: 'SKU-1',
      manufacturerId: 1,
      manufacturerPartNumber: 'MPN-1',
      name: 'Test Part',
      categoryId: 1,
    });
    expect(result.gradeId).toBeUndefined();
    expect(result.copyOfPartId).toBeUndefined();
  });

  it('accepts numeric gradeId and copyOfPartId', () => {
    const result = partCreateSchema.parse({
      sku: 'SKU-1',
      manufacturerId: 1,
      manufacturerPartNumber: 'MPN-1',
      name: 'Test Part',
      categoryId: 1,
      gradeId: 3,
      copyOfPartId: 7,
    });
    expect(result.gradeId).toBe(3);
    expect(result.copyOfPartId).toBe(7);
  });

  it('accepts explicit null gradeId and copyOfPartId', () => {
    const result = partCreateSchema.parse({
      sku: 'SKU-1',
      manufacturerId: 1,
      manufacturerPartNumber: 'MPN-1',
      name: 'Test Part',
      categoryId: 1,
      gradeId: null,
      copyOfPartId: null,
    });
    expect(result.gradeId).toBeNull();
    expect(result.copyOfPartId).toBeNull();
  });
});

describe('partUpdateSchema', () => {
  it('leaves unitOfMeasure untouched (undefined) when omitted, rather than resetting to the create-time default', () => {
    const result = partUpdateSchema.parse({ name: 'Renamed Part' });
    expect(result.unitOfMeasure).toBeUndefined();
    expect(result.name).toBe('Renamed Part');
  });

  it('accepts an empty object', () => {
    expect(partUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts isActive, which is not part of the create schema', () => {
    const result = partUpdateSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it('accepts an explicit null description', () => {
    const result = partUpdateSchema.safeParse({ description: null });
    expect(result.success).toBe(true);
  });

  it('accepts an explicit null gradeId and copyOfPartId to clear the links', () => {
    const result = partUpdateSchema.parse({ gradeId: null, copyOfPartId: null });
    expect(result.gradeId).toBeNull();
    expect(result.copyOfPartId).toBeNull();
  });

  it('leaves gradeId and copyOfPartId undefined when omitted', () => {
    const result = partUpdateSchema.parse({ name: 'Renamed Part' });
    expect(result.gradeId).toBeUndefined();
    expect(result.copyOfPartId).toBeUndefined();
  });
});
