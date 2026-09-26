import type { DemandPoint } from "./daily-demand";

/** How many trailing days feed the weighted moving average "level" estimate. */
export const WMA_WINDOW = 14;
/** Trend is estimated by comparing two adjacent windows of this size. */
export const TREND_WINDOW = 14;
/** Damping factor for the trend extrapolation — keeps long-horizon forecasts from running away. */
export const DAMPING_PHI = 0.85;

export interface ForecastModel {
  asOfDate: Date;
  /** Multiplicative day-of-week factors, index 0 = Sunday .. 6 = Saturday. 1 = no seasonality. */
  dowFactors: number[];
  /** Deseasonalized daily demand level as of asOfDate. */
  level: number;
  /** Deseasonalized daily demand change per day (damped when projected forward). */
  trendPerDay: number;
  /** Raw (seasonal) historical average — used for reference and safety-stock sizing. */
  avgDailyDemand: number;
  stdDevDailyDemand: number;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const variance = average(values.map((v) => (v - mean) ** 2));
  return Math.sqrt(variance);
}

function utcDow(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

/**
 * Multiplicative day-of-week factor per weekday = that weekday's historical
 * average / overall average. A weekday with zero observations (only possible
 * with under a week of data) falls back to a neutral 1 rather than 0.
 */
export function computeDowFactors(series: DemandPoint[]): number[] {
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  for (const pt of series) {
    const dow = utcDow(pt.date);
    sums[dow] += pt.quantity;
    counts[dow] += 1;
  }
  const overallAverage = average(series.map((p) => p.quantity));
  if (overallAverage === 0) return Array(7).fill(1);

  return sums.map((sum, dow) => {
    if (counts[dow] === 0) return 1;
    return sum / counts[dow] / overallAverage;
  });
}

/** Sum of phi^1 + phi^2 + ... + phi^h — the standard damped-trend point-forecast weight. */
export function dampedTrendSum(daysAhead: number, phi: number = DAMPING_PHI): number {
  if (daysAhead <= 0) return 0;
  if (phi === 1) return daysAhead;
  return (phi * (1 - Math.pow(phi, daysAhead))) / (1 - phi);
}

/**
 * Builds a forecast model from a product's daily demand history:
 *  1. Day-of-week factors capture weekly seasonality (e.g. weekend spikes).
 *  2. The series is deseasonalized by dividing out those factors.
 *  3. A recency-weighted moving average of the deseasonalized series gives
 *     the current "level".
 *  4. Trend is the average day-over-day change between the older and newer
 *     halves of the trend window on the deseasonalized series.
 * forecastDemandForDate then re-applies the day-of-week factor and damps
 * the trend so it doesn't extrapolate indefinitely.
 */
export function buildForecastModel(series: DemandPoint[]): ForecastModel {
  const rawQuantities = series.map((p) => p.quantity);
  const avgDailyDemand = average(rawQuantities);
  const stdDevDailyDemand = stdDev(rawQuantities, avgDailyDemand);

  if (series.length === 0) {
    return {
      asOfDate: new Date(),
      dowFactors: Array(7).fill(1),
      level: 0,
      trendPerDay: 0,
      avgDailyDemand: 0,
      stdDevDailyDemand: 0,
    };
  }

  const dowFactors = computeDowFactors(series);
  const deseasonalized = series.map((pt) => {
    const factor = dowFactors[utcDow(pt.date)] || 1;
    return { date: pt.date, value: pt.quantity / factor };
  });

  const recentWindow = deseasonalized.slice(-WMA_WINDOW);
  const weights = recentWindow.map((_, i) => i + 1); // older=1 .. newest=N
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const level = recentWindow.reduce((sum, pt, i) => sum + pt.value * weights[i], 0) / weightSum;

  const trendSlice = deseasonalized.slice(-(TREND_WINDOW * 2));
  let trendPerDay = 0;
  if (trendSlice.length === TREND_WINDOW * 2) {
    const older = trendSlice.slice(0, TREND_WINDOW);
    const recent = trendSlice.slice(TREND_WINDOW);
    trendPerDay = (average(recent.map((p) => p.value)) - average(older.map((p) => p.value))) / TREND_WINDOW;
  }

  const asOfDate = new Date(series[series.length - 1].date + "T00:00:00Z");

  return { asOfDate, dowFactors, level, trendPerDay, avgDailyDemand, stdDevDailyDemand };
}

/** Forecasts demand for a specific future date (must be after model.asOfDate). */
export function forecastDemandForDate(model: ForecastModel, targetDate: Date): number {
  const daysAhead = Math.round((targetDate.getTime() - model.asOfDate.getTime()) / 86_400_000);
  if (daysAhead <= 0) return 0;

  const deseasonalizedForecast = Math.max(0, model.level + model.trendPerDay * dampedTrendSum(daysAhead));
  const dow = targetDate.getUTCDay();
  const factor = model.dowFactors[dow] ?? 1;
  return Math.max(0, deseasonalizedForecast * factor);
}
