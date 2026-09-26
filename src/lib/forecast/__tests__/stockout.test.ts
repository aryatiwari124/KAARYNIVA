import { describe, it, expect } from "vitest";
import { projectStockout } from "../stockout";
import type { ForecastModel } from "../model";

function flatModel(dailyDemand: number, asOfDate = new Date("2099-01-01T00:00:00Z")): ForecastModel {
  return {
    asOfDate,
    dowFactors: Array(7).fill(1),
    level: dailyDemand,
    trendPerDay: 0,
    avgDailyDemand: dailyDemand,
    stdDevDailyDemand: 0,
  };
}

describe("projectStockout", () => {
  it("projects the exact stockout day for constant demand dividing stock evenly", () => {
    const model = flatModel(5);
    const result = projectStockout(model, 20, 30); // 20 / 5 = exactly 4 days
    expect(result.daysUntilStockout).toBe(4);
    expect(result.stockoutDate).toBe("2099-01-05");
    expect(result.dailyProjection[3].projectedStock).toBe(0);
    expect(result.dailyProjection[0].projectedStock).toBe(15);
  });

  it("rounds up to the day stock first hits zero when it doesn't divide evenly", () => {
    const model = flatModel(3);
    const result = projectStockout(model, 10, 30); // 10,7,4,1,-2 -> hits <=0 on day 4
    expect(result.daysUntilStockout).toBe(4);
  });

  it("reports no stockout within the horizon when stock comfortably outlasts it", () => {
    const model = flatModel(1);
    const result = projectStockout(model, 1000, 30);
    expect(result.stockoutDate).toBeNull();
    expect(result.daysUntilStockout).toBeNull();
    expect(result.dailyProjection).toHaveLength(30);
  });

  it("treats zero or negative current stock as already stocked out today", () => {
    const model = flatModel(5);
    const result = projectStockout(model, 0, 30);
    expect(result.daysUntilStockout).toBe(0);
    expect(result.stockoutDate).toBe("2099-01-01");
  });

  it("never lets projected stock go negative in the output", () => {
    const model = flatModel(50);
    const result = projectStockout(model, 10, 5);
    result.dailyProjection.forEach((day) => expect(day.projectedStock).toBeGreaterThanOrEqual(0));
  });
});
