import type { CopyOfPartSelection } from './CopyOfPartPicker';

// Replaces the id-only placeholder with the fetched sku/name only while the link is
// untouched: a user who cleared or re-picked during the fetch keeps their choice.
export function reconcileCopyOfPrefill(
  current: CopyOfPartSelection | null,
  fetched: CopyOfPartSelection,
): CopyOfPartSelection | null {
  return current?.id === fetched.id ? fetched : current;
}
