import { prisma } from "@/lib/prisma";
import type { DateRange } from "./types";
import { getAllocatedSaleItems } from "./queries";

export type RankMetric = "revenue" | "profit" | "quantity";

export interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  quantitySold: number;
  revenuePaise: number;
  profitPaise: number;
}

export async function getTopProducts(
  range: DateRange,
  opts?: { by?: RankMetric; limit?: number }
): Promise<TopProduct[]> {
  const by = opts?.by ?? "revenue";
  const limit = opts?.limit ?? 10;

  const items = await getAllocatedSaleItems(range);
  if (items.length === 0) return [];

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const agg = new Map<string, TopProduct>();
  for (const item of items) {
    const product = productMap.get(item.productId);
    const existing = agg.get(item.productId) ?? {
      productId: item.productId,
      name: product?.name ?? "Unknown product",
      sku: product?.sku ?? "—",
      quantitySold: 0,
      revenuePaise: 0,
      profitPaise: 0,
    };
    existing.quantitySold += item.quantity;
    existing.revenuePaise += item.netRevenuePaise;
    existing.profitPaise += item.profitPaise;
    agg.set(item.productId, existing);
  }

  const list = [...agg.values()];
  list.sort((a, b) => {
    if (by === "quantity") return b.quantitySold - a.quantitySold;
    if (by === "profit") return b.profitPaise - a.profitPaise;
    return b.revenuePaise - a.revenuePaise;
  });
  return list.slice(0, limit);
}
