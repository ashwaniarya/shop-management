export interface PosCartLine {
  partId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export type PosCartAction =
  | { type: 'ADD_PART'; part: { partId: number; sku: string; name: string; unitPrice: number } }
  | { type: 'SET_QTY'; partId: number; quantity: number }
  | { type: 'SET_PRICE'; partId: number; unitPrice: number }
  | { type: 'REMOVE'; partId: number }
  | { type: 'CLEAR' };

export function posCartReducer(state: PosCartLine[], action: PosCartAction): PosCartLine[] {
  switch (action.type) {
    case 'ADD_PART': {
      const existing = state.find((line) => line.partId === action.part.partId);
      if (existing) {
        return state.map((line) =>
          line.partId === action.part.partId ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...state, { ...action.part, quantity: 1 }];
    }

    // Non-positive quantities are rejected outright (state returned unchanged) rather
    // than clamped to 1: dropping a line is REMOVE's job, so SET_QTY never doubles as
    // a removal path.
    case 'SET_QTY': {
      if (action.quantity <= 0) {
        return state;
      }
      return state.map((line) => (line.partId === action.partId ? { ...line, quantity: action.quantity } : line));
    }

    // Same guard shape as SET_QTY: a negative price is rejected outright, never clamped
    // to 0, so a bad input never silently becomes a free line.
    case 'SET_PRICE': {
      if (action.unitPrice < 0) {
        return state;
      }
      return state.map((line) => (line.partId === action.partId ? { ...line, unitPrice: action.unitPrice } : line));
    }

    case 'REMOVE':
      return state.filter((line) => line.partId !== action.partId);

    case 'CLEAR':
      return [];

    default:
      return state;
  }
}

export function resolveLineDefaultPrice(
  inventoryItem: { sellingPrice: number | null } | null,
  part: { mrp: number | null },
): number {
  return inventoryItem?.sellingPrice ?? part.mrp ?? 0;
}

// Rounds the summed total once at the end rather than rounding each line first. Since
// unitPrice is already paise-precision (at most 2 decimals) and quantity is a whole
// number, quantity * unitPrice never introduces extra fractional digits — so this
// matches a server that rounds per line and sums, modulo floating-point noise, which is
// exactly what this rounding step cleans up (e.g. 0.1 + 0.2 -> 0.30000000000000004).
export function cartTotal(lines: PosCartLine[]): number {
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  return Math.round(total * 100) / 100;
}
