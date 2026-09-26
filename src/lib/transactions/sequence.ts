import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Atomically increments and returns a named counter — safe under concurrent transactions. */
export async function nextSequence(tx: Tx, name: string): Promise<number> {
  const row = await tx.counter.upsert({
    where: { name },
    create: { name, value: 1 },
    update: { value: { increment: 1 } },
  });
  return row.value;
}

export async function nextInvoiceNo(tx: Tx): Promise<string> {
  const n = await nextSequence(tx, "sale-invoice");
  return `INV-${String(n).padStart(5, "0")}`;
}
