import { getAllProductForecasts } from "@/lib/forecast";
import { generateGroundedInsight, type GroundedInsight } from "../generate";
import type { InsightResponse } from "../schemas";

interface RestockPayload {
  urgentProducts: { name: string; stockQty: number; daysUntilStockout: number; suggestedOrderQty: number }[];
  totalUrgentCount: number;
}

export async function getRestockInsight(): Promise<GroundedInsight> {
  const forecasts = await getAllProductForecasts();

  const withStockout = forecasts.filter((f) => f.stockout.daysUntilStockout !== null);
  const urgent = withStockout
    .sort((a, b) => a.stockout.daysUntilStockout! - b.stockout.daysUntilStockout!)
    .slice(0, 5)
    .map((f) => ({
      name: f.name,
      stockQty: f.stockQty,
      daysUntilStockout: f.stockout.daysUntilStockout!,
      suggestedOrderQty: f.reorder.suggestedOrderQtyUnits,
    }));

  const payload: RestockPayload = {
    urgentProducts: urgent,
    totalUrgentCount: withStockout.filter((f) => f.stockout.daysUntilStockout! <= 14).length,
  };

  return generateGroundedInsight({
    feature: "restock",
    payload,
    instruction:
      "Narrate the restock queue for the shop owner. Call out which product needs attention first, by when, and how much to order.",
    fallback: () => buildFallback(payload),
  });
}

function buildFallback(payload: RestockPayload): InsightResponse {
  if (payload.urgentProducts.length === 0) {
    return {
      headline: "Stock levels are healthy — nothing urgent to reorder.",
      body: "No products are projected to run out within the next two weeks.",
      citedFigures: [],
      severity: "positive",
    };
  }
  const top = payload.urgentProducts[0];
  return {
    headline: `${top.name} is projected to run out in ${top.daysUntilStockout} day(s).`,
    body: `${payload.totalUrgentCount} product(s) need restocking within two weeks. Order ${top.suggestedOrderQty} more units of ${top.name} to stay ahead of demand.`,
    citedFigures: [],
    severity: top.daysUntilStockout <= 7 ? "critical" : "warning",
  };
}
