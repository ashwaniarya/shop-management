'use client';

import { useEffect, useState } from 'react';

import type { OAuthProvider } from '@shop/shared';

import { buildOAuthStartUrl, listOAuthProviders } from '@/lib/api';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function ProviderMark({ providerId }: { providerId: string }) {
  return providerId === 'google' ? <GoogleMark /> : null;
}

// Renders nothing at all when no provider is configured, so a deployment without
// OAuth credentials shows the plain PIN form with no dead buttons.
export function SocialSignIn({ label }: { label: string }) {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);

  useEffect(() => {
    listOAuthProviders()
      .then((response) => setProviders(response.data))
      .catch(() => setProviders([]));
  }, []);

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-800" />
        <span className="font-mono text-[10px] tracking-[0.16em] text-ink-600 uppercase">or</span>
        <span className="h-px flex-1 bg-ink-800" />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {providers.map((provider) => (
          // A plain link, not a fetch: the browser must navigate to the provider for
          // the consent screen, and an XHR could not follow that redirect.
          <a
            key={provider.id}
            href={buildOAuthStartUrl(provider.id)}
            className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-sm border border-ink-700 bg-ink-850 text-base font-medium text-ink-100 transition-colors hover:border-ink-600 hover:bg-ink-800"
          >
            <ProviderMark providerId={provider.id} />
            {label} {provider.label}
          </a>
        ))}
      </div>
    </div>
  );
}
