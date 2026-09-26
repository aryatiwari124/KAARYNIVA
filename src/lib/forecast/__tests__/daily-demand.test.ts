import { describe, it, expect, afterEach } from "vitest";
import { recordSale } from "@/lib/transactions/sales";
import { createTestProduct, cleanupTestProduct } from "@/lib/test-utils/db";
import { getDailyDemandSeries } from "../daily-demand";

// asOf is exclusive of "today", so a 5-day window ending 2099-08-06 covers
// 2099-08-01 .. 2099-08-05.
const ASOF = new Date("2099-08-06T00:00:00Z");

describe("getDailyDemandSeries", () => {
  let productId: string;

  afterEach(async () => {
    if (productId) await cleanupTestProduct(productId);
  });

  it("buckets units sold per day and zero-fills days with no sales", async () => {
    const product = await createTestProduct({ stockQty: 100, costPricePaise: 1000, sellingPricePaise: 2000 });
    productId = product.id;

    await recordSale({
      saleDate: new Date("2099-08-01T09:00:00Z"),
      items: [{ productId: product.id, quantity: 3, unitPricePaise: 2000 }],
    });
    await recordSale({
      saleDate: new Date("2099-08-01T18:00:00Z"), // same day, second sale
      items: [{ productId: product.id, quantity: 2, unitPricePaise: 2000 }],
    });
    await recordSale({
      saleDate: new Date("2099-08-04T12:00:00Z"),
      items: [{ productId: product.id, quantity: 7, unitPricePaise: 2000 }],
    });

    const series = await getDailyDemandSeries(product.id, 5, ASOF);

    expect(series).toHaveLength(5);
    expect(series.map((p) => p.date)).toEqual([
      "2099-08-01",
      "2099-08-02",
      "2099-08-03",
      "2099-08-04",
      "2099-08-05",
    ]);
    expect(series[0].quantity).toBe(5); // 3 + 2 same-day sales
    expect(series[1].quantity).toBe(0);
    expect(series[2].quantity).toBe(0);
    expect(series[3].quantity).toBe(7);
    expect(series[4].quantity).toBe(0);
  });
});
