import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProductsClient } from "@/components/products/products-client";

export default async function ProductsPage() {
  const session = await auth();
  let products: any[] = [];
  try {
    products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    console.error("Products DB query error:", err);
  }

  return (
    <ProductsClient
      initialProducts={JSON.parse(JSON.stringify(products))}
      role={session!.user.role}
    />
  );
}
