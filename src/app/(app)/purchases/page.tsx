import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PurchasesClient } from "@/components/purchases/purchases-client";

export default async function PurchasesPage() {
  const session = await auth();
  let purchases: any[] = [];
  try {
    purchases = await prisma.purchase.findMany({
      include: { supplier: true, items: true },
      orderBy: { purchaseDate: "desc" },
      take: 100,
    });
  } catch (err) {
    console.error("Purchases DB query error:", err);
  }

  return (
    <PurchasesClient
      initialPurchases={JSON.parse(JSON.stringify(purchases))}
      role={session!.user.role}
    />
  );
}
