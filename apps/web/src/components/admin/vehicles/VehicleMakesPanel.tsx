'use client';

import { activeStatusColumn, AdminLookupPanel, type AdminLookupColumn } from '@/components/admin/AdminLookupPanel';
import { listVehicleMakes, softDeleteVehicleMake, updateVehicleMake } from '@/lib/api';
import type { VehicleMake } from '@shop/shared';

import { VehicleMakeFormDialog } from './VehicleMakeFormDialog';

const COLUMNS: AdminLookupColumn<VehicleMake>[] = [
  { header: 'Name', cell: (vehicleMake) => vehicleMake.name },
  activeStatusColumn(),
];

export function VehicleMakesPanel() {
  return (
    <AdminLookupPanel
      entityLabel="vehicle make"
      entityLabelPlural="vehicle makes"
      columns={COLUMNS}
      listItems={listVehicleMakes}
      softDeleteItem={softDeleteVehicleMake}
      updateItem={updateVehicleMake}
      renderFormDialog={({ item, isOpen, onClose, onSaved }) => (
        <VehicleMakeFormDialog vehicleMake={item} isOpen={isOpen} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
