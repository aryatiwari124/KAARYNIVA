import { comparePeriods } from "@/lib/analytics/period-compare";
import { previousPeriod } from "@/lib/analytics/types";
import { getDeadStock } from "@/lib/analytics/dead-stock";
import { getProductVelocity } from "@/lib/analytics/velocity";
import { paiseToRupees } from "@/lib/money";
import { generateGroundedInsight, type GroundedInsight } from "../generate";
import type { InsightResponse } from "../schemas";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

interface BriefingPayload {
  revenueRupees: number;
  revenueDeltaPct: number | null;
  grossProfitRupees: number;
  netProfitRupees: number;
  orderCount: number;
  topGrowth: { name: string; deltaRupees: number }[];
  topDecline: { name: string; deltaRupees: number }[];
  deadStockCount: number;
  deadStockValueRupees: number;
  lowStockCount: number;
}

export async function getBriefingInsight(): Promise<GroundedInsight> {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const range = { from, to };
  const comparison = await comparePeriods(range, previousPeriod(range));
  const deadStock = await getDeadStock(30);
  const velocity = await getProductVelocity(range);
  const lowStockCount = velocity.filter((v) => v.belowReorderPoint).length;

  const payload: BriefingPayload = {
    revenueRupees: paiseToRupees(comparison.current.revenuePaise),
    revenueDeltaPct: comparison.revenueDeltaPct !== null ? round1(comparison.revenueDeltaPct * 100) : null,
    grossProfitRupees: paiseToRupees(comparison.current.grossProfitPaise),
    netProfitRupees: paiseToRupees(comparison.current.netProfitPaise),
    orderCount: comparison.current.orderCount,
    topGrowth: comparison.topContributors.slice(0, 3).map((c) => ({
      name: c.name,
      deltaRupees: paiseToRupees(c.deltaPaise),
    })),
    topDecline: comparison.topDetractors.slice(0, 3).map((d) => ({
      name: d.name,
      deltaRupees: paiseToRupees(d.deltaPaise),
    })),
    deadStockCount: deadStock.length,
    deadStockValueRupees: paiseToRupees(deadStock.reduce((s, d) => s + d.tiedUpCapitalPaise, 0)),
    lowStockCount,
  };

  return generateGroundedInsight({
    feature: "briefing",
    payload,
    instruction:
      "Write a short morning briefing for the shop owner. Highlight the single most important thing they should know today — strong growth, a concerning decline, profitability, or an inventory issue — and back it with the relevant figure(s).",
    fallback: () => buildFallback(payload),
  });
}

function buildFallback(payload: BriefingPayload): InsightResponse {
  const deltaText =
    payload.revenueDeltaPct !== null
      ? `${payload.revenueDeltaPct >= 0 ? "up" : "down"} ${Math.abs(payload.revenueDeltaPct)}%`
      : "flat";
  const bodyParts = [
    `Gross profit stands at ₹${payload.grossProfitRupees.toLocaleString("en-IN")} across ${payload.orderCount} orders.`,
    payload.lowStockCount > 0
      ? `${payload.lowStockCount} product(s) are running low on stock.`
      : "Stock levels look healthy.",
    payload.deadStockCount > 0
      ? `₹${payload.deadStockValueRupees.toLocaleString("en-IN")} is tied up in ${payload.deadStockCount} slow-moving product(s).`
      : "",
  ].filter(Boolean);

  return {
    headline: `Revenue is ₹${payload.revenueRupees.toLocaleString("en-IN")} over the last 30 days, ${deltaText}.`,
    body: bodyParts.join(" "),
    citedFigures: [],
    severity: payload.revenueDeltaPct !== null && payload.revenueDeltaPct < 0 ? "warning" : "info",
  };
}
