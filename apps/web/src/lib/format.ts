const SHOP_TIME_ZONE = 'Asia/Kolkata';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: SHOP_TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: SHOP_TIME_ZONE,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return currencyFormatter.format(value);
}

export function formatQuantity(value: number): string {
  return quantityFormatter.format(value);
}

export function formatDate(isoDateString: string): string {
  return dateFormatter.format(new Date(isoDateString));
}

export function formatDateTime(isoDateString: string): string {
  return dateTimeFormatter.format(new Date(isoDateString));
}

const RELATIVE_TIME_STEPS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en-IN', { style: 'narrow', numeric: 'always' });

export function formatRelativeTime(isoDateString: string, now: Date = new Date()): string {
  const elapsedMs = now.getTime() - new Date(isoDateString).getTime();
  if (elapsedMs < 45 * 1000) {
    return 'just now';
  }

  for (const { unit, ms } of RELATIVE_TIME_STEPS) {
    const elapsedUnits = Math.floor(elapsedMs / ms);
    if (elapsedUnits >= 1) {
      return relativeTimeFormatter.format(-elapsedUnits, unit);
    }
  }
  return relativeTimeFormatter.format(-Math.round(elapsedMs / (60 * 1000)), 'minute');
}
