import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SalesClient } from "@/components/sales/sales-client";

export default async function SalesPage() {
  const session = await auth();
  let sales: any[] = [];
  try {
    sales = await prisma.sale.findMany({
      include: { customer: true, items: true },
      orderBy: { saleDate: "desc" },
      take: 100,
    });
  } catch (err) {
    console.error("Sales DB query error:", err);
  }

  return (
    <SalesClient initialSales={JSON.parse(JSON.stringify(sales))} role={session!.user.role} />
  );
}
