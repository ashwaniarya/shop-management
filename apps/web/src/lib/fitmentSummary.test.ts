import { describe, expect, it } from 'vitest';

import type { PartFitmentExpanded } from '@/lib/api';

import { summarizeFitments } from './fitmentSummary';

function buildFitment(
  overrides: Partial<PartFitmentExpanded> & Pick<PartFitmentExpanded, 'vehicleClassName'>,
): PartFitmentExpanded {
  return {
    id: 1,
    partId: 1,
    vehicleClassId: 1,
    vehicleMakeId: null,
    vehicleModelId: null,
    notes: null,
    vehicleMakeName: null,
    vehicleModelName: null,
    ...overrides,
  };
}

describe('summarizeFitments', () => {
  it('reports "All vehicles" for an empty fitment list', () => {
    expect(summarizeFitments([])).toBe('All vehicles');
  });

  it('joins class, make and model for a single fitment', () => {
    const fitment = buildFitment({ vehicleClassName: 'Tractor', vehicleMakeName: 'Mahindra', vehicleModelName: 'Mahindra 575 DI' });
    expect(summarizeFitments([fitment])).toBe('Tractor · Mahindra · Mahindra 575 DI');
  });

  it('omits the make and model segments when the fitment does not carry them', () => {
    const fitment = buildFitment({ vehicleClassName: 'Tractor' });
    expect(summarizeFitments([fitment])).toBe('Tractor');
  });

  it('shows the first fitment plus a count of the rest when there are several', () => {
    const fitments = [
      buildFitment({ vehicleClassName: 'Tractor', vehicleMakeName: 'Mahindra' }),
      buildFitment({ vehicleClassName: 'Tractor', vehicleMakeName: 'Ford' }),
      buildFitment({ vehicleClassName: 'Passenger', vehicleMakeName: 'Maruti Suzuki' }),
    ];
    expect(summarizeFitments(fitments)).toBe('Tractor · Mahindra +2 more');
  });
});
