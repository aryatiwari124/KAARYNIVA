import { describe, it, expect, afterEach } from "vitest";
import { recordSale } from "@/lib/transactions/sales";
import { createTestProduct, cleanupTestProduct } from "@/lib/test-utils/db";
import { getDeadStock } from "../dead-stock";

// A window distinct from every other test file's fixtures — getDeadStock has
// no date-range filter of its own, only asOf, so an overlapping sale date in
// another file's fixture could otherwise leak into these results.
const ASOF = new Date("2099-11-01T00:00:00Z");

describe("getDeadStock", () => {
  let soldRecentlyId: string;
  let deadId: string;
  let neverSoldId: string;

  afterEach(async () => {
    if (soldRecentlyId) await cleanupTestProduct(soldRecentlyId);
    if (deadId) await cleanupTestProduct(deadId);
    if (neverSoldId) await cleanupTestProduct(neverSoldId);
  });

  it("flags products idle past the threshold, and excludes recently-sold ones", async () => {
    const recent = await createTestProduct({ stockQty: 10, costPricePaise: 1000 });
    soldRecentlyId = recent.id;
    await recordSale({
      saleDate: new Date("2099-10-25T00:00:00Z"), // 7 days before asOf
      items: [{ productId: recent.id, quantity: 1, unitPricePaise: 2000 }],
    });

    const dead = await createTestProduct({ stockQty: 5, costPricePaise: 2000 });
    deadId = dead.id;
    await recordSale({
      saleDate: new Date("2099-09-03T00:00:00Z"), // 59 days before asOf
      items: [{ productId: dead.id, quantity: 1, unitPricePaise: 3000 }],
    });

    const neverSold = await createTestProduct({ stockQty: 8, costPricePaise: 1500 });
    neverSoldId = neverSold.id;

    const results = await getDeadStock(30, ASOF);
    const ids = results.map((r) => r.productId);

    expect(ids).not.toContain(recent.id); // sold 7 days ago — under the 30-day threshold
    expect(ids).toContain(dead.id);
    expect(ids).toContain(neverSold.id);

    const deadRow = results.find((r) => r.productId === dead.id)!;
    expect(deadRow.daysSinceLastSale).toBe(59);
    expect(deadRow.stockQty).toBe(4); // 5 opening stock - 1 sold
    expect(deadRow.tiedUpCapitalPaise).toBe(4 * 2000);

    const neverRow = results.find((r) => r.productId === neverSold.id)!;
    expect(neverRow.daysSinceLastSale).toBeNull();
  });
});
