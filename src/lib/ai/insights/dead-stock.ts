import { getDeadStock } from "@/lib/analytics/dead-stock";
import { paiseToRupees } from "@/lib/money";
import { generateGroundedInsight, type GroundedInsight } from "../generate";
import type { InsightResponse } from "../schemas";

interface DeadStockPayload {
  totalTiedUpRupees: number;
  itemCount: number;
  items: { name: string; stockQty: number; tiedUpRupees: number; daysSinceLastSale: number | null }[];
}

export async function getDeadStockInsight(): Promise<GroundedInsight> {
  const items = await getDeadStock(30);

  const payload: DeadStockPayload = {
    totalTiedUpRupees: paiseToRupees(items.reduce((sum, i) => sum + i.tiedUpCapitalPaise, 0)),
    itemCount: items.length,
    items: items.slice(0, 5).map((i) => ({
      name: i.name,
      stockQty: i.stockQty,
      tiedUpRupees: paiseToRupees(i.tiedUpCapitalPaise),
      daysSinceLastSale: i.daysSinceLastSale,
    })),
  };

  return generateGroundedInsight({
    feature: "dead-stock",
    payload,
    instruction:
      "Point out which dead-stock items are costing the most in tied-up capital, and suggest one concrete action (e.g. a discount, a bundle, or returning it to the supplier).",
    fallback: () => buildFallback(payload),
  });
}

function buildFallback(payload: DeadStockPayload): InsightResponse {
  if (payload.itemCount === 0) {
    return {
      headline: "No dead stock right now.",
      body: "Every product in inventory has sold within the last 30 days.",
      citedFigures: [],
      severity: "positive",
    };
  }
  const top = payload.items[0];
  return {
    headline: `₹${payload.totalTiedUpRupees.toLocaleString("en-IN")} is tied up in ${payload.itemCount} slow-moving product(s).`,
    body: `${top.name} hasn't sold in ${top.daysSinceLastSale ?? "many"} days and has ₹${top.tiedUpRupees.toLocaleString("en-IN")} of stock sitting on the shelf. Consider a discount to clear it.`,
    citedFigures: [],
    severity: "warning",
  };
}
