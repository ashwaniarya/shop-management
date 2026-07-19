'use client';

import { activeStatusColumn, AdminLookupPanel, type AdminLookupColumn } from '@/components/admin/AdminLookupPanel';
import { listSuppliers, softDeleteSupplier, updateSupplier } from '@/lib/api';
import type { Supplier } from '@shop/shared';

import { SupplierFormDialog } from './SupplierFormDialog';

const COLUMNS: AdminLookupColumn<Supplier>[] = [
  { header: 'Name', cell: (supplier) => supplier.name },
  { header: 'Contact', cellClassName: 'text-ink-400', cell: (supplier) => supplier.contactPerson ?? '—' },
  { header: 'Phone', mono: true, cellClassName: 'text-ink-400', cell: (supplier) => supplier.phone ?? '—' },
  { header: 'Email', cellClassName: 'text-ink-400', cell: (supplier) => supplier.email ?? '—' },
  { header: 'GSTIN', mono: true, cellClassName: 'text-ink-400', cell: (supplier) => supplier.gstin ?? '—' },
  activeStatusColumn(),
];

export function SuppliersTable() {
  return (
    <AdminLookupPanel
      entityLabel="supplier"
      entityLabelPlural="suppliers"
      columns={COLUMNS}
      loadingRowCount={6}
      listItems={listSuppliers}
      softDeleteItem={softDeleteSupplier}
      updateItem={updateSupplier}
      renderFormDialog={({ item, isOpen, onClose, onSaved }) => (
        <SupplierFormDialog supplier={item} isOpen={isOpen} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
