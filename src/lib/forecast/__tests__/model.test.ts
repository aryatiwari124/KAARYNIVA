import { describe, it, expect } from "vitest";
import {
  computeDowFactors,
  buildForecastModel,
  forecastDemandForDate,
  dampedTrendSum,
  DAMPING_PHI,
} from "../model";
import type { DemandPoint } from "../daily-demand";

function series(start: string, quantities: number[]): DemandPoint[] {
  const startDate = new Date(start + "T00:00:00Z");
  return quantities.map((quantity, i) => {
    const d = new Date(startDate.getTime() + i * 86_400_000);
    return { date: d.toISOString().slice(0, 10), quantity };
  });
}

describe("dampedTrendSum", () => {
  it("matches the closed-form geometric sum phi + phi^2 + ... + phi^h", () => {
    const phi = 0.85;
    const manual = phi + phi ** 2 + phi ** 3;
    expect(dampedTrendSum(3, phi)).toBeCloseTo(manual, 10);
  });

  it("returns 0 for zero or negative horizons", () => {
    expect(dampedTrendSum(0)).toBe(0);
    expect(dampedTrendSum(-5)).toBe(0);
  });
});

describe("computeDowFactors", () => {
  it("gives every day factor 1 for perfectly flat demand", () => {
    // 2099-08-03 is a Monday (UTC) — 4 full weeks, constant quantity 5.
    const s = series("2099-08-03", Array(28).fill(5));
    const factors = computeDowFactors(s);
    factors.forEach((f) => expect(f).toBeCloseTo(1, 10));
  });

  it("assigns a >1 factor to a day that consistently sells more", () => {
    // Sunday (dow 0) always sells 20, every other day sells 10.
    // 2099-08-02 is a Sunday (UTC).
    const quantities = Array.from({ length: 28 }, (_, i) => (i % 7 === 0 ? 20 : 10));
    const s = series("2099-08-02", quantities);
    const factors = computeDowFactors(s);
    // overall average = (20 + 10*6)/7 = 80/7 ≈ 11.43; Sunday factor = 20/11.43 ≈ 1.75
    expect(factors[0]).toBeCloseTo(20 / (80 / 7), 6);
    expect(factors[1]).toBeCloseTo(10 / (80 / 7), 6);
  });
});

describe("buildForecastModel + forecastDemandForDate", () => {
  it("forecasts a flat series at its own flat level with no trend", () => {
    const s = series("2099-08-03", Array(56).fill(4));
    const model = buildForecastModel(s);

    expect(model.trendPerDay).toBeCloseTo(0, 6);
    expect(model.level).toBeCloseTo(4, 6);

    const nextDay = new Date(model.asOfDate.getTime() + 86_400_000);
    expect(forecastDemandForDate(model, nextDay)).toBeCloseTo(4, 6);
  });

  it("projects a clear upward trend forward, damped", () => {
    // Each 7-day week holds a constant value, stepping up by 7 week-over-week:
    // week1=1, week2=8, week3=15, week4=22. Every day-of-week bucket then sees
    // the identical [1,8,15,22] sequence, so dowFactors come out exactly 1 —
    // this isolates the trend estimate from day-of-week aliasing.
    const quantities = [1, 8, 15, 22].flatMap((v) => Array(7).fill(v));
    const s = series("2099-09-01", quantities);
    const model = buildForecastModel(s);

    model.dowFactors.forEach((f) => expect(f).toBeCloseTo(1, 10));

    // Older half avg (days 1-14: seven 1s, seven 8s) = 4.5
    // Recent half avg (days 15-28: seven 15s, seven 22s) = 18.5
    // trendPerDay = (18.5 - 4.5) / 14 = 1
    expect(model.trendPerDay).toBeCloseTo(1, 6);

    const oneDayAhead = new Date(model.asOfDate.getTime() + 86_400_000);
    const forecast1 = forecastDemandForDate(model, oneDayAhead);
    expect(forecast1).toBeCloseTo(model.level + model.trendPerDay * DAMPING_PHI, 6);

    // Damping means day 10 isn't level + 10*trend — it's strictly less than
    // the naive (undamped) linear extrapolation.
    const tenDaysAhead = new Date(model.asOfDate.getTime() + 10 * 86_400_000);
    const forecast10 = forecastDemandForDate(model, tenDaysAhead);
    const naiveLinear = model.level + model.trendPerDay * 10;
    expect(forecast10).toBeLessThan(naiveLinear);
    expect(forecast10).toBeCloseTo(model.level + model.trendPerDay * dampedTrendSum(10), 6);
  });

  it("never forecasts negative demand even with a strong downward trend", () => {
    const quantities = Array.from({ length: 28 }, (_, i) => Math.max(0, 20 - i));
    const s = series("2099-10-01", quantities);
    const model = buildForecastModel(s);

    const farAhead = new Date(model.asOfDate.getTime() + 60 * 86_400_000);
    expect(forecastDemandForDate(model, farAhead)).toBeGreaterThanOrEqual(0);
  });

  it("returns 0 for a target date at or before asOfDate", () => {
    const s = series("2099-08-03", Array(28).fill(4));
    const model = buildForecastModel(s);
    expect(forecastDemandForDate(model, model.asOfDate)).toBe(0);
    expect(forecastDemandForDate(model, new Date(model.asOfDate.getTime() - 86_400_000))).toBe(0);
  });

  it("handles an empty series without throwing", () => {
    const model = buildForecastModel([]);
    expect(model.level).toBe(0);
    expect(model.trendPerDay).toBe(0);
    expect(model.dowFactors).toEqual(Array(7).fill(1));
  });
});
