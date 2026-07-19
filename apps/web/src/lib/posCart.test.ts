import { describe, expect, it } from 'vitest';

import { cartTotal, posCartReducer, resolveLineDefaultPrice, type PosCartLine } from './posCart';

function buildLine(overrides: Partial<PosCartLine> & Pick<PosCartLine, 'partId'>): PosCartLine {
  return {
    sku: `SKU-${overrides.partId}`,
    name: `Part ${overrides.partId}`,
    quantity: 1,
    unitPrice: 100,
    ...overrides,
  };
}

describe('posCartReducer', () => {
  describe('ADD_PART', () => {
    it('appends a new line with quantity 1 at the given price', () => {
      const result = posCartReducer([], {
        type: 'ADD_PART',
        part: { partId: 1, sku: 'STM-BSH-575DI', name: 'Starter Motor', unitPrice: 250 },
      });

      expect(result).toEqual([
        { partId: 1, sku: 'STM-BSH-575DI', name: 'Starter Motor', quantity: 1, unitPrice: 250 },
      ]);
    });

    it('increments the quantity of an existing line instead of duplicating it', () => {
      const state = [buildLine({ partId: 1, quantity: 2, unitPrice: 250 })];

      const result = posCartReducer(state, {
        type: 'ADD_PART',
        part: { partId: 1, sku: 'SKU-1', name: 'Part 1', unitPrice: 250 },
      });

      expect(result).toEqual([buildLine({ partId: 1, quantity: 3, unitPrice: 250 })]);
    });

    it('keeps the existing price when merging, ignoring the price on the action', () => {
      const state = [buildLine({ partId: 1, quantity: 1, unitPrice: 250 })];

      const result = posCartReducer(state, {
        type: 'ADD_PART',
        part: { partId: 1, sku: 'SKU-1', name: 'Part 1', unitPrice: 999 },
      });

      expect(result[0].unitPrice).toBe(250);
    });

    it('does not mutate the input array or its lines', () => {
      const state = [buildLine({ partId: 1, quantity: 1 })];
      const snapshot = [...state];

      posCartReducer(state, { type: 'ADD_PART', part: { partId: 1, sku: 'SKU-1', name: 'Part 1', unitPrice: 100 } });

      expect(state).toEqual(snapshot);
    });
  });

  describe('SET_QTY', () => {
    it('sets the quantity of the matching line only', () => {
      const state = [buildLine({ partId: 1, quantity: 1 }), buildLine({ partId: 2, quantity: 1 })];

      const result = posCartReducer(state, { type: 'SET_QTY', partId: 2, quantity: 5 });

      expect(result.find((line) => line.partId === 1)?.quantity).toBe(1);
      expect(result.find((line) => line.partId === 2)?.quantity).toBe(5);
    });

    it('ignores a zero quantity, leaving the line unchanged', () => {
      const state = [buildLine({ partId: 1, quantity: 3 })];

      const result = posCartReducer(state, { type: 'SET_QTY', partId: 1, quantity: 0 });

      expect(result[0].quantity).toBe(3);
    });

    it('ignores a negative quantity, leaving the line unchanged', () => {
      const state = [buildLine({ partId: 1, quantity: 3 })];

      const result = posCartReducer(state, { type: 'SET_QTY', partId: 1, quantity: -2 });

      expect(result[0].quantity).toBe(3);
    });

    it('does not mutate the input line objects', () => {
      const line = buildLine({ partId: 1, quantity: 1 });
      const state = [line];

      posCartReducer(state, { type: 'SET_QTY', partId: 1, quantity: 9 });

      expect(line.quantity).toBe(1);
    });
  });

  describe('SET_PRICE', () => {
    it('sets the unitPrice of the matching line only', () => {
      const state = [buildLine({ partId: 1, unitPrice: 100 }), buildLine({ partId: 2, unitPrice: 100 })];

      const result = posCartReducer(state, { type: 'SET_PRICE', partId: 2, unitPrice: 175.5 });

      expect(result.find((line) => line.partId === 1)?.unitPrice).toBe(100);
      expect(result.find((line) => line.partId === 2)?.unitPrice).toBe(175.5);
    });

    it('allows a zero price', () => {
      const state = [buildLine({ partId: 1, unitPrice: 100 })];

      const result = posCartReducer(state, { type: 'SET_PRICE', partId: 1, unitPrice: 0 });

      expect(result[0].unitPrice).toBe(0);
    });

    it('ignores a negative price, leaving the line unchanged', () => {
      const state = [buildLine({ partId: 1, unitPrice: 100 })];

      const result = posCartReducer(state, { type: 'SET_PRICE', partId: 1, unitPrice: -5 });

      expect(result[0].unitPrice).toBe(100);
    });

    it('does not mutate the input line objects', () => {
      const line = buildLine({ partId: 1, unitPrice: 100 });
      const state = [line];

      posCartReducer(state, { type: 'SET_PRICE', partId: 1, unitPrice: 200 });

      expect(line.unitPrice).toBe(100);
    });
  });

  describe('REMOVE', () => {
    it('drops the matching line and keeps the rest', () => {
      const state = [buildLine({ partId: 1 }), buildLine({ partId: 2 }), buildLine({ partId: 3 })];

      const result = posCartReducer(state, { type: 'REMOVE', partId: 2 });

      expect(result.map((line) => line.partId)).toEqual([1, 3]);
    });

    it('does not mutate the input array', () => {
      const state = [buildLine({ partId: 1 }), buildLine({ partId: 2 })];
      const snapshot = [...state];

      posCartReducer(state, { type: 'REMOVE', partId: 1 });

      expect(state).toEqual(snapshot);
    });
  });

  describe('CLEAR', () => {
    it('empties the cart', () => {
      const state = [buildLine({ partId: 1 }), buildLine({ partId: 2 })];

      expect(posCartReducer(state, { type: 'CLEAR' })).toEqual([]);
    });

    it('does not mutate the input array', () => {
      const state = [buildLine({ partId: 1 })];
      const snapshot = [...state];

      posCartReducer(state, { type: 'CLEAR' });

      expect(state).toEqual(snapshot);
    });
  });
});

