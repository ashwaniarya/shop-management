'use client';

import { useState } from 'react';

import { FormActions } from '@/components/ui/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { createShop, updateShop } from '@/lib/api';
import { shopCreateSchema, shopUpdateSchema, type Shop } from '@shop/shared';

interface ShopFormDialogProps {
  shop: Shop | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function nullableOrTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function ShopFormDialog({ shop, isOpen, onClose, onSaved }: ShopFormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={shop ? `Edit shop — ${shop.name}` : 'Add shop'}>
      {isOpen ? <ShopForm key={shop ? `edit-${shop.id}` : 'create'} shop={shop} onClose={onClose} onSaved={onSaved} /> : null}
    </Dialog>
  );
}

function ShopForm({ shop, onClose, onSaved }: { shop: Shop | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(shop?.name ?? '');
  const [address, setAddress] = useState(shop?.address ?? '');
  const [phone, setPhone] = useState(shop?.phone ?? '');
  const [gstin, setGstin] = useState(shop?.gstin ?? '');

  const closeAfterSave = () => {
    onSaved();
    onClose();
  };
  const createSubmit = useZodSubmit(shopCreateSchema, createShop, { onSuccess: closeAfterSave });
  const updateSubmit = useZodSubmit(
    shopUpdateSchema,
    (data) => (shop ? updateShop(shop.id, data) : Promise.reject(new Error('No shop selected'))),
    { onSuccess: closeAfterSave },
  );
  const { fieldErrors, submitError, isSubmitting, run } = shop ? updateSubmit : createSubmit;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    run({
      name: name.trim(),
      address: nullableOrTrimmed(address),
      phone: nullableOrTrimmed(phone),
      gstin: nullableOrTrimmed(gstin),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} error={fieldErrors.name} />
      <Input
        label="Address"
        placeholder="Optional"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        error={fieldErrors.address}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Phone"
          placeholder="Optional"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={fieldErrors.phone}
          className="font-mono"
        />
        <Input
          label="GSTIN"
          placeholder="Optional"
          value={gstin}
          onChange={(event) => setGstin(event.target.value)}
          error={fieldErrors.gstin}
          className="font-mono"
        />
      </div>
      <FormActions submitLabel={shop ? 'Save changes' : 'Add shop'} isSubmitting={isSubmitting} error={submitError} onCancel={onClose} />
    </form>
  );
}
