'use client';

import { useState } from 'react';

import { FormActions } from '@/components/admin/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { describeError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { createSupplier, updateSupplier } from '@/lib/api';
import { getFieldErrors } from '@/lib/zodFieldErrors';
import { supplierCreateSchema, supplierUpdateSchema, type Supplier } from '@shop/shared';

interface SupplierFormDialogProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SupplierFormDialog({ supplier, isOpen, onClose, onSaved }: SupplierFormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={supplier ? `Edit supplier — ${supplier.name}` : 'Add supplier'}>
      {isOpen ? (
        <SupplierForm key={supplier ? `edit-${supplier.id}` : 'create'} supplier={supplier} onClose={onClose} onSaved={onSaved} />
      ) : null}
    </Dialog>
  );
}

function nullableOrTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function SupplierForm({ supplier, onClose, onSaved }: { supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(supplier?.name ?? '');
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [gstin, setGstin] = useState(supplier?.gstin ?? '');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      name: name.trim(),
      contactPerson: nullableOrTrimmed(contactPerson),
      phone: nullableOrTrimmed(phone),
      email: nullableOrTrimmed(email),
      address: nullableOrTrimmed(address),
      gstin: nullableOrTrimmed(gstin),
      notes: nullableOrTrimmed(notes),
    };
    // Branched fully (rather than picking a schema with one ternary and the request
    // function with another) so TypeScript can narrow `parsed.data` against the one
    // schema actually used in each branch, instead of the union of both.
    if (supplier) {
      const parsed = supplierUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(getFieldErrors(parsed.error));
        return;
      }
      setFieldErrors({});
      setIsSubmitting(true);
      updateSupplier(supplier.id, parsed.data)
        .then(() => {
          onSaved();
          onClose();
        })
        .catch((error: unknown) => setSubmitError(describeError(error)))
        .finally(() => setIsSubmitting(false));
      return;
    }

    const parsed = supplierCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    createSupplier(parsed.data)
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Contact person"
          placeholder="Optional"
          value={contactPerson}
          onChange={(event) => setContactPerson(event.target.value)}
          error={fieldErrors.contactPerson}
        />
        <Input
          label="Phone"
          placeholder="Optional"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={fieldErrors.phone}
          className="font-mono"
        />
        <Input
          label="Email"
          type="email"
          placeholder="Optional"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
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
      <Input
        label="Address"
        placeholder="Optional"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        error={fieldErrors.address}
      />
      <Input label="Notes" placeholder="Optional" value={notes} onChange={(event) => setNotes(event.target.value)} error={fieldErrors.notes} />
      <FormActions submitLabel={supplier ? 'Save changes' : 'Add supplier'} isSubmitting={isSubmitting} error={submitError} onCancel={onClose} />
    </form>
  );
}
