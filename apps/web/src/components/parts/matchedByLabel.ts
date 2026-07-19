import type { PartSearchMatchedBy } from '@/lib/api';

export const MATCHED_BY_LABEL: Record<PartSearchMatchedBy, string> = {
  SKU: 'SKU',
  MPN: 'Mfr. part #',
  CROSS_REFERENCE: 'Cross-ref',
  SUPPLIER_NUMBER: 'Supplier #',
};
