export interface DateRange {
  from: string;
  to: string;
}

// Month boundaries are computed in UTC terms rather than the shop's IST wall clock:
// a few hours of skew at the very edge of a month is an acceptable trade-off for a
// "this month so far" summary window, and keeps this pure function deterministic
// regardless of the host time zone running it.
export function getCurrentMonthRange(now: Date): DateRange {
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  return { from: startOfMonth.toISOString(), to: now.toISOString() };
}

// A `<input type="date">` value ("YYYY-MM-DD") is UTC midnight of that day by itself,
// which would exclude the rest of that day from a `to` filter. This pushes it to the
// last instant of that UTC day so a "to" date filter is inclusive of the whole day.
export function endOfDayIso(dateOnlyString: string): string {
  return new Date(`${dateOnlyString}T23:59:59.999Z`).toISOString();
}
