import { prisma } from "@/lib/prisma";
import { daysBetween, type DateRange } from "./types";

export interface ProductVelocity {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  stockQty: number;
  reorderPoint: number;
  unitsSoldInRange: number;
  velocityPerDay: number;
  /** null = no sales in range, so cover is effectively infinite */
  daysOfCover: number | null;
  belowReorderPoint: boolean;
}

/** Units sold per day and implied days-of-cover for every active product. */
export async function getProductVelocity(range: DateRange): Promise<ProductVelocity[]> {
  const products = await prisma.product.findMany({ where: { isActive: true } });
  const days = daysBetween(range);

  const grouped = await prisma.saleItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    where: { sale: { voidedAt: null, saleDate: { gte: range.from, lt: range.to } } },
  });
  const soldMap = new Map(grouped.map((g) => [g.productId, g._sum.quantity ?? 0]));

  return products.map((p) => {
    const unitsSoldInRange = soldMap.get(p.id) ?? 0;
    const velocityPerDay = unitsSoldInRange / days;
    const daysOfCover = velocityPerDay > 0 ? p.stockQty / velocityPerDay : null;
    return {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      stockQty: p.stockQty,
      reorderPoint: p.reorderPoint,
      unitsSoldInRange,
      velocityPerDay,
      daysOfCover,
      belowReorderPoint: p.stockQty <= p.reorderPoint,
    };
  });
}
