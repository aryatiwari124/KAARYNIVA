import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProductsClient } from "@/components/products/products-client";

export default async function ProductsPage() {
  const session = await auth();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <ProductsClient
      initialProducts={JSON.parse(JSON.stringify(products))}
      role={session!.user.role}
    />
  );
}
