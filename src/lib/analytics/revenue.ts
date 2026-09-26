import { prisma } from "@/lib/prisma";
import type { DateRange } from "./types";

export interface RevenueSummary {
  revenuePaise: number;
  cogsPaise: number;
  grossProfitPaise: number;
  grossMarginPct: number | null;
  expensePaise: number;
  netProfitPaise: number;
  netMarginPct: number | null;
  orderCount: number;
  avgOrderValuePaise: number | null;
}

/**
 * Revenue/COGS/profit for non-voided sales in [range.from, range.to), plus
 * expenses in the same window rolled into net profit. Discounts are already
 * baked into Sale.totalPaise, so summing totalPaise is the correct revenue
 * figure. COGS uses each SaleItem's unitCostPaise snapshot — never the
 * product's current cost — so this figure never drifts after the fact.
 */
export async function getRevenueSummary(range: DateRange): Promise<RevenueSummary> {
  const sales = await prisma.sale.findMany({
    where: { voidedAt: null, saleDate: { gte: range.from, lt: range.to } },
    include: { items: true },
  });

  const revenuePaise = sales.reduce((sum, sale) => sum + sale.totalPaise, 0);
  const cogsPaise = sales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity * item.unitCostPaise, 0),
    0
  );
  const grossProfitPaise = revenuePaise - cogsPaise;
  const grossMarginPct = revenuePaise > 0 ? grossProfitPaise / revenuePaise : null;

  const expenseAgg = await prisma.expense.aggregate({
    _sum: { amountPaise: true },
    where: { date: { gte: range.from, lt: range.to } },
  });
  const expensePaise = expenseAgg._sum.amountPaise ?? 0;
  const netProfitPaise = grossProfitPaise - expensePaise;
  const netMarginPct = revenuePaise > 0 ? netProfitPaise / revenuePaise : null;

  const orderCount = sales.length;
  const avgOrderValuePaise = orderCount > 0 ? Math.round(revenuePaise / orderCount) : null;

  return {
    revenuePaise,
    cogsPaise,
    grossProfitPaise,
    grossMarginPct,
    expensePaise,
    netProfitPaise,
    netMarginPct,
    orderCount,
    avgOrderValuePaise,
  };
}
