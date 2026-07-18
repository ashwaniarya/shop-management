'use client';

import { useState } from 'react';

import type { ZodError } from 'zod';

import { describeError } from '@/lib/describeError';
import { getFieldErrors } from '@/lib/zodFieldErrors';

// Structural stand-in for a zod schema: everything the submit flow touches, nothing
// more, so the hook stays out of zod's generic-variance weeds and any create/update
// schema pair infers cleanly.
export interface SchemaLike<Output> {
  safeParse(values: unknown): { success: true; data: Output } | { success: false; error: ZodError };
}

export type ParsedFormValues<Output> =
  | { ok: true; data: Output }
  | { ok: false; fieldErrors: Record<string, string> };

export function parseFormValues<Output>(schema: SchemaLike<Output>, formValues: unknown): ParsedFormValues<Output> {
  const parsed = schema.safeParse(formValues);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  return { ok: false, fieldErrors: getFieldErrors(parsed.error) };
}

export interface UseZodSubmitResult {
  fieldErrors: Record<string, string>;
  submitError: string | null;
  isSubmitting: boolean;
  run: (formValues: unknown) => void;
  reset: () => void;
}

// The one submit skeleton every form shares: safeParse → field errors inline, or
// submit → describeError on failure → pending flag cleared either way. Forms keep
// their own field state and JSX and call run(payload) from onSubmit (after
// preventDefault). Dual-mode create/edit forms instantiate this twice — once per
// schema/request pair — and pick the active instance, which keeps each submitFn
// typed against exactly the schema it belongs to.
export function useZodSubmit<Output, Result>(
  schema: SchemaLike<Output>,
  submitFn: (data: Output) => Promise<Result>,
  options: { onSuccess?: (result: Result) => void } = {},
): UseZodSubmitResult {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function run(formValues: unknown) {
    if (isSubmitting) {
      return;
    }
    setSubmitError(null);

    const parsed = parseFormValues(schema, formValues);
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    submitFn(parsed.data)
      .then((result) => options.onSuccess?.(result))
      .catch((error: unknown) => setSubmitError(describeError(error)))
      .finally(() => setIsSubmitting(false));
  }

  function reset() {
    setFieldErrors({});
    setSubmitError(null);
  }

  return { fieldErrors, submitError, isSubmitting, run, reset };
}
