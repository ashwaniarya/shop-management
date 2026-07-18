// Mirrors the server's belowReorder filter (inventory.ts: `quantityOnHand.lte(reorderLevel)`)
// so a row's highlight state always agrees with what the ?belowReorder=true filter returns.
export function isBelowReorderLevel(quantityOnHand: number, reorderLevel: number | null): boolean {
  return reorderLevel !== null && quantityOnHand <= reorderLevel;
}
