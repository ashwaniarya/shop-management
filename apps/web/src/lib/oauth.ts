// The API hands the session token back in the URL fragment rather than the query
// string, so it never reaches a server log, proxy or Referer header.
export function readTokenFromHash(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token');
  return token && token.trim() !== '' ? token : null;
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Sign-in was cancelled.',
  session_expired: 'That sign-in attempt timed out. Please try again.',
  provider_unavailable: 'That sign-in method is unavailable right now.',
  sign_in_failed: 'Could not complete sign-in. Please try again.',
};

export function describeOAuthError(code: string | null): string | null {
  if (!code) {
    return null;
  }
  return OAUTH_ERROR_MESSAGES[code] ?? OAUTH_ERROR_MESSAGES.sign_in_failed;
}
