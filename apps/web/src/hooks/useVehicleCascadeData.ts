'use client';

import { useCallback } from 'react';

import type { VehicleClass, VehicleMake, VehicleModel } from '@shop/shared';

import { listVehicleClasses, listVehicleMakes, listVehicleModels } from '@/lib/api';

import { useAsync } from './useAsync';

interface UseVehicleCascadeDataResult {
  vehicleClasses: VehicleClass[];
  vehicleMakes: VehicleMake[];
  vehicleModels: VehicleModel[];
  isLoading: boolean;
  error: unknown;
}

interface CascadeData {
  vehicleClasses: VehicleClass[];
  vehicleMakes: VehicleMake[];
  vehicleModels: VehicleModel[];
}

// The class/make/model ladder is small (a handful of rows at each level in this
// catalog), so it is fetched in full once and cascaded client-side (see
// lib/vehicleCascade.ts) rather than round-tripping to the server on every selection.
export function useVehicleCascadeData(): UseVehicleCascadeDataResult {
  const fetcher = useCallback(
    (): Promise<CascadeData> =>
      Promise.all([
        listVehicleClasses({ limit: 100 }),
        listVehicleMakes({ limit: 100 }),
        listVehicleModels({ limit: 100 }),
      ]).then(([classesPage, makesPage, modelsPage]) => ({
        vehicleClasses: classesPage.data,
        vehicleMakes: makesPage.data,
        vehicleModels: modelsPage.data,
      })),
    [],
  );
  const { data, isLoading, error } = useAsync(fetcher);

  return {
    vehicleClasses: data?.vehicleClasses ?? [],
    vehicleMakes: data?.vehicleMakes ?? [],
    vehicleModels: data?.vehicleModels ?? [],
    isLoading,
    error,
  };
}
