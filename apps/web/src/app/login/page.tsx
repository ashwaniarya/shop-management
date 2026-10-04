'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { loginSchema } from '@shop/shared';

import { SocialSignIn } from '@/components/SocialSignIn';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { describeOAuthError } from '@/lib/oauth';

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

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Read from window rather than useSearchParams: that hook forces this page into a
  // Suspense boundary at build time, and the value is only needed after hydration.
  useEffect(() => {
    const errorCode = new URLSearchParams(window.location.search).get('error');
    if (errorCode) {
      setOauthError(describeOAuthError(errorCode));
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const { fieldErrors, submitError, isSubmitting, run } = useZodSubmit(
    loginSchema,
    ({ username, pin }) => auth.login(username, pin),
    { onSuccess: () => router.replace('/') },
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    run({ username: username.trim(), pin });
  }

  return (
    <div className="bg-graticule relative flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div aria-hidden="true" className="bg-login-glow pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-sm rounded-md border border-ink-800 bg-ink-900 p-6 shadow-2xl sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandMark />
          <h1 className="font-display text-xl font-bold tracking-wide text-ink-50 uppercase">Shop Mgmt</h1>
          <p className="font-mono text-[11px] tracking-[0.18em] text-ink-500 uppercase">Parts counter workstation</p>
        </div>

        <div className="my-6 flex items-center justify-center gap-2">
          <span className="animate-skeleton h-1.5 w-1.5 rounded-full bg-positive-500" />
          <span className="font-mono text-[10px] tracking-[0.16em] text-ink-500 uppercase">Terminal ready</span>
        </div>

        {oauthError ? (
          <div className="mb-4 rounded-sm border border-accent-800 bg-accent-950 px-3 py-2 text-center">
            <FormError error={oauthError} />
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Username"
            autoComplete="username"
            autoFocus
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
            hint="4–6 digits"
            className="text-center font-mono tracking-[0.4em]"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            error={fieldErrors.pin}
          />

          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="mt-2 w-full">
            Sign in
          </Button>

          <div className="flex justify-center">
            <FormError error={submitError} />
          </div>
        </form>

        <SocialSignIn label="Sign in with" />

        <p className="mt-5 text-center text-xs text-ink-400">
          New here?{' '}
          <Link href="/register" className="font-medium text-accent-400 hover:text-accent-300 hover:underline">
            Create your shop
          </Link>
        </p>

        <p className="mt-6 text-center font-mono text-[10px] tracking-[0.14em] text-ink-600 uppercase">
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}
