import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CustomersClient } from "@/components/customers/customers-client";
import { InsightCard } from "@/components/insights/insight-card";
import { getCustomerInsight } from "@/lib/ai/insights/customer";

export default async function CustomersPage() {
  const [session, customers, customerInsight] = await Promise.all([
    auth(),
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getCustomerInsight(),
  ]);

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
