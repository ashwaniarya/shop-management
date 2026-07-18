import { NotFoundError } from '../services/errors';

export function requireIdParam(raw: string, label = 'id'): number {
  if (!/^\d+$/.test(raw)) {
    throw new NotFoundError(`Invalid ${label} '${raw}'`);
  }
  return Number(raw);
}
