import { existsSync } from 'node:fs';
import path from 'node:path';

// __dirname is apps/api/src under tsx (dev) and apps/api/dist once tsc builds it;
// both sit exactly one level under apps/api, so the repo root is three levels up
// either way, and this same relative path resolves under both. The second
// candidate is a defensive fallback in case that mirroring ever changes (e.g. this
// file moves into a subdirectory of src/dist).
export function resolveOpenApiPath(): string {
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'openapi.yaml'),
    path.join(__dirname, '..', '..', '..', '..', 'openapi.yaml'),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Could not locate openapi.yaml. Tried: ${candidates.join(', ')}`);
  }
  return found;
}
