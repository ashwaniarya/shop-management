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

function undefinedOrTrimmed(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
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
  const [username, setUsername] = useState(user?.username ?? '');
  const [pin, setPin] = useState('');
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
      username: undefinedOrTrimmed(username),
      pin: pin === '' ? undefined : pin,
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

      <div className="border-t border-ink-800 pt-3">
        <p className="mb-3 text-xs font-medium tracking-wide text-ink-300 uppercase">Login credentials</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Username"
            required={!user}
            placeholder={user ? 'None set' : undefined}
            autoComplete="off"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={fieldErrors.username}
            className="font-mono"
          />
          <Input
            label="PIN"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={6}
            placeholder={user ? 'Unchanged' : 'Optional'}
            hint={user ? '4–6 digits — leave blank to keep the current PIN' : '4–6 digits — leave blank to set up login later'}
            className="text-center font-mono tracking-[0.4em]"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            error={fieldErrors.pin}
          />
        </div>
      </div>

      <FormActions submitLabel={user ? 'Save changes' : 'Add user'} isSubmitting={isSubmitting} error={submitError} onCancel={onClose} />
    </form>
  );
}
