'use client';

import { activeStatusColumn, AdminLookupPanel, type AdminLookupColumn } from '@/components/admin/AdminLookupPanel';
import { listManufacturers, softDeleteManufacturer, updateManufacturer } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Manufacturer } from '@shop/shared';

import { ManufacturerFormDialog } from './ManufacturerFormDialog';

const COLUMNS: AdminLookupColumn<Manufacturer>[] = [
  { header: 'Name', cell: (manufacturer) => manufacturer.name },
  { header: 'Code', mono: true, cellClassName: 'text-ink-400', cell: (manufacturer) => manufacturer.code ?? '—' },
  activeStatusColumn(),
  { header: 'Created', mono: true, cellClassName: 'text-ink-400', cell: (manufacturer) => formatDate(manufacturer.createdAt) },
];

export function ManufacturersTable() {
  return (
    <AdminLookupPanel
      entityLabel="manufacturer"
      entityLabelPlural="manufacturers"
      columns={COLUMNS}
      loadingRowCount={6}
      listItems={listManufacturers}
      softDeleteItem={softDeleteManufacturer}
      updateItem={updateManufacturer}
      renderFormDialog={({ item, isOpen, onClose, onSaved }) => (
        <ManufacturerFormDialog manufacturer={item} isOpen={isOpen} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
