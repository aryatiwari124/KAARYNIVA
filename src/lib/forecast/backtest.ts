import type { DemandPoint } from "./daily-demand";
import { buildForecastModel, forecastDemandForDate } from "./model";

export interface BacktestPrediction {
  date: string;
  actual: number;
  forecast: number;
}

export interface BacktestResult {
  /** Mean absolute percentage error over days with nonzero actual demand; null if none. */
  mape: number | null;
  /** Number of days included in the MAPE (actual > 0). */
  n: number;
  predictions: BacktestPrediction[];
}

/**
 * Fixed-origin backtest: fits the model once on everything before the test
 * window, then forecasts the whole window in one shot and compares to what
 * actually happened. Simpler than a rolling-origin (re-fit-every-day)
 * backtest and cheap enough to run on demand; it slightly favors the near
 * end of the test window since the model doesn't get to update mid-window.
 */
export function backtestSeries(series: DemandPoint[], testDays = 14): BacktestResult {
  if (series.length <= testDays) {
    return { mape: null, n: 0, predictions: [] };
  }

  const trainSeries = series.slice(0, series.length - testDays);
  const testSeries = series.slice(series.length - testDays);
  const model = buildForecastModel(trainSeries);

  const predictions: BacktestPrediction[] = testSeries.map((pt) => {
    const date = new Date(pt.date + "T00:00:00Z");
    return { date: pt.date, actual: pt.quantity, forecast: forecastDemandForDate(model, date) };
  });

  const withActual = predictions.filter((p) => p.actual > 0);
  const mape =
    withActual.length > 0
      ? withActual.reduce((sum, p) => sum + Math.abs(p.actual - p.forecast) / p.actual, 0) /
        withActual.length
      : null;

  return { mape, n: withActual.length, predictions };
}
