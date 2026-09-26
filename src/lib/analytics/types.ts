/** Half-open date range: includes `from`, excludes `to`. */
export interface DateRange {
  from: Date;
  to: Date;
}

export function daysBetween(range: DateRange): number {
  return Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000));
}

export function previousPeriod(range: DateRange): DateRange {
  const spanMs = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - spanMs), to: new Date(range.from.getTime()) };
}
