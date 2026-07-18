import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';

import { Field } from './Field';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, id, className = '', children, ...rest },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  const select = (
    <div className="relative">
      <select
        ref={ref}
        id={selectId}
        className={`h-9 w-full appearance-none rounded-sm border bg-ink-900 py-0 pr-8 pl-2.5 text-sm text-ink-100 transition-colors hover:border-ink-600 focus:border-accent-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45 ${error ? 'border-accent-500' : 'border-ink-700'} ${className}`}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 8"
        className="pointer-events-none absolute top-1/2 right-2.5 h-2 w-3 -translate-y-1/2 text-ink-400"
      >
        <path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );

  if (!label) {
    return select;
  }

  return (
    <Field label={label} htmlFor={selectId} required={rest.required} error={error} hint={hint}>
      {select}
    </Field>
  );
});
