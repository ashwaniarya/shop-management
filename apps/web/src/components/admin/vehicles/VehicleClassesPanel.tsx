'use client';

import { activeStatusColumn, AdminLookupPanel, type AdminLookupColumn } from '@/components/admin/AdminLookupPanel';
import { listVehicleClasses, softDeleteVehicleClass, updateVehicleClass } from '@/lib/api';
import type { VehicleClass } from '@shop/shared';

import { VehicleClassFormDialog } from './VehicleClassFormDialog';

const COLUMNS: AdminLookupColumn<VehicleClass>[] = [
  { header: 'Name', cell: (vehicleClass) => vehicleClass.name },
  {
    header: 'Display order',
    headerAlign: 'right',
    align: 'right',
    mono: true,
    cellClassName: 'text-ink-400',
    cell: (vehicleClass) => vehicleClass.displayOrder,
  },
  activeStatusColumn(),
];

export function VehicleClassesPanel() {
  return (
    <AdminLookupPanel
      entityLabel="vehicle class"
      entityLabelPlural="vehicle classes"
      columns={COLUMNS}
      listItems={listVehicleClasses}
      softDeleteItem={softDeleteVehicleClass}
      updateItem={updateVehicleClass}
      renderFormDialog={({ item, isOpen, onClose, onSaved }) => (
        <VehicleClassFormDialog vehicleClass={item} isOpen={isOpen} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
