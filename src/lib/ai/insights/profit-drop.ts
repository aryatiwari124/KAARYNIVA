import { comparePeriods } from "@/lib/analytics/period-compare";
import { previousPeriod } from "@/lib/analytics/types";
import { paiseToRupees } from "@/lib/money";
import { generateGroundedInsight, type GroundedInsight } from "../generate";
import type { InsightResponse } from "../schemas";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

interface ProfitDropPayload {
  grossProfitRupees: number;
  grossProfitDeltaRupees: number;
  grossProfitDeltaPct: number | null;
  expenseRupees: number;
  expenseDeltaRupees: number;
  netProfitRupees: number;
  topDecliningProducts: { name: string; deltaRupees: number }[];
  topGrowingProducts: { name: string; deltaRupees: number }[];
}

export async function getProfitDropInsight(): Promise<GroundedInsight> {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const range = { from, to };
  const comparison = await comparePeriods(range, previousPeriod(range));

  const payload: ProfitDropPayload = {
    grossProfitRupees: paiseToRupees(comparison.current.grossProfitPaise),
    grossProfitDeltaRupees: paiseToRupees(comparison.profitDeltaPaise),
    grossProfitDeltaPct: comparison.profitDeltaPct !== null ? round1(comparison.profitDeltaPct * 100) : null,
    expenseRupees: paiseToRupees(comparison.current.expensePaise),
    expenseDeltaRupees: paiseToRupees(comparison.current.expensePaise - comparison.previous.expensePaise),
    netProfitRupees: paiseToRupees(comparison.current.netProfitPaise),
    topDecliningProducts: comparison.topDetractors.slice(0, 3).map((d) => ({
      name: d.name,
      deltaRupees: paiseToRupees(d.deltaPaise),
    })),
    topGrowingProducts: comparison.topContributors.slice(0, 3).map((c) => ({
      name: c.name,
      deltaRupees: paiseToRupees(c.deltaPaise),
    })),
  };

  return generateGroundedInsight({
    feature: "profit-drop",
    payload,
    instruction:
      "Explain what's driving the change in profit this period versus the previous one — is it revenue from specific products, or a change in expenses? Be specific about which factor matters most and name the products involved.",
    fallback: () => buildFallback(payload),
  });
}

function buildFallback(payload: ProfitDropPayload): InsightResponse {
  const isDown = payload.grossProfitDeltaRupees < 0;
  const decliner = payload.topDecliningProducts[0];
  return {
    headline: `Gross profit is ${isDown ? "down" : "up"} ₹${Math.abs(payload.grossProfitDeltaRupees).toLocaleString("en-IN")} vs. the previous period.`,
    body: [
      `Expenses moved by ₹${payload.expenseDeltaRupees.toLocaleString("en-IN")} over the same window.`,
      decliner
        ? `${decliner.name} was the biggest drag, down ₹${Math.abs(decliner.deltaRupees).toLocaleString("en-IN")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    citedFigures: [],
    severity: isDown ? "warning" : "positive",
  };
}
