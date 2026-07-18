'use client';

import { InventorySettingsForm } from '@/components/InventorySettingsForm';
import { Dialog } from '@/components/ui/Dialog';
import { upsertInventoryItem, type InventoryRow } from '@/lib/api';

interface InventoryEditDialogProps {
  shopId: number;
  row: InventoryRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function InventoryEditDialog({ shopId, row, onClose, onSaved }: InventoryEditDialogProps) {
  return (
    <Dialog isOpen={row !== null} onClose={onClose} title={row ? `Stock settings — ${row.part.sku}` : 'Stock settings'}>
      {row ? (
        <InventorySettingsForm initialItem={row} onSaved={onSaved} submit={(data) => upsertInventoryItem(shopId, row.partId, data)} />
      ) : null}
    </Dialog>
  );
}
