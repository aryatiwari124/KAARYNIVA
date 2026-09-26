import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { applyStockMovements, InsufficientStockError } from "../stock";
import { createTestProduct, cleanupTestProduct } from "@/lib/test-utils/db";

describe("applyStockMovements", () => {
  let productId: string;

  afterEach(async () => {
    if (productId) await cleanupTestProduct(productId);
  });

  it("increments stock and records a matching ledger entry", async () => {
    const product = await createTestProduct({ stockQty: 5 });
    productId = product.id;

    const balances = await prisma.$transaction((tx) =>
      applyStockMovements(tx, [{ productId, quantityDelta: 3, refType: "ADJUSTMENT" }])
    );

    expect(balances.get(productId)).toBe(8);

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(updated.stockQty).toBe(8);

    const entries = await prisma.stockLedgerEntry.findMany({ where: { productId } });
    expect(entries).toHaveLength(1);
    expect(entries[0].quantityDelta).toBe(3);
    expect(entries[0].balanceAfter).toBe(8);
  });

  it("blocks a movement that would take stock negative, and writes nothing", async () => {
    const product = await createTestProduct({ stockQty: 5 });
    productId = product.id;

    await expect(
      prisma.$transaction((tx) =>
        applyStockMovements(tx, [{ productId, quantityDelta: -10, refType: "SALE" }])
      )
    ).rejects.toThrow(InsufficientStockError);

    const unchanged = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(unchanged.stockQty).toBe(5);

    const entries = await prisma.stockLedgerEntry.findMany({ where: { productId } });
    expect(entries).toHaveLength(0);
  });

  it("allows negative stock when explicitly permitted", async () => {
    const product = await createTestProduct({ stockQty: 5 });
    productId = product.id;

    const balances = await prisma.$transaction((tx) =>
      applyStockMovements(tx, [{ productId, quantityDelta: -10, refType: "SALE" }], {
        allowNegative: true,
      })
    );

    expect(balances.get(productId)).toBe(-5);
  });

  it("depletes sequentially across repeated movements for the same product", async () => {
    const product = await createTestProduct({ stockQty: 10 });
    productId = product.id;

    await prisma.$transaction((tx) =>
      applyStockMovements(tx, [
        { productId, quantityDelta: -3, refType: "SALE" },
        { productId, quantityDelta: -3, refType: "SALE" },
      ])
    );

    const entries = await prisma.stockLedgerEntry.findMany({
      where: { productId },
      orderBy: { createdAt: "asc" },
    });
    expect(entries.map((e) => e.balanceAfter)).toEqual([7, 4]);
  });

  it("rejects the whole batch if any single movement in it would go negative", async () => {
    const product = await createTestProduct({ stockQty: 5 });
    productId = product.id;

    await expect(
      prisma.$transaction((tx) =>
        applyStockMovements(tx, [
          { productId, quantityDelta: -3, refType: "SALE" },
          { productId, quantityDelta: -3, refType: "SALE" }, // 5 - 3 - 3 = -1
        ])
      )
    ).rejects.toThrow(InsufficientStockError);

    const unchanged = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(unchanged.stockQty).toBe(5);
  });
});
