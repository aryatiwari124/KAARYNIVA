import { prisma } from "@/lib/prisma";

export interface CustomerInsight {
  customerId: string;
  name: string;
  totalSpendPaise: number;
  orderCount: number;
  lastOrderDate: Date | null;
  daysSinceLastOrder: number | null;
  avgOrderValuePaise: number | null;
}

export async function getCustomerInsights(asOf = new Date()): Promise<CustomerInsight[]> {
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    include: { sales: { where: { voidedAt: null } } },
  });

  return customers
    .map((c) => {
      const orderCount = c.sales.length;
      const totalSpendPaise = c.sales.reduce((sum, s) => sum + s.totalPaise, 0);
      const lastOrderDate =
        orderCount > 0
          ? c.sales.reduce<Date>(
              (latest, s) => (s.saleDate > latest ? s.saleDate : latest),
              c.sales[0].saleDate
            )
          : null;
      const daysSinceLastOrder = lastOrderDate
        ? Math.floor((asOf.getTime() - lastOrderDate.getTime()) / 86_400_000)
        : null;
      const avgOrderValuePaise = orderCount > 0 ? Math.round(totalSpendPaise / orderCount) : null;

      return {
        customerId: c.id,
        name: c.name,
        totalSpendPaise,
        orderCount,
        lastOrderDate,
        daysSinceLastOrder,
        avgOrderValuePaise,
      };
    })
    .sort((a, b) => b.totalSpendPaise - a.totalSpendPaise);
}
