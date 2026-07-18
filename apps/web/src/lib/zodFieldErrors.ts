import type { ZodError } from 'zod';

// First issue per field only: good enough for inline form errors, and avoids
// stacking multiple messages under one input when a value fails more than one rule.
export function getFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? '_form';
    if (!(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
