import { prisma } from "@/lib/prisma";

export interface DemandPoint {
  date: string; // yyyy-mm-dd (UTC)
  quantity: number;
}

/** Units sold per day for one product over the trailing `days`, zero-filled. */
export async function getDailyDemandSeries(
  productId: string,
  days: number,
  asOf = new Date()
): Promise<DemandPoint[]> {
  const to = new Date(asOf);
  const from = new Date(to.getTime() - days * 86_400_000);

  const items = await prisma.saleItem.findMany({
    where: { productId, sale: { voidedAt: null, saleDate: { gte: from, lt: to } } },
    select: { quantity: true, sale: { select: { saleDate: true } } },
  });

  const byDay = new Map<string, number>();
  for (const item of items) {
    const key = item.sale.saleDate.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + item.quantity);
  }

  const result: DemandPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, quantity: byDay.get(key) ?? 0 });
  }
  return result;
}
