import { daysBetween, type DateRange } from "./types";
import { getAllocatedSaleItems } from "./queries";

export interface DailyPoint {
  date: string; // yyyy-mm-dd (UTC)
  revenuePaise: number;
  profitPaise: number;
}

/** Daily revenue/profit series over the range, zero-filled for days with no sales. */
export async function getDailyRevenueSeries(range: DateRange): Promise<DailyPoint[]> {
  const items = await getAllocatedSaleItems(range);

  const byDay = new Map<string, { revenue: number; profit: number }>();
  for (const item of items) {
    const key = item.saleDate.toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { revenue: 0, profit: 0 };
    entry.revenue += item.netRevenuePaise;
    entry.profit += item.profitPaise;
    byDay.set(key, entry);
  }

  const days = daysBetween(range);
  const result: DailyPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(range.from.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { revenue: 0, profit: 0 };
    result.push({ date: key, revenuePaise: entry.revenue, profitPaise: entry.profit });
  }
  return result;
}
