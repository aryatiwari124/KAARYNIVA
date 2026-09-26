import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordSale } from "@/lib/transactions/sales";
import { createTestProduct, cleanupTestProduct } from "@/lib/test-utils/db";
import { getCustomerInsights } from "../customers";

const ASOF = new Date("2099-05-01T00:00:00Z");

describe("getCustomerInsights", () => {
  let productId: string;
  let customerId: string;

  afterEach(async () => {
    if (productId) await cleanupTestProduct(productId);
    if (customerId) await prisma.customer.delete({ where: { id: customerId } }).catch(() => {});
  });

  it("aggregates spend, order count and recency per customer", async () => {
    const product = await createTestProduct({ stockQty: 100, costPricePaise: 1000, sellingPricePaise: 2000 });
    productId = product.id;
    const customer = await prisma.customer.create({ data: { name: "Test Customer XYZ" } });
    customerId = customer.id;

    await recordSale({
      customerId: customer.id,
      saleDate: new Date("2099-04-20T00:00:00Z"),
      items: [{ productId: product.id, quantity: 2, unitPricePaise: 2000 }], // total 4000
    });
    await recordSale({
      customerId: customer.id,
      saleDate: new Date("2099-04-25T00:00:00Z"), // 6 days before asOf
      items: [{ productId: product.id, quantity: 1, unitPricePaise: 2000 }], // total 2000
    });

    const results = await getCustomerInsights(ASOF);
    const row = results.find((r) => r.customerId === customer.id)!;

    expect(row.orderCount).toBe(2);
    expect(row.totalSpendPaise).toBe(6000);
    expect(row.avgOrderValuePaise).toBe(3000);
    expect(row.daysSinceLastOrder).toBe(6);
  });
});
