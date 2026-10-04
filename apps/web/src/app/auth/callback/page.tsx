'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useAuth } from '@/context/AuthContext';
import { exchangeOAuthSession } from '@/lib/api';

// Landing spot for the API's post-consent redirect. The URL carries nothing: the session
// waits in a short-lived HttpOnly cookie that only this page's POST can claim, so a
// crafted link to this page cannot sign anyone in to someone else's account.
export default function OAuthCallbackPage() {
  const router = useRouter();
  const { adoptToken } = useAuth();
  const [hasFailed, setHasFailed] = useState(false);

  // React runs effects twice in dev StrictMode; the exchange clears the cookie on the
  // first pass, so without this guard the second pass would get a 401 and error.
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    if (hasHandledCallback.current) {
      return;
    }
    hasHandledCallback.current = true;

    exchangeOAuthSession()
      .then(adoptToken)
      .then(() => router.replace('/'))
      .catch(() => {
        setHasFailed(true);
        router.replace('/login?error=sign_in_failed');
      });
  }, [adoptToken, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <LoadingBlock label={hasFailed ? 'Sign-in failed — redirecting…' : 'Signing you in…'} />
    </div>
  );
}
