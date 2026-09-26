import type { ForecastModel } from "./model";
import { forecastDemandForDate } from "./model";

export interface StockoutDayProjection {
  date: string;
  forecastDemand: number;
  projectedStock: number;
}

export interface StockoutProjection {
  /** yyyy-mm-dd of the first day stock is projected to hit zero, or null if it survives the horizon. */
  stockoutDate: string | null;
  daysUntilStockout: number | null;
  dailyProjection: StockoutDayProjection[];
}

export function projectStockout(
  model: ForecastModel,
  currentStock: number,
  horizonDays = 30
): StockoutProjection {
  if (currentStock <= 0) {
    return {
      stockoutDate: model.asOfDate.toISOString().slice(0, 10),
      daysUntilStockout: 0,
      dailyProjection: [],
    };
  }

  let remaining = currentStock;
  let stockoutDate: string | null = null;
  let daysUntilStockout: number | null = null;
  const dailyProjection: StockoutDayProjection[] = [];

  for (let h = 1; h <= horizonDays; h++) {
    const date = new Date(model.asOfDate.getTime() + h * 86_400_000);
    const demand = forecastDemandForDate(model, date);
    const rawRemaining = remaining - demand;
    remaining = Math.max(0, rawRemaining);

    const dateStr = date.toISOString().slice(0, 10);
    dailyProjection.push({ date: dateStr, forecastDemand: demand, projectedStock: remaining });

    if (stockoutDate === null && rawRemaining <= 0) {
      stockoutDate = dateStr;
      daysUntilStockout = h;
    }
  }

  return { stockoutDate, daysUntilStockout, dailyProjection };
}
