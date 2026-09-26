import type { Prisma, LedgerRefType } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export class InsufficientStockError extends Error {
  constructor(
    public productId: string,
    public available: number,
    public requested: number
  ) {
    super(`Not enough stock: ${available} available, ${requested} requested`);
    this.name = "InsufficientStockError";
  }
}

export interface StockMovement {
  productId: string;
  quantityDelta: number; // positive = stock in, negative = stock out
  refType: LedgerRefType;
  refId?: string;
  unitCostPaise?: number;
  note?: string;
}

/**
 * Applies a batch of stock movements atomically within an existing
 * transaction: locks every affected product row (in a stable sort order to
 * avoid deadlocks with concurrent callers touching overlapping products),
 * validates none would go negative (unless allowNegative), writes one
 * append-only StockLedgerEntry per movement, then updates each product's
 * denormalized stockQty to its final balance.
 *
 * Movements are applied in array order, so multiple movements against the
 * same product within one call (e.g. two line items of the same SKU on one
 * sale) correctly deplete sequentially rather than racing against a single
 * stale read.
 */
export async function applyStockMovements(
  tx: Tx,
  movements: StockMovement[],
  opts?: { allowNegative?: boolean }
): Promise<Map<string, number>> {
  if (movements.length === 0) return new Map();

  const productIds = [...new Set(movements.map((m) => m.productId))].sort();
  const balances = new Map<string, number>();

  for (const id of productIds) {
    const rows = await tx.$queryRaw<{ stockQty: number }[]>`
      SELECT "stockQty" FROM "Product" WHERE id = ${id} FOR UPDATE
    `;
    if (rows.length === 0) throw new Error(`Product ${id} not found`);
    balances.set(id, rows[0].stockQty);
  }

  const ledgerRows: {
    productId: string;
    quantityDelta: number;
    balanceAfter: number;
    unitCostPaise: number | null;
    refType: LedgerRefType;
    refId: string | null;
    note: string | null;
  }[] = [];

  for (const m of movements) {
    const current = balances.get(m.productId)!;
    const newBalance = current + m.quantityDelta;
    if (newBalance < 0 && !opts?.allowNegative) {
      throw new InsufficientStockError(m.productId, current, -m.quantityDelta);
    }
    balances.set(m.productId, newBalance);
    ledgerRows.push({
      productId: m.productId,
      quantityDelta: m.quantityDelta,
      balanceAfter: newBalance,
      unitCostPaise: m.unitCostPaise ?? null,
      refType: m.refType,
      refId: m.refId ?? null,
      note: m.note ?? null,
    });
  }

  await tx.stockLedgerEntry.createMany({ data: ledgerRows });

  for (const [productId, balance] of balances) {
    await tx.product.update({ where: { id: productId }, data: { stockQty: balance } });
  }

  return balances;
}
