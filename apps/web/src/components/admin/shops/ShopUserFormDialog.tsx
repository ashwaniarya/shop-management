'use client';

import { useState } from 'react';

import { FormActions } from '@/components/admin/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { describeError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createShopUser, updateShopUser } from '@/lib/api';
import { getFieldErrors } from '@/lib/zodFieldErrors';
import { userRoleSchema, userCreateSchema, userUpdateSchema, type User, type UserRole } from '@shop/shared';

const ROLE_OPTIONS = userRoleSchema.options;

interface ShopUserFormDialogProps {
  shopId: number;
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function nullableOrTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function ShopUserFormDialog({ shopId, user, isOpen, onClose, onSaved }: ShopUserFormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={user ? `Edit user — ${user.name}` : 'Add user'}>
      {isOpen ? (
        <ShopUserForm key={user ? `edit-${user.id}` : 'create'} shopId={shopId} user={user} onClose={onClose} onSaved={onSaved} />
      ) : null}
    </Dialog>
  );
}

function ShopUserForm({
  shopId,
  user,
  onClose,
  onSaved,
}: {
  shopId: number;
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'STAFF');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      name: name.trim(),
      phone: nullableOrTrimmed(phone),
      email: nullableOrTrimmed(email),
      role,
    };
    // Branched fully (rather than picking a schema with one ternary and the request
    // function with another) so TypeScript can narrow `parsed.data` against the one
    // schema actually used in each branch, instead of the union of both.
    if (user) {
      const parsed = userUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(getFieldErrors(parsed.error));
        return;
      }
      setFieldErrors({});
      setIsSubmitting(true);
      updateShopUser(shopId, user.id, parsed.data)
        .then(() => {
          onSaved();
          onClose();
        })
        .catch((error: unknown) => setSubmitError(describeError(error)))
        .finally(() => setIsSubmitting(false));
      return;
    }

    const parsed = userCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    createShopUser(shopId, parsed.data)
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
      </div>
      <Select label="Role" required value={role} onChange={(event) => setRole(event.target.value as UserRole)} error={fieldErrors.role}>
        {ROLE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
      <FormActions submitLabel={user ? 'Save changes' : 'Add user'} isSubmitting={isSubmitting} error={submitError} onCancel={onClose} />
    </form>
  );
}
