import { forwardRef, useId, type InputHTMLAttributes } from 'react';

import { Field } from './Field';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const baseInputClasses =
  'h-9 w-full rounded-sm border border-ink-700 bg-ink-900 px-2.5 text-sm text-ink-100 placeholder:text-ink-500 transition-colors hover:border-ink-600 focus:border-accent-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = '', ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const input = (
    <input
      ref={ref}
      id={inputId}
      className={`${baseInputClasses} ${error ? 'border-accent-500' : ''} ${className}`}
      aria-invalid={error ? true : undefined}
      {...rest}
    />
  );

  if (!label) {
    return input;
  }

  return (
    <Field label={label} htmlFor={inputId} required={rest.required} error={error} hint={hint}>
      {input}
    </Field>
  );
});
