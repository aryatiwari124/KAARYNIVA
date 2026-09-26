import { describe, it, expect, afterEach } from "vitest";
import { recordSale } from "@/lib/transactions/sales";
import { createTestProduct, cleanupTestProduct } from "@/lib/test-utils/db";
import { getTopProducts } from "../top-products";

const RANGE = { from: new Date("2099-02-01T00:00:00Z"), to: new Date("2099-02-02T00:00:00Z") };
const SALE_DATE = new Date("2099-02-01T10:00:00Z");

describe("getTopProducts", () => {
  let aId: string;
  let bId: string;

  afterEach(async () => {
    if (aId) await cleanupTestProduct(aId);
    if (bId) await cleanupTestProduct(bId);
  });

  it("allocates a sale-level discount proportionally across line items", async () => {
    const a = await createTestProduct({ stockQty: 100, costPricePaise: 2000, sellingPricePaise: 6000 });
    const b = await createTestProduct({ stockQty: 100, costPricePaise: 1000, sellingPricePaise: 4000 });
    aId = a.id;
    bId = b.id;

    // subtotal 10000 (6000 + 4000), 1000 discount (10%) -> total 9000.
    // A's 60% share of the discount is 600 -> net revenue 5400, profit 3400.
    // B's 40% share of the discount is 400 -> net revenue 3600, profit 2600.
    await recordSale({
      saleDate: SALE_DATE,
      items: [
        { productId: a.id, quantity: 1, unitPricePaise: 6000 },
        { productId: b.id, quantity: 1, unitPricePaise: 4000 },
      ],
      discountPaise: 1000,
    });

    const byRevenue = await getTopProducts(RANGE, { by: "revenue" });
    const a1 = byRevenue.find((p) => p.productId === a.id)!;
    const b1 = byRevenue.find((p) => p.productId === b.id)!;

    expect(a1.revenuePaise).toBe(5400);
    expect(a1.profitPaise).toBe(3400);
    expect(b1.revenuePaise).toBe(3600);
    expect(b1.profitPaise).toBe(2600);
    // Allocated revenue must foot back to the sale's true (post-discount) total.
    expect(a1.revenuePaise + b1.revenuePaise).toBe(9000);
    // Revenue-sorted: A (5400) ahead of B (3600).
    expect(byRevenue[0].productId).toBe(a.id);
  });

  it("ranks by quantity independent of revenue", async () => {
    const a = await createTestProduct({ stockQty: 100, costPricePaise: 100, sellingPricePaise: 200 });
    const b = await createTestProduct({ stockQty: 100, costPricePaise: 100, sellingPricePaise: 5000 });
    aId = a.id;
    bId = b.id;

    // A: 10 units at low price (high quantity, low revenue).
    // B: 1 unit at high price (low quantity, high revenue).
    await recordSale({
      saleDate: SALE_DATE,
      items: [
        { productId: a.id, quantity: 10, unitPricePaise: 200 },
        { productId: b.id, quantity: 1, unitPricePaise: 5000 },
      ],
    });

    const byQuantity = await getTopProducts(RANGE, { by: "quantity" });
    expect(byQuantity[0].productId).toBe(a.id);
    expect(byQuantity[0].quantitySold).toBe(10);

    const byRevenue = await getTopProducts(RANGE, { by: "revenue" });
    expect(byRevenue[0].productId).toBe(b.id);
  });
});
