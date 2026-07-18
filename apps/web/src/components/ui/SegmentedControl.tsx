interface SegmentedControlOption<Value extends string> {
  value: Value;
  label: string;
}

interface SegmentedControlProps<Value extends string> {
  label: string;
  options: SegmentedControlOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
}

export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<Value>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-9 items-center gap-0.5 rounded-sm border border-ink-700 bg-ink-900 p-0.5"
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={`h-full rounded-[3px] px-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
              isSelected ? 'bg-accent-500 text-ink-950' : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
