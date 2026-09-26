import { prisma } from "@/lib/prisma";
import { getProductVelocity } from "@/lib/analytics/velocity";
import { paiseToRupees } from "@/lib/money";
import { generateGroundedInsight, type GroundedInsight } from "../generate";
import type { InsightResponse } from "../schemas";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export interface PriceChangeSimulation {
  productName: string;
  currentPriceRupees: number;
  newPriceRupees: number;
  estimatedUnitsPerMonth: number;
  currentMonthlyRevenueRupees: number;
  projectedMonthlyRevenueRupees: number;
  currentMonthlyProfitRupees: number;
  projectedMonthlyProfitRupees: number;
}

/**
 * All arithmetic here is deterministic — the AI layer only narrates these
 * pre-computed numbers. Assumes unit volume holds steady at its trailing
 * 30-day rate; it does not model price elasticity of demand.
 */
export async function simulatePriceChange(
  productId: string,
  newPriceRupees: number
): Promise<PriceChangeSimulation | null> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return null;

  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const velocity = await getProductVelocity({ from, to });
  const row = velocity.find((v) => v.productId === productId);
  const estimatedUnitsPerMonth = row ? Math.round(row.velocityPerDay * 30) : 0;

  const currentPriceRupees = paiseToRupees(product.sellingPricePaise);
  const costPriceRupees = paiseToRupees(product.costPricePaise);

  return {
    productName: product.name,
    currentPriceRupees,
    newPriceRupees,
    estimatedUnitsPerMonth,
    currentMonthlyRevenueRupees: round2(estimatedUnitsPerMonth * currentPriceRupees),
    projectedMonthlyRevenueRupees: round2(estimatedUnitsPerMonth * newPriceRupees),
    currentMonthlyProfitRupees: round2(estimatedUnitsPerMonth * (currentPriceRupees - costPriceRupees)),
    projectedMonthlyProfitRupees: round2(estimatedUnitsPerMonth * (newPriceRupees - costPriceRupees)),
  };
}

export async function getWhatIfInsight(
  productId: string,
  newPriceRupees: number
): Promise<GroundedInsight | null> {
  const sim = await simulatePriceChange(productId, newPriceRupees);
  if (!sim) return null;

  return generateGroundedInsight({
    feature: "what-if",
    payload: sim,
    instruction:
      "Narrate the projected impact of this price change, assuming the same sales volume continues. Make clear this is an estimate that assumes demand doesn't change with price.",
    fallback: () => buildFallback(sim),
  });
}

function buildFallback(sim: PriceChangeSimulation): InsightResponse {
  const profitDelta = sim.projectedMonthlyProfitRupees - sim.currentMonthlyProfitRupees;
  const direction = sim.newPriceRupees >= sim.currentPriceRupees ? "raising" : "lowering";
  return {
    headline: `${direction === "raising" ? "Raising" : "Lowering"} ${sim.productName} to ₹${sim.newPriceRupees} could ${profitDelta >= 0 ? "add" : "cost"} ₹${Math.abs(profitDelta).toLocaleString("en-IN")}/month in profit.`,
    body: `At ${sim.estimatedUnitsPerMonth} units/month (current pace), monthly profit would move from ₹${sim.currentMonthlyProfitRupees.toLocaleString("en-IN")} to ₹${sim.projectedMonthlyProfitRupees.toLocaleString("en-IN")} — assuming volume holds steady.`,
    citedFigures: [],
    severity: profitDelta >= 0 ? "positive" : "warning",
  };
}
