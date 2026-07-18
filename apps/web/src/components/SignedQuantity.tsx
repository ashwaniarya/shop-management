import { formatQuantity } from '@/lib/format';

export function SignedQuantity({ value }: { value: number }) {
  const isNegative = value < 0;
  return (
    <span className={`font-mono tabular-nums ${isNegative ? 'text-accent-400' : 'text-positive-300'}`}>
      {isNegative ? '' : '+'}
      {formatQuantity(value)}
    </span>
  );
}
