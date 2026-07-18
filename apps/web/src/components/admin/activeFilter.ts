export type ActiveFilterValue = 'all' | 'active' | 'inactive';

export const ACTIVE_FILTER_OPTIONS: { value: ActiveFilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// Unlike parts/inventory, these admin resources (manufacturers, suppliers, vehicle
// classes/makes/models, shops, shop users) have no server-side isActive query param,
// so the All/Active/Inactive toggle mirrors PartsFilterBar's UI but filters the
// already-fetched page client-side instead of round-tripping a new request.
export function filterByActiveState<T extends { isActive: boolean }>(rows: T[], filter: ActiveFilterValue): T[] {
  if (filter === 'all') {
    return rows;
  }
  return rows.filter((row) => row.isActive === (filter === 'active'));
}
