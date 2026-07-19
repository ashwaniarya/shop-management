import { describe, expect, it } from 'vitest';

import { buildPartFormPayload, type PartFormValues } from './buildPartFormPayload';

const emptyValues: PartFormValues = {
  sku: '',
  name: '',
  manufacturerId: '',
  manufacturerPartNumber: '',
  categoryId: '',
  description: '',
  unitOfMeasure: '',
  mrp: '',
  gradeId: '',
  copyOf: null,
};

describe('buildPartFormPayload', () => {
  it('trims text fields and maps a fully filled form', () => {
    const payload = buildPartFormPayload({
      sku: '  STM-BSH-575DI  ',
      name: '  Starter Motor  ',
      manufacturerId: 3,
      manufacturerPartNumber: '  0-001-367-032  ',
      categoryId: 7,
      description: '  Heavy duty  ',
      unitOfMeasure: '  piece  ',
      mrp: '3200.50',
      gradeId: 2,
      copyOf: { id: 42, sku: 'X', name: 'Y' },
    });

    expect(payload).toEqual({
      sku: 'STM-BSH-575DI',
      name: 'Starter Motor',
      manufacturerId: 3,
      manufacturerPartNumber: '0-001-367-032',
      categoryId: 7,
      description: 'Heavy duty',
      unitOfMeasure: 'piece',
      mrp: 3200.5,
      gradeId: 2,
      copyOfPartId: 42,
    });
  });

  it('omits empty required selects (undefined) and clears empty optionals (null)', () => {
    const payload = buildPartFormPayload(emptyValues);

    expect(payload.manufacturerId).toBeUndefined();
    expect(payload.categoryId).toBeUndefined();
    expect(payload.unitOfMeasure).toBeUndefined();
    expect(payload.description).toBeNull();
    expect(payload.mrp).toBeNull();
    expect(payload.gradeId).toBeNull();
    expect(payload.copyOfPartId).toBeNull();
  });

  it('treats a whitespace-only mrp as null, never NaN', () => {
    expect(buildPartFormPayload({ ...emptyValues, mrp: '   ' }).mrp).toBeNull();
  });

  it('parses a numeric mrp string to a number, including zero', () => {
    expect(buildPartFormPayload({ ...emptyValues, mrp: '0' }).mrp).toBe(0);
    expect(buildPartFormPayload({ ...emptyValues, mrp: '1499.99' }).mrp).toBe(1499.99);
  });

  it('uses the copy-of selection id for copyOfPartId, or null when unlinked', () => {
    expect(buildPartFormPayload({ ...emptyValues, copyOf: { id: 99, sku: 'A', name: 'B' } }).copyOfPartId).toBe(99);
    expect(buildPartFormPayload(emptyValues).copyOfPartId).toBeNull();
  });
});
