import { describe, expect, it } from 'vitest';

import { describeOAuthError, readTokenFromHash } from './oauth';

describe('readTokenFromHash', () => {
  it('reads the token from a fragment', () => {
    expect(readTokenFromHash('#token=abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('reads the token when the leading hash is already stripped', () => {
    expect(readTokenFromHash('token=abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('decodes a percent-encoded token', () => {
    expect(readTokenFromHash('#token=abc%2Bdef')).toBe('abc+def');
  });

  it('picks the token out of a fragment carrying other values', () => {
    expect(readTokenFromHash('#state=xyz&token=abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('returns null for an empty fragment', () => {
    expect(readTokenFromHash('')).toBeNull();
  });

  it('returns null when the fragment has no token', () => {
    expect(readTokenFromHash('#state=xyz')).toBeNull();
  });

  it('returns null for a blank token', () => {
    expect(readTokenFromHash('#token=')).toBeNull();
  });
});

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