describe('resolveLineDefaultPrice', () => {
  it('prefers the inventory selling price when present', () => {
    expect(resolveLineDefaultPrice({ sellingPrice: 275 }, { mrp: 300 })).toBe(275);
  });

  it('falls back to the part mrp when there is no inventory item', () => {
    expect(resolveLineDefaultPrice(null, { mrp: 300 })).toBe(300);
  });

  it('falls back to the part mrp when the inventory selling price is null', () => {
    expect(resolveLineDefaultPrice({ sellingPrice: null }, { mrp: 300 })).toBe(300);
  });

  it('falls back to 0 when neither selling price nor mrp is set', () => {
    expect(resolveLineDefaultPrice(null, { mrp: null })).toBe(0);
    expect(resolveLineDefaultPrice({ sellingPrice: null }, { mrp: null })).toBe(0);
  });

  it('treats a zero selling price as a real price, not a missing one', () => {
    expect(resolveLineDefaultPrice({ sellingPrice: 0 }, { mrp: 300 })).toBe(0);
  });

  it('treats a zero mrp as a real fallback value', () => {
    expect(resolveLineDefaultPrice(null, { mrp: 0 })).toBe(0);
  });
});

describe('cartTotal', () => {
  it('sums quantity times unitPrice across lines', () => {
    const lines = [
      buildLine({ partId: 1, quantity: 2, unitPrice: 250 }),
      buildLine({ partId: 2, quantity: 1, unitPrice: 99.5 }),
    ];

    expect(cartTotal(lines)).toBe(599.5);
  });

  it('returns 0 for an empty cart', () => {
    expect(cartTotal([])).toBe(0);
  });

  it('rounds away floating point noise to 2 decimals', () => {
    const lines = [
      buildLine({ partId: 1, quantity: 1, unitPrice: 0.1 }),
      buildLine({ partId: 2, quantity: 1, unitPrice: 0.2 }),
    ];

    expect(cartTotal(lines)).toBe(0.3);
  });

  it('rounds a result with more than 2 decimal places', () => {
    const lines = [buildLine({ partId: 1, quantity: 3, unitPrice: 33.333 })];

    expect(cartTotal(lines)).toBe(100);
  });
});
