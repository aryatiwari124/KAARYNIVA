import { prisma } from "@/lib/prisma";

export interface DeadStockItem {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  stockQty: number;
  tiedUpCapitalPaise: number;
  lastSaleDate: Date | null;
  /** null = has never sold at all */
  daysSinceLastSale: number | null;
}

/**
 * Products still in stock with no sale in `thresholdDays`. One query per
 * product (find-latest-sale) — fine at kirana-shop catalog sizes (tens to
 * low hundreds of SKUs); would need a groupBy-max rewrite at larger scale.
 */
export async function getDeadStock(thresholdDays = 30, asOf = new Date()): Promise<DeadStockItem[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true, stockQty: { gt: 0 } },
  });

  const results: DeadStockItem[] = [];
  for (const p of products) {
    const lastSaleItem = await prisma.saleItem.findFirst({
      where: { productId: p.id, sale: { voidedAt: null } },
      orderBy: { sale: { saleDate: "desc" } },
      include: { sale: true },
    });
    const lastSaleDate = lastSaleItem?.sale.saleDate ?? null;
    const daysSinceLastSale = lastSaleDate
      ? Math.floor((asOf.getTime() - lastSaleDate.getTime()) / 86_400_000)
      : null;
    const isDead = daysSinceLastSale === null || daysSinceLastSale >= thresholdDays;

    if (isDead) {
      results.push({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        stockQty: p.stockQty,
        tiedUpCapitalPaise: p.stockQty * p.costPricePaise,
        lastSaleDate,
        daysSinceLastSale,
      });
    }
  }

  return results.sort((a, b) => b.tiedUpCapitalPaise - a.tiedUpCapitalPaise);
}
