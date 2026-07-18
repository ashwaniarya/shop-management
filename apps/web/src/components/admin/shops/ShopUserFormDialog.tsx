'use client';

import { useState } from 'react';

import { FormActions } from '@/components/ui/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { createShopUser, updateShopUser } from '@/lib/api';
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

  const closeAfterSave = () => {
    onSaved();
    onClose();
  };
  const createSubmit = useZodSubmit(userCreateSchema, (data) => createShopUser(shopId, data), { onSuccess: closeAfterSave });
  const updateSubmit = useZodSubmit(
    userUpdateSchema,
    (data) => (user ? updateShopUser(shopId, user.id, data) : Promise.reject(new Error('No user selected'))),
    { onSuccess: closeAfterSave },
  );
  const { fieldErrors, submitError, isSubmitting, run } = user ? updateSubmit : createSubmit;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    run({
      name: name.trim(),
      phone: nullableOrTrimmed(phone),
      email: nullableOrTrimmed(email),
      role,
    });
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
