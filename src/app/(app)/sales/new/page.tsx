import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SaleForm } from "@/components/sales/sale-form";

export default async function NewSalePage() {
  const session = await auth();
  let products: any[] = [];
  let customers: any[] = [];
  try {
    const [p, c] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ]);
    products = p;
    customers = c;
  } catch (err) {
    console.error("NewSale DB query error:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">New sale</h1>
        <p className="text-ink-muted mt-1 text-sm">Record items sold and payment received.</p>
      </div>
      <SaleForm
        products={JSON.parse(JSON.stringify(products))}
        customers={JSON.parse(JSON.stringify(customers))}
        role={session!.user.role}
      />
    </div>
  );
}
