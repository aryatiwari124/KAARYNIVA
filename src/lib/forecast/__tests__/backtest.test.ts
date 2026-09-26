import { describe, it, expect } from "vitest";
import { backtestSeries } from "../backtest";
import type { DemandPoint } from "../daily-demand";

function series(start: string, quantities: number[]): DemandPoint[] {
  const startDate = new Date(start + "T00:00:00Z");
  return quantities.map((quantity, i) => {
    const d = new Date(startDate.getTime() + i * 86_400_000);
    return { date: d.toISOString().slice(0, 10), quantity };
  });
}

describe("backtestSeries", () => {
  it("reports zero MAPE when the held-out days exactly match a flat trained model", () => {
    // 14 flat training days + 4 flat test days -> model forecasts exactly 10 every day.
    const s = series("2099-01-01", [...Array(14).fill(10), ...Array(4).fill(10)]);
    const result = backtestSeries(s, 4);

    expect(result.n).toBe(4);
    expect(result.mape).toBeCloseTo(0, 10);
  });

  it("computes MAPE with the hand-calculated formula against a flat forecast", () => {
    // Train on 14 flat days of 10 -> model forecasts exactly 10 for every future day.
    // Test actuals: [10, 10, 20, 5].
    // MAPE = mean(|10-10|/10, |10-10|/10, |20-10|/20, |5-10|/5)
    //      = mean(0, 0, 0.5, 1) = 0.375
    const s = series("2099-02-01", [...Array(14).fill(10), 10, 10, 20, 5]);
    const result = backtestSeries(s, 4);

    expect(result.n).toBe(4);
    expect(result.mape).toBeCloseTo(0.375, 10);
    expect(result.predictions.map((p) => p.forecast)).toEqual([10, 10, 10, 10]);
    expect(result.predictions.map((p) => p.actual)).toEqual([10, 10, 20, 5]);
  });

  it("excludes zero-actual days from MAPE to avoid division by zero", () => {
    const s = series("2099-03-01", [...Array(14).fill(10), 0, 10]);
    const result = backtestSeries(s, 2);

    // Only the second test day (actual=10) counts; forecast is 10 -> error 0.
    expect(result.n).toBe(1);
    expect(result.mape).toBeCloseTo(0, 10);
  });

  it("returns a null result when there isn't enough history for the requested test window", () => {
    const s = series("2099-04-01", Array(5).fill(10));
    const result = backtestSeries(s, 14);
    expect(result.mape).toBeNull();
    expect(result.n).toBe(0);
    expect(result.predictions).toEqual([]);
  });
});
