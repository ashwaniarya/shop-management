'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { registerSchema } from '@shop/shared';

import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useZodSubmit } from '@/hooks/useZodSubmit';

function BrandMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 1.5 17.5 6v8L10 18.5 2.5 14V6Z"
        stroke="var(--color-accent-500)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.75" stroke="var(--color-ink-100)" strokeWidth="1.4" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const auth = useAuth();

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');

  const { fieldErrors, submitError, isSubmitting, run } = useZodSubmit(
    registerSchema,
    (input) => auth.register(input),
    { onSuccess: () => router.replace('/') },
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    run({
      shopName: shopName.trim(),
      ownerName: ownerName.trim(),
      username: username.trim(),
      pin,
    });
  }

  return (
    <div className="bg-graticule relative flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div aria-hidden="true" className="bg-login-glow pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-sm rounded-md border border-ink-800 bg-ink-900 p-6 shadow-2xl sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandMark />
          <h1 className="font-display text-xl font-bold tracking-wide text-ink-50 uppercase">Create your shop</h1>
          <p className="font-mono text-[11px] tracking-[0.18em] text-ink-500 uppercase">Start managing in minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="Shop name"
            autoFocus
            value={shopName}
            onChange={(event) => setShopName(event.target.value)}
            error={fieldErrors.shopName}
          />
          <Input
            label="Your name"
            autoComplete="name"
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            error={fieldErrors.ownerName}
          />
          <Input
            label="Username"
            autoComplete="username"
            hint="At least 3 characters"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={fieldErrors.username}
          />
          <Input
            label="PIN"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={6}
            hint="6 digits"
            className="text-center font-mono tracking-[0.4em]"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            error={fieldErrors.pin}
          />

          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="mt-2 w-full">
            Create shop
          </Button>

          <div className="flex justify-center">
            <FormError error={submitError} />
          </div>
        </form>

        <p className="mt-5 text-center text-xs text-ink-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-accent-400 hover:text-accent-300 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
