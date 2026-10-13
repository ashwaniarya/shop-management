import { describe, expect, it } from 'vitest';

import { describeOAuthError } from './oauth';

describe('describeOAuthError', () => {
  it('returns null when there is no error code', () => {
    expect(describeOAuthError(null)).toBeNull();
  });

  it('explains a cancelled sign-in', () => {
    expect(describeOAuthError('access_denied')).toMatch(/cancelled/i);
  });

  it('explains an expired handshake', () => {
    expect(describeOAuthError('session_expired')).toMatch(/timed out/i);
  });

  // An unrecognised code must still produce something a user can read, never a blank.
  it('falls back to the generic message for an unknown code', () => {
    expect(describeOAuthError('something_unexpected')).toMatch(/could not complete sign-in/i);
  });
});
