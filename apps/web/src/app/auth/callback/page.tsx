'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useAuth } from '@/context/AuthContext';
import { readTokenFromHash } from '@/lib/oauth';

// Landing spot for the API's post-consent redirect. The token arrives in the URL
// fragment, so it is only ever visible to this page's own JavaScript.
export default function OAuthCallbackPage() {
  const router = useRouter();
  const { adoptToken } = useAuth();
  const [hasFailed, setHasFailed] = useState(false);

  // React runs effects twice in dev StrictMode; the token is stripped from the URL on
  // the first pass, so without this guard the second pass would see nothing and error.
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    if (hasHandledCallback.current) {
      return;
    }
    hasHandledCallback.current = true;

    const token = readTokenFromHash(window.location.hash);
    if (!token) {
      router.replace('/login?error=sign_in_failed');
      return;
    }

    // Drop the token from the address bar before anything else, so it cannot be
    // bookmarked, shared, or left in browser history.
    window.history.replaceState(null, '', window.location.pathname);

    adoptToken(token)
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
