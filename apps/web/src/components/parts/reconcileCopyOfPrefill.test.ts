import { describe, expect, it } from 'vitest';

import type { CopyOfPartSelection } from './CopyOfPartPicker';
import { reconcileCopyOfPrefill } from './reconcileCopyOfPrefill';

const fetched: CopyOfPartSelection = { id: 3677, sku: 'STM-BSH-575DI', name: 'Starter Motor - Mahindra 575 DI' };

describe('reconcileCopyOfPrefill', () => {
  it('replaces the matching id-only placeholder with the fetched sku and name', () => {
    expect(reconcileCopyOfPrefill({ id: 3677, sku: '#3677', name: '' }, fetched)).toEqual(fetched);
  });

  it('stays null when the user cleared the link while the fetch was in flight', () => {
    expect(reconcileCopyOfPrefill(null, fetched)).toBeNull();
  });

  it('keeps the user re-pick when its id differs from the fetched part', () => {
    const repicked: CopyOfPartSelection = { id: 4001, sku: 'ALT-BSH-241', name: 'Alternator - Bosch 24V' };
    expect(reconcileCopyOfPrefill(repicked, fetched)).toBe(repicked);
  });
});
