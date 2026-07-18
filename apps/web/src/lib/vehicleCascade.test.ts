import { describe, expect, it } from 'vitest';

import type { VehicleMake, VehicleModel } from '@shop/shared';

import { filterMakesForClass, filterModelsForSelection } from './vehicleCascade';

function buildMake(id: number, name: string): VehicleMake {
  return { id, name, isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
}

function buildModel(id: number, vehicleMakeId: number, vehicleClassId: number, name: string): VehicleModel {
  return {
    id,
    vehicleMakeId,
    vehicleClassId,
    name,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const TRACTOR = 1;
const PASSENGER = 2;
const MAHINDRA = 10;
const FORD = 11;
const MARUTI = 12;

const makes = [buildMake(MAHINDRA, 'Mahindra'), buildMake(FORD, 'Ford'), buildMake(MARUTI, 'Maruti Suzuki')];
const models = [
  buildModel(100, MAHINDRA, TRACTOR, 'Mahindra 575 DI'),
  buildModel(101, FORD, TRACTOR, 'Ford 3600'),
  buildModel(102, MARUTI, PASSENGER, 'Maruti Suzuki Swift'),
];

describe('filterMakesForClass', () => {
  it('returns every make when no class is selected', () => {
    expect(filterMakesForClass(makes, models, null)).toEqual(makes);
  });

  it('narrows to makes with at least one model in the selected class', () => {
    expect(filterMakesForClass(makes, models, TRACTOR)).toEqual([buildMake(MAHINDRA, 'Mahindra'), buildMake(FORD, 'Ford')]);
  });

  it('returns an empty list when no make has a model in the selected class', () => {
    expect(filterMakesForClass(makes, models, 999)).toEqual([]);
  });
});

describe('filterModelsForSelection', () => {
  it('returns every model when neither class nor make is selected', () => {
    expect(filterModelsForSelection(models, null, null)).toEqual(models);
  });

  it('filters by class only', () => {
    expect(filterModelsForSelection(models, TRACTOR, null)).toEqual([models[0], models[1]]);
  });

  it('filters by class and make together', () => {
    expect(filterModelsForSelection(models, TRACTOR, FORD)).toEqual([models[1]]);
  });
});
