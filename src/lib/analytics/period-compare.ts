import { prisma } from "@/lib/prisma";
import type { DateRange } from "./types";
import { getRevenueSummary, type RevenueSummary } from "./revenue";
import { getAllocatedSaleItems, type AllocatedSaleItem } from "./queries";

export interface ProductDelta {
  productId: string;
  name: string;
  sku: string;
  currentRevenuePaise: number;
  previousRevenuePaise: number;
  deltaPaise: number;
}

export interface PeriodComparison {
  current: RevenueSummary;
  previous: RevenueSummary;
  revenueDeltaPaise: number;
  revenueDeltaPct: number | null;
  profitDeltaPaise: number;
  profitDeltaPct: number | null;
  /** Products that grew revenue the most, largest first. */
  topContributors: ProductDelta[];
  /** Products that lost the most revenue, biggest decline first. */
  topDetractors: ProductDelta[];
}

function sumRevenueByProduct(items: AllocatedSaleItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.productId, (map.get(item.productId) ?? 0) + item.netRevenuePaise);
  }
  return map;
}

export async function comparePeriods(
  current: DateRange,
  previous: DateRange
): Promise<PeriodComparison> {
  const [currentSummary, previousSummary, currentItems, previousItems] = await Promise.all([
    getRevenueSummary(current),
    getRevenueSummary(previous),
    getAllocatedSaleItems(current),
    getAllocatedSaleItems(previous),
  ]);

  const currentByProduct = sumRevenueByProduct(currentItems);
  const previousByProduct = sumRevenueByProduct(previousItems);
  const productIds = [...new Set([...currentByProduct.keys(), ...previousByProduct.keys()])];

  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const deltas: ProductDelta[] = productIds.map((id) => {
    const cur = currentByProduct.get(id) ?? 0;
    const prev = previousByProduct.get(id) ?? 0;
    const product = productMap.get(id);
    return {
      productId: id,
      name: product?.name ?? "Unknown product",
      sku: product?.sku ?? "—",
      currentRevenuePaise: cur,
      previousRevenuePaise: prev,
      deltaPaise: cur - prev,
    };
  });

  const topContributors = deltas
    .filter((d) => d.deltaPaise > 0)
    .sort((a, b) => b.deltaPaise - a.deltaPaise)
    .slice(0, 5);
  const topDetractors = deltas
    .filter((d) => d.deltaPaise < 0)
    .sort((a, b) => a.deltaPaise - b.deltaPaise)
    .slice(0, 5);

  const revenueDeltaPaise = currentSummary.revenuePaise - previousSummary.revenuePaise;
  const revenueDeltaPct =
    previousSummary.revenuePaise > 0 ? revenueDeltaPaise / previousSummary.revenuePaise : null;

  const profitDeltaPaise = currentSummary.grossProfitPaise - previousSummary.grossProfitPaise;
  const profitDeltaPct =
    previousSummary.grossProfitPaise !== 0
      ? profitDeltaPaise / Math.abs(previousSummary.grossProfitPaise)
      : null;

  return {
    current: currentSummary,
    previous: previousSummary,
    revenueDeltaPaise,
    revenueDeltaPct,
    profitDeltaPaise,
    profitDeltaPct,
    topContributors,
    topDetractors,
  };
}
