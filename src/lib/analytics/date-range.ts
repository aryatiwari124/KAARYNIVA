import type { DateRange } from "./types";

/** Parses ?from=&to= query params into a DateRange, defaulting to the trailing N days ending now. */
export function parseRangeParams(searchParams: URLSearchParams, defaultDays = 30): DateRange {
  const toParam = searchParams.get("to");
  const fromParam = searchParams.get("from");
  const to = toParam ? new Date(toParam) : new Date();
  const from = fromParam ? new Date(fromParam) : new Date(to.getTime() - defaultDays * 86_400_000);
  return { from, to };
}
