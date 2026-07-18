import type { VehicleMake, VehicleModel } from '@shop/shared';

// VehicleMake carries no vehicleClassId of its own (only VehicleModel links a make to
// a class), so "makes available for this class" has to be derived from which makes
// have at least one model in that class. With no class chosen, every make is a
// candidate (a fitment can be class + make with no model).
export function filterMakesForClass(
  makes: VehicleMake[],
  models: VehicleModel[],
  vehicleClassId: number | null,
): VehicleMake[] {
  if (vehicleClassId === null) {
    return makes;
  }
  const makeIdsInClass = new Set(
    models.filter((model) => model.vehicleClassId === vehicleClassId).map((model) => model.vehicleMakeId),
  );
  return makes.filter((make) => makeIdsInClass.has(make.id));
}

export function filterModelsForSelection(
  models: VehicleModel[],
  vehicleClassId: number | null,
  vehicleMakeId: number | null,
): VehicleModel[] {
  return models.filter(
    (model) =>
      (vehicleClassId === null || model.vehicleClassId === vehicleClassId) &&
      (vehicleMakeId === null || model.vehicleMakeId === vehicleMakeId),
  );
}
