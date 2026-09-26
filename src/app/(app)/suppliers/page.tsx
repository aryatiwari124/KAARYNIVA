import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SuppliersClient } from "@/components/suppliers/suppliers-client";

export default async function SuppliersPage() {
  const session = await auth();
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <SuppliersClient
      initialSuppliers={JSON.parse(JSON.stringify(suppliers))}
      role={session!.user.role}
    />
  );
}
