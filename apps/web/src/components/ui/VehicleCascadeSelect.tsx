'use client';

import type { VehicleClass, VehicleMake, VehicleModel } from '@shop/shared';

import { filterMakesForClass, filterModelsForSelection } from '@/lib/vehicleCascade';

import { Select } from './Select';

export interface VehicleCascadeValue {
  classId: number | null;
  makeId: number | null;
  modelId: number | null;
}

interface VehicleCascadeSelectProps {
  idPrefix: string;
  vehicleClasses: VehicleClass[];
  vehicleMakes: VehicleMake[];
  vehicleModels: VehicleModel[];
  value: VehicleCascadeValue;
  onChange: (value: VehicleCascadeValue) => void;
  classRequired?: boolean;
}

function toIdOrNull(rawValue: string): number | null {
  return rawValue === '' ? null : Number(rawValue);
}

// Class -> make -> model, each level filtered by the one above it (lib/vehicleCascade)
// and reset whenever an upstream level changes, mirroring the fitment ladder rule that
// a model always implies its make and a make's models always belong to one class.
export function VehicleCascadeSelect({
  idPrefix,
  vehicleClasses,
  vehicleMakes,
  vehicleModels,
  value,
  onChange,
  classRequired = false,
}: VehicleCascadeSelectProps) {
  const availableMakes = filterMakesForClass(vehicleMakes, vehicleModels, value.classId);
  const availableModels = filterModelsForSelection(vehicleModels, value.classId, value.makeId);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Select
        label="Vehicle class"
        id={`${idPrefix}-class`}
        required={classRequired}
        value={value.classId ?? ''}
        onChange={(event) => onChange({ classId: toIdOrNull(event.target.value), makeId: null, modelId: null })}
      >
        {classRequired ? <option value="">Select a class…</option> : <option value="">Any class</option>}
        {vehicleClasses.map((vehicleClass) => (
          <option key={vehicleClass.id} value={vehicleClass.id}>
            {vehicleClass.name}
          </option>
        ))}
      </Select>

      <Select
        label="Make"
        id={`${idPrefix}-make`}
        disabled={value.classId === null}
        value={value.makeId ?? ''}
        onChange={(event) => onChange({ classId: value.classId, makeId: toIdOrNull(event.target.value), modelId: null })}
      >
        <option value="">Any make</option>
        {availableMakes.map((make) => (
          <option key={make.id} value={make.id}>
            {make.name}
          </option>
        ))}
      </Select>

      <Select
        label="Model"
        id={`${idPrefix}-model`}
        disabled={value.makeId === null}
        value={value.modelId ?? ''}
        onChange={(event) =>
          onChange({ classId: value.classId, makeId: value.makeId, modelId: toIdOrNull(event.target.value) })
        }
      >
        <option value="">Any model</option>
        {availableModels.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
