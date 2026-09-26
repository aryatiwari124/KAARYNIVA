import { describe, it, expect, afterEach } from "vitest";
import { recordSale } from "@/lib/transactions/sales";
import { createTestProduct, cleanupTestProduct } from "@/lib/test-utils/db";
import { getProductVelocity } from "../velocity";

const RANGE = { from: new Date("2099-03-01T00:00:00Z"), to: new Date("2099-03-06T00:00:00Z") }; // 5 days
const SALE_DATE = new Date("2099-03-02T10:00:00Z");

describe("getProductVelocity", () => {
  let productId: string;
  let quietId: string;

  afterEach(async () => {
    if (productId) await cleanupTestProduct(productId);
    if (quietId) await cleanupTestProduct(quietId);
  });

  it("computes velocity and days-of-cover from units sold over the range", async () => {
    const product = await createTestProduct({
      stockQty: 20,
      reorderPoint: 5,
      costPricePaise: 1000,
      sellingPricePaise: 2000,
    });
    productId = product.id;

    await recordSale({
      saleDate: SALE_DATE,
      items: [{ productId: product.id, quantity: 10, unitPricePaise: 2000 }],
    });

    const results = await getProductVelocity(RANGE);
    const row = results.find((r) => r.productId === product.id)!;

    expect(row.unitsSoldInRange).toBe(10);
    expect(row.velocityPerDay).toBeCloseTo(10 / 5, 10); // 5-day range
    expect(row.stockQty).toBe(10); // 20 - 10 sold
    expect(row.daysOfCover).toBeCloseTo(10 / (10 / 5), 10); // stockQty / velocity = 5
    expect(row.belowReorderPoint).toBe(false); // 10 > 5
  });

  it("reports zero velocity and null days-of-cover with no sales in range", async () => {
    const quiet = await createTestProduct({ stockQty: 3, reorderPoint: 5 });
    quietId = quiet.id;

    const results = await getProductVelocity(RANGE);
    const row = results.find((r) => r.productId === quiet.id)!;

    expect(row.unitsSoldInRange).toBe(0);
    expect(row.velocityPerDay).toBe(0);
    expect(row.daysOfCover).toBeNull();
    expect(row.belowReorderPoint).toBe(true); // 3 <= 5
  });
});
