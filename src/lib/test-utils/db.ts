import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

let counter = 0;

export async function createTestProduct(overrides: Partial<Prisma.ProductUncheckedCreateInput> = {}) {
  counter += 1;
  return prisma.product.create({
    data: {
      sku: `TEST-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 6)}`,
      name: "Test Product",
      unit: "pc",
      costPricePaise: 10000,
      sellingPricePaise: 15000,
      reorderPoint: 0,
      stockQty: 0,
      ...overrides,
    },
  });
}

/**
 * Deletes a test product along with every Sale/Purchase/ledger row that
 * references it. Safe to call more than once with the same id (e.g. a
 * shared `let productId` across multiple `it()` blocks in one describe) —
 * it's a silent no-op if the product is already gone.
 */
export async function cleanupTestProduct(productId: string) {
  const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!exists) return;

  const sales = await prisma.sale.findMany({
    where: { items: { some: { productId } } },
    select: { id: true },
  });
  if (sales.length) {
    await prisma.sale.deleteMany({ where: { id: { in: sales.map((s) => s.id) } } });
  }

  const purchases = await prisma.purchase.findMany({
    where: { items: { some: { productId } } },
    select: { id: true },
  });
  if (purchases.length) {
    await prisma.purchase.deleteMany({ where: { id: { in: purchases.map((p) => p.id) } } });
  }

  await prisma.stockLedgerEntry.deleteMany({ where: { productId } });
  await prisma.product.delete({ where: { id: productId } }).catch(() => {});
}
