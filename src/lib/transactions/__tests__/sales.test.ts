import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordSale, voidSale } from "../sales";
import { TransactionInputError } from "../errors";
import { InsufficientStockError } from "@/lib/inventory/stock";
import { createTestProduct, cleanupTestProduct } from "@/lib/test-utils/db";

describe("recordSale", () => {
  let productId: string;

  afterEach(async () => {
    if (productId) await cleanupTestProduct(productId);
  });

  it("computes subtotal/discount/total and decrements stock", async () => {
    const product = await createTestProduct({
      stockQty: 20,
      costPricePaise: 10000,
      sellingPricePaise: 15000,
    });
    productId = product.id;

    const sale = await recordSale({
      items: [{ productId, quantity: 3, unitPricePaise: 15000 }],
      discountPaise: 1000,
    });

    expect(sale.subtotalPaise).toBe(45000);
    expect(sale.discountPaise).toBe(1000);
    expect(sale.totalPaise).toBe(44000);
    expect(sale.amountPaidPaise).toBe(44000); // defaults to full payment
    expect(sale.paymentStatus).toBe("PAID");
    expect(sale.items[0].unitCostPaise).toBe(10000);

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(updated.stockQty).toBe(17);
  });

  it("derives PARTIAL and UNPAID payment status from amountPaid", async () => {
    const product = await createTestProduct({ stockQty: 20 });
    productId = product.id;

    const partial = await recordSale({
      items: [{ productId, quantity: 2, unitPricePaise: 5000 }],
      amountPaidPaise: 4000,
    });
    expect(partial.paymentStatus).toBe("PARTIAL");

    const unpaid = await recordSale({
      items: [{ productId, quantity: 1, unitPricePaise: 5000 }],
      amountPaidPaise: 0,
    });
    expect(unpaid.paymentStatus).toBe("UNPAID");
  });

  it("snapshots COGS at sale time — later cost changes never retroactively alter it", async () => {
    const product = await createTestProduct({ stockQty: 10, costPricePaise: 10000 });
    productId = product.id;

    const sale = await recordSale({ items: [{ productId, quantity: 1, unitPricePaise: 15000 }] });
    await prisma.product.update({ where: { id: productId }, data: { costPricePaise: 99999 } });

    const reloaded = await prisma.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: { items: true },
    });
    expect(reloaded.items[0].unitCostPaise).toBe(10000);
  });

  it("rejects and persists nothing when stock is insufficient", async () => {
    const product = await createTestProduct({ stockQty: 2 });
    productId = product.id;

    await expect(
      recordSale({ items: [{ productId, quantity: 5, unitPricePaise: 1000 }] })
    ).rejects.toThrow(InsufficientStockError);

    const unchanged = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(unchanged.stockQty).toBe(2);

    const sales = await prisma.sale.findMany({ where: { items: { some: { productId } } } });
    expect(sales).toHaveLength(0);
  });

  it("auto-generates unique sequential invoice numbers", async () => {
    const product = await createTestProduct({ stockQty: 20 });
    productId = product.id;

    const s1 = await recordSale({ items: [{ productId, quantity: 1, unitPricePaise: 1000 }] });
    const s2 = await recordSale({ items: [{ productId, quantity: 1, unitPricePaise: 1000 }] });

    expect(s1.invoiceNo).toMatch(/^INV-\d{5}$/);
    expect(s2.invoiceNo).not.toBe(s1.invoiceNo);
  });

  it("prevents concurrent oversell of the same product", async () => {
    const product = await createTestProduct({ stockQty: 10 });
    productId = product.id;

    const results = await Promise.allSettled([
      recordSale({ items: [{ productId, quantity: 6, unitPricePaise: 1000 }] }),
      recordSale({ items: [{ productId, quantity: 6, unitPricePaise: 1000 }] }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const finalProduct = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(finalProduct.stockQty).toBe(4); // 10 - one successful sale of 6
  });
});

describe("voidSale", () => {
  let productId: string;

  afterEach(async () => {
    if (productId) await cleanupTestProduct(productId);
  });

  it("restores stock and marks the sale voided", async () => {
    const product = await createTestProduct({ stockQty: 10 });
    productId = product.id;

    const sale = await recordSale({ items: [{ productId, quantity: 4, unitPricePaise: 1000 }] });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQty).toBe(6);

    const voided = await voidSale(sale.id, "customer return");
    expect(voided.voidedAt).not.toBeNull();
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQty).toBe(10);
  });

  it("cannot be voided twice", async () => {
    const product = await createTestProduct({ stockQty: 10 });
    productId = product.id;

    const sale = await recordSale({ items: [{ productId, quantity: 2, unitPricePaise: 1000 }] });
    await voidSale(sale.id);
    await expect(voidSale(sale.id)).rejects.toThrow(TransactionInputError);
  });
});
