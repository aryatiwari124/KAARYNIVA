import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordPurchase, voidPurchase } from "../purchases";
import { recordSale } from "../sales";
import { InsufficientStockError } from "@/lib/inventory/stock";
import { createTestProduct, cleanupTestProduct } from "@/lib/test-utils/db";

describe("recordPurchase", () => {
  let productId: string;

  afterEach(async () => {
    if (productId) await cleanupTestProduct(productId);
  });

  it("increases stock and refreshes the product's last-known cost", async () => {
    const product = await createTestProduct({ stockQty: 5, costPricePaise: 8000 });
    productId = product.id;

    const purchase = await recordPurchase({
      items: [{ productId, quantity: 10, unitCostPaise: 9500 }],
    });

    expect(purchase.subtotalPaise).toBe(95000);
    expect(purchase.totalPaise).toBe(95000);
    expect(purchase.paymentStatus).toBe("PAID");

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(updated.stockQty).toBe(15);
    expect(updated.costPricePaise).toBe(9500);
  });

  it("derives UNPAID/PARTIAL payment status", async () => {
    const product = await createTestProduct({ stockQty: 0 });
    productId = product.id;

    const unpaid = await recordPurchase({
      items: [{ productId, quantity: 5, unitCostPaise: 1000 }],
      amountPaidPaise: 0,
    });
    expect(unpaid.paymentStatus).toBe("UNPAID");
  });
});

describe("voidPurchase", () => {
  let productId: string;

  afterEach(async () => {
    if (productId) await cleanupTestProduct(productId);
  });

  it("reverses the stock it added", async () => {
    const product = await createTestProduct({ stockQty: 0 });
    productId = product.id;

    const purchase = await recordPurchase({ items: [{ productId, quantity: 10, unitCostPaise: 1000 }] });
    await voidPurchase(purchase.id);

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(updated.stockQty).toBe(0);
  });

  it("blocks voiding a purchase whose stock has already been sold onward", async () => {
    const product = await createTestProduct({ stockQty: 0 });
    productId = product.id;

    const purchase = await recordPurchase({ items: [{ productId, quantity: 10, unitCostPaise: 1000 }] });
    await recordSale({ items: [{ productId, quantity: 8, unitPricePaise: 2000 }] });

    // Only 2 units remain; voiding needs to remove 10 — must fail, not go negative.
    await expect(voidPurchase(purchase.id)).rejects.toThrow(InsufficientStockError);

    const unchanged = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(unchanged.stockQty).toBe(2);
  });
});
