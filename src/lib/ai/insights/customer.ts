import { getCustomerInsights } from "@/lib/analytics/customers";
import { paiseToRupees } from "@/lib/money";
import { generateGroundedInsight, type GroundedInsight } from "../generate";
import type { InsightResponse } from "../schemas";

interface CustomerInsightPayload {
  atRiskCustomers: { name: string; totalSpendRupees: number; daysSinceLastOrder: number }[];
  bestCustomers: { name: string; totalSpendRupees: number; orderCount: number }[];
}

export async function getCustomerInsight(): Promise<GroundedInsight> {
  const customers = await getCustomerInsights();

  const atRisk = customers
    .filter((c) => c.daysSinceLastOrder !== null && c.daysSinceLastOrder > 30 && c.totalSpendPaise > 0)
    .sort((a, b) => b.totalSpendPaise - a.totalSpendPaise)
    .slice(0, 3);

  const best = [...customers].sort((a, b) => b.totalSpendPaise - a.totalSpendPaise).slice(0, 3);

  const payload: CustomerInsightPayload = {
    atRiskCustomers: atRisk.map((c) => ({
      name: c.name,
      totalSpendRupees: paiseToRupees(c.totalSpendPaise),
      daysSinceLastOrder: c.daysSinceLastOrder!,
    })),
    bestCustomers: best.map((c) => ({
      name: c.name,
      totalSpendRupees: paiseToRupees(c.totalSpendPaise),
      orderCount: c.orderCount,
    })),
  };

  return generateGroundedInsight({
    feature: "customer",
    payload,
    instruction:
      "Highlight any high-value customers who haven't ordered in a while and are worth a personal follow-up, and call out the top customer overall by spend.",
    fallback: () => buildFallback(payload),
  });
}

function buildFallback(payload: CustomerInsightPayload): InsightResponse {
  const top = payload.bestCustomers[0];
  const risk = payload.atRiskCustomers[0];
  const bodyParts = [
    top ? `${top.name} is your top customer with ₹${top.totalSpendRupees.toLocaleString("en-IN")} spent across ${top.orderCount} orders.` : "",
    risk
      ? `${risk.name} hasn't ordered in ${risk.daysSinceLastOrder} days despite ₹${risk.totalSpendRupees.toLocaleString("en-IN")} in lifetime spend — worth a check-in.`
      : "",
  ].filter(Boolean);

  return {
    headline: risk ? `${risk.name} may be at risk of churning.` : "Your customer base looks healthy.",
    body: bodyParts.join(" ") || "No customer data available yet.",
    citedFigures: [],
    severity: risk ? "warning" : "info",
  };
}
