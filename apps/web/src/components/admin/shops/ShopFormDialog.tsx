'use client';

import { useState } from 'react';

import { FormActions } from '@/components/admin/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { describeError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { createShop, updateShop } from '@/lib/api';
import { getFieldErrors } from '@/lib/zodFieldErrors';
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      name: name.trim(),
      address: nullableOrTrimmed(address),
      phone: nullableOrTrimmed(phone),
      gstin: nullableOrTrimmed(gstin),
    };
    // Branched fully (rather than picking a schema with one ternary and the request
    // function with another) so TypeScript can narrow `parsed.data` against the one
    // schema actually used in each branch, instead of the union of both.
    if (shop) {
      const parsed = shopUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(getFieldErrors(parsed.error));
        return;
      }
      setFieldErrors({});
      setIsSubmitting(true);
      updateShop(shop.id, parsed.data)
        .then(() => {
          onSaved();
          onClose();
        })
        .catch((error: unknown) => setSubmitError(describeError(error)))
        .finally(() => setIsSubmitting(false));
      return;
    }

    const parsed = shopCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    createShop(parsed.data)
      .then(() => {
        onSaved();
        onClose();
      })
      .catch((error: unknown) => setSubmitError(describeError(error)))
      .finally(() => setIsSubmitting(false));
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
