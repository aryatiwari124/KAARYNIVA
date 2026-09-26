import { describe, it, expect } from "vitest";
import { recommendReorder } from "../reorder";
import { dampedTrendSum } from "../model";
import type { ForecastModel } from "../model";

function model(overrides: Partial<ForecastModel> = {}): ForecastModel {
  return {
    asOfDate: new Date("2099-01-01T00:00:00Z"),
    dowFactors: Array(7).fill(1),
    level: 10,
    trendPerDay: 0,
    avgDailyDemand: 10,
    stdDevDailyDemand: 2,
    ...overrides,
  };
}

describe("recommendReorder", () => {
  it("matches the hand-calculated (Q,R) formula with defaults", () => {
    // leadTimeDays=7, z=1.65, reviewCycleDays=14 (all defaults), no trend.
    // safetyStock = 1.65 * 2 * sqrt(7) = 8.730979...
    // reorderPoint = 10*7 + 8.730979 = 78.730979 -> rounds to 79
    // orderUpTo = 10*(7+14) + 8.730979 = 218.730979
    // suggestedOrderQty = round(218.730979 - currentStock=50) = 169
    const result = recommendReorder(model(), 50);

    const expectedSafetyStock = 1.65 * 2 * Math.sqrt(7);
    expect(result.safetyStockUnits).toBeCloseTo(expectedSafetyStock, 6);
    expect(result.reorderPointUnits).toBe(79);
    expect(result.suggestedOrderQtyUnits).toBe(169);
    expect(result.projectedDailyDemand).toBeCloseTo(10, 6); // no trend
  });

  it("blends in a damped trend contribution at the lead-time midpoint", () => {
    const result = recommendReorder(model({ trendPerDay: 1 }), 50, { leadTimeDays: 7 });
    const midLeadTime = 4; // Math.round(7/2)
    const expected = 10 + 1 * (dampedTrendSum(midLeadTime) / midLeadTime);
    expect(result.projectedDailyDemand).toBeCloseTo(expected, 6);
  });

  it("never suggests a negative order quantity when stock already exceeds the target", () => {
    const result = recommendReorder(model(), 10_000);
    expect(result.suggestedOrderQtyUnits).toBe(0);
  });

  it("respects custom lead time and service level overrides", () => {
    const defaultResult = recommendReorder(model(), 50);
    const shorterLeadTime = recommendReorder(model(), 50, { leadTimeDays: 3 });
    const higherService = recommendReorder(model(), 50, { serviceLevelZ: 2.33 });

    expect(shorterLeadTime.reorderPointUnits).toBeLessThan(defaultResult.reorderPointUnits);
    expect(higherService.safetyStockUnits).toBeGreaterThan(defaultResult.safetyStockUnits);
  });
});
