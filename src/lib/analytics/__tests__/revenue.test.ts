import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordSale } from "@/lib/transactions/sales";
import { createTestProduct, cleanupTestProduct } from "@/lib/test-utils/db";
import { getRevenueSummary } from "../revenue";

// Far-future window, isolated from both the seeded demo data and other tests.
const RANGE = { from: new Date("2099-01-01T00:00:00Z"), to: new Date("2099-01-02T00:00:00Z") };
const SALE_DATE = new Date("2099-01-01T10:00:00Z");

describe("getRevenueSummary", () => {
  let productAId: string;
  let productBId: string;
  let expenseId: string | undefined;

  afterEach(async () => {
    if (productAId) await cleanupTestProduct(productAId);
    if (productBId) await cleanupTestProduct(productBId);
    if (expenseId) await prisma.expense.delete({ where: { id: expenseId } }).catch(() => {});
    // Reset so a later test that only sets one of these doesn't re-clean a
    // now-stale id left over from an earlier test in this describe block.
    productAId = "";
    productBId = "";
    expenseId = undefined;
  });

  it("computes revenue, COGS, margins and net profit from a hand-calculated fixture", async () => {
    const a = await createTestProduct({ stockQty: 100, costPricePaise: 5000, sellingPricePaise: 8000 });
    const b = await createTestProduct({ stockQty: 100, costPricePaise: 3000, sellingPricePaise: 5000 });
    productAId = a.id;
    productBId = b.id;

    // Sale 1: 2xA + 3xB, ₹10 discount. subtotal 31000, total 30000, COGS 19000.
    await recordSale({
      saleDate: SALE_DATE,
      items: [
        { productId: a.id, quantity: 2, unitPricePaise: 8000 },
        { productId: b.id, quantity: 3, unitPricePaise: 5000 },
      ],
      discountPaise: 1000,
    });

    // Sale 2: 1xA, partially paid. total 8000, COGS 5000.
    await recordSale({
      saleDate: SALE_DATE,
      items: [{ productId: a.id, quantity: 1, unitPricePaise: 8000 }],
      amountPaidPaise: 4000,
    });

    const expense = await prisma.expense.create({
      data: { category: "Test", amountPaise: 5000, date: SALE_DATE },
    });
    expenseId = expense.id;

    const summary = await getRevenueSummary(RANGE);

    expect(summary.orderCount).toBe(2);
    expect(summary.revenuePaise).toBe(38000); // 30000 + 8000
    expect(summary.cogsPaise).toBe(24000); // 19000 + 5000
    expect(summary.grossProfitPaise).toBe(14000);
    expect(summary.grossMarginPct).toBeCloseTo(14000 / 38000, 10);
    expect(summary.expensePaise).toBe(5000);
    expect(summary.netProfitPaise).toBe(9000);
    expect(summary.netMarginPct).toBeCloseTo(9000 / 38000, 10);
    expect(summary.avgOrderValuePaise).toBe(19000);
  });

  it("excludes voided sales and sales outside the range", async () => {
    const a = await createTestProduct({ stockQty: 100, costPricePaise: 5000, sellingPricePaise: 8000 });
    productAId = a.id;

    const inRange = await recordSale({
      saleDate: SALE_DATE,
      items: [{ productId: a.id, quantity: 1, unitPricePaise: 8000 }],
    });
    await recordSale({
      saleDate: new Date("2099-01-05T00:00:00Z"), // outside range
      items: [{ productId: a.id, quantity: 1, unitPricePaise: 8000 }],
    });

    const { voidSale } = await import("@/lib/transactions/sales");
    const toVoid = await recordSale({
      saleDate: SALE_DATE,
      items: [{ productId: a.id, quantity: 1, unitPricePaise: 8000 }],
    });
    await voidSale(toVoid.id);

    const summary = await getRevenueSummary(RANGE);
    expect(summary.orderCount).toBe(1);
    expect(summary.revenuePaise).toBe(inRange.totalPaise);
  });

  it("returns null margins when there is no revenue in range", async () => {
    // A far-future window untouched by any other test file's fixtures.
    const summary = await getRevenueSummary({
      from: new Date("2099-12-01T00:00:00Z"),
      to: new Date("2099-12-02T00:00:00Z"),
    });
    expect(summary.revenuePaise).toBe(0);
    expect(summary.grossMarginPct).toBeNull();
    expect(summary.netMarginPct).toBeNull();
    expect(summary.avgOrderValuePaise).toBeNull();
  });
});
