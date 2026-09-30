import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CustomersClient } from "@/components/customers/customers-client";
import { InsightCard, type InsightCardProps } from "@/components/insights/insight-card";
import { getCustomerInsight } from "@/lib/ai/insights/customer";

export default async function CustomersPage() {
  const session = await auth();
  let customers: any[] = [];
  let customerInsight: InsightCardProps = {
    headline: "Customer Overview",
    body: "Track customer purchases and credit limits across your business.",
    citedFigures: [],
    severity: "info",
    source: "deterministic",
  };

  try {
    const [cust, insight] = await Promise.all([
      prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      getCustomerInsight(),
    ]);
    customers = cust;
    customerInsight = insight;
  } catch (err) {
    console.error("Customers DB query error:", err);
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <InsightCard {...customerInsight} />
      <CustomersClient
        initialCustomers={JSON.parse(JSON.stringify(customers))}
        role={session!.user.role}
      />
    </div>
  );
}
