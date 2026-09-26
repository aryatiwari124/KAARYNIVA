import { describe, it, expect, afterEach } from "vitest";
import { recordSale } from "@/lib/transactions/sales";
import { createTestProduct, cleanupTestProduct } from "@/lib/test-utils/db";
import { getDailyRevenueSeries } from "../daily-series";

const RANGE = { from: new Date("2099-07-01T00:00:00Z"), to: new Date("2099-07-04T00:00:00Z") }; // 3 days

describe("getDailyRevenueSeries", () => {
  let productId: string;

  afterEach(async () => {
    if (productId) await cleanupTestProduct(productId);
  });

  it("buckets by day and zero-fills days with no sales", async () => {
    const product = await createTestProduct({ stockQty: 100, costPricePaise: 1000, sellingPricePaise: 3000 });
    productId = product.id;

    await recordSale({
      saleDate: new Date("2099-07-01T10:00:00Z"),
      items: [{ productId: product.id, quantity: 2, unitPricePaise: 3000 }], // revenue 6000, profit 4000
    });
    await recordSale({
      saleDate: new Date("2099-07-03T14:00:00Z"),
      items: [{ productId: product.id, quantity: 1, unitPricePaise: 3000 }], // revenue 3000, profit 2000
    });
    // 2099-07-02 has no sales at all.

    const series = await getDailyRevenueSeries(RANGE);
    expect(series).toHaveLength(3);
    expect(series[0]).toMatchObject({ date: "2099-07-01", revenuePaise: 6000, profitPaise: 4000 });
    expect(series[1]).toMatchObject({ date: "2099-07-02", revenuePaise: 0, profitPaise: 0 });
    expect(series[2]).toMatchObject({ date: "2099-07-03", revenuePaise: 3000, profitPaise: 2000 });
  });
});
