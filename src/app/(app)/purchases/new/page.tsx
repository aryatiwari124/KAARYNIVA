import { prisma } from "@/lib/prisma";
import { PurchaseForm } from "@/components/purchases/purchase-form";

export default async function NewPurchasePage() {
  let products: any[] = [];
  let suppliers: any[] = [];
  try {
    const [p, s] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ]);
    products = p;
    suppliers = s;
  } catch (err) {
    console.error("NewPurchase DB query error:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">New purchase</h1>
        <p className="text-ink-muted mt-1 text-sm">Record stock received from a supplier.</p>
      </div>
      <PurchaseForm
        products={JSON.parse(JSON.stringify(products))}
        suppliers={JSON.parse(JSON.stringify(suppliers))}
      />
    </div>
  );
}
