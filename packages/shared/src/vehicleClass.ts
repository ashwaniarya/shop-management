import { z } from 'zod';

export const vehicleClassSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  displayOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VehicleClass = z.infer<typeof vehicleClassSchema>;

export const vehicleClassCreateSchema = z.object({
  name: z.string().min(1, 'name must not be empty'),
  displayOrder: z.number().int().optional(),
});
export type VehicleClassCreate = z.infer<typeof vehicleClassCreateSchema>;

export const vehicleClassUpdateSchema = vehicleClassCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type VehicleClassUpdate = z.infer<typeof vehicleClassUpdateSchema>;
