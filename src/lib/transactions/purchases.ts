import { prisma } from "@/lib/prisma";
import { applyStockMovements } from "@/lib/inventory/stock";
import { derivePaymentStatus } from "./payment-status";
import { TransactionInputError } from "./errors";

export interface RecordPurchaseItemInput {
  productId: string;
  quantity: number;
  unitCostPaise: number;
}

export interface RecordPurchaseInput {
  billNo?: string;
  supplierId?: string | null;
  purchaseDate?: Date;
  items: RecordPurchaseItemInput[];
  amountPaidPaise?: number;
  notes?: string;
}

export async function recordPurchase(input: RecordPurchaseInput) {
  if (input.items.length === 0) {
    throw new TransactionInputError("A purchase must have at least one item");
  }
  for (const item of input.items) {
    if (item.quantity <= 0) throw new TransactionInputError("Quantity must be positive");
    if (item.unitCostPaise < 0) throw new TransactionInputError("Cost cannot be negative");
  }

  return prisma.$transaction(async (tx) => {
    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const existing = await tx.product.count({ where: { id: { in: productIds } } });
    if (existing !== productIds.length) {
      throw new TransactionInputError("One or more products were not found");
    }

    const lineItems = input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCostPaise: item.unitCostPaise,
      lineTotalPaise: item.unitCostPaise * item.quantity,
    }));

    const subtotalPaise = lineItems.reduce((sum, i) => sum + i.lineTotalPaise, 0);
    const totalPaise = subtotalPaise;
    const amountPaidPaise = input.amountPaidPaise ?? totalPaise;
    const paymentStatus = derivePaymentStatus(totalPaise, amountPaidPaise);

    const purchase = await tx.purchase.create({
      data: {
        billNo: input.billNo,
        supplierId: input.supplierId || null,
        purchaseDate: input.purchaseDate ?? new Date(),
        subtotalPaise,
        totalPaise,
        amountPaidPaise,
        paymentStatus,
        notes: input.notes,
        items: { create: lineItems },
      },
      include: { items: true, supplier: true },
    });

    await applyStockMovements(
      tx,
      input.items.map((item) => ({
        productId: item.productId,
        quantityDelta: item.quantity,
        refType: "PURCHASE" as const,
        refId: purchase.id,
        unitCostPaise: item.unitCostPaise,
      }))
    );

    // Latest-cost method: each purchase refreshes the product's known cost.
    for (const item of input.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { costPricePaise: item.unitCostPaise },
      });
    }

    return purchase;
  });
}

export async function voidPurchase(purchaseId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUniqueOrThrow({
      where: { id: purchaseId },
      include: { items: true },
    });
    if (purchase.voidedAt) throw new TransactionInputError("Purchase is already voided");

    // Not allowNegative: if this stock has already been sold onward, voiding
    // must fail rather than silently pushing the product negative.
    await applyStockMovements(
      tx,
      purchase.items.map((item) => ({
        productId: item.productId,
        quantityDelta: -item.quantity,
        refType: "RETURN_PURCHASE" as const,
        refId: purchase.id,
      }))
    );

    return tx.purchase.update({
      where: { id: purchaseId },
      data: { voidedAt: new Date(), voidedReason: reason },
    });
  });
}
