import { z } from 'zod';

// z.coerce.boolean() just runs the JS `Boolean(...)` cast, so the literal string
// "false" (being a non-empty string) coerces to `true`. Query strings need an
// explicit true/false mapping instead.
export const booleanQueryParam = z.enum(['true', 'false']).transform((value) => value === 'true');
