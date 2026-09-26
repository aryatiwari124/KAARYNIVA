import { describe, it, expect, afterEach } from "vitest";
import { recordSale } from "@/lib/transactions/sales";
import { createTestProduct, cleanupTestProduct } from "@/lib/test-utils/db";
import { comparePeriods } from "../period-compare";

const CURRENT = { from: new Date("2099-06-01T00:00:00Z"), to: new Date("2099-06-02T00:00:00Z") };
const PREVIOUS = { from: new Date("2099-05-31T00:00:00Z"), to: new Date("2099-06-01T00:00:00Z") };

describe("comparePeriods", () => {
  let aId: string;
  let bId: string;

  afterEach(async () => {
    if (aId) await cleanupTestProduct(aId);
    if (bId) await cleanupTestProduct(bId);
  });

  it("computes revenue delta and attributes it to specific products", async () => {
    const a = await createTestProduct({ stockQty: 100, costPricePaise: 200, sellingPricePaise: 1000 });
    const b = await createTestProduct({ stockQty: 100, costPricePaise: 300, sellingPricePaise: 1000 });
    aId = a.id;
    bId = b.id;

    // Previous period: A sold for 1000, B sold for 2000.
    await recordSale({
      saleDate: new Date("2099-05-31T10:00:00Z"),
      items: [{ productId: a.id, quantity: 1, unitPricePaise: 1000 }],
    });
    await recordSale({
      saleDate: new Date("2099-05-31T11:00:00Z"),
      items: [{ productId: b.id, quantity: 1, unitPricePaise: 2000 }],
    });

    // Current period: A grows to 3000 (+2000), B drops to 500 (-1500).
    await recordSale({
      saleDate: new Date("2099-06-01T10:00:00Z"),
      items: [{ productId: a.id, quantity: 1, unitPricePaise: 3000 }],
    });
    await recordSale({
      saleDate: new Date("2099-06-01T11:00:00Z"),
      items: [{ productId: b.id, quantity: 1, unitPricePaise: 500 }],
    });

    const result = await comparePeriods(CURRENT, PREVIOUS);

    expect(result.current.revenuePaise).toBe(3500); // 3000 + 500
    expect(result.previous.revenuePaise).toBe(3000); // 1000 + 2000
    expect(result.revenueDeltaPaise).toBe(500);
    expect(result.revenueDeltaPct).toBeCloseTo(500 / 3000, 10);

    const contributor = result.topContributors.find((d) => d.productId === a.id);
    expect(contributor?.deltaPaise).toBe(2000);

    const detractor = result.topDetractors.find((d) => d.productId === b.id);
    expect(detractor?.deltaPaise).toBe(-1500);

    // A must not appear as a detractor, nor B as a contributor.
    expect(result.topContributors.find((d) => d.productId === b.id)).toBeUndefined();
    expect(result.topDetractors.find((d) => d.productId === a.id)).toBeUndefined();
  });
});
