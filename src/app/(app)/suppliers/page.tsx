import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SuppliersClient } from "@/components/suppliers/suppliers-client";

export default async function SuppliersPage() {
  const session = await auth();
  let suppliers: any[] = [];
  try {
    suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    console.error("Suppliers DB query error:", err);
  }

  return (
    <SuppliersClient
      initialSuppliers={JSON.parse(JSON.stringify(suppliers))}
      role={session!.user.role}
    />
  );
}
