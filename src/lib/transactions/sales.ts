import { prisma } from "@/lib/prisma";
import { applyStockMovements } from "@/lib/inventory/stock";
import { nextInvoiceNo } from "./sequence";
import { derivePaymentStatus } from "./payment-status";
import { TransactionInputError } from "./errors";

export interface RecordSaleItemInput {
  productId: string;
  quantity: number;
  unitPricePaise: number;
}

export interface RecordSaleInput {
  invoiceNo?: string;
  customerId?: string | null;
  saleDate?: Date;
  items: RecordSaleItemInput[];
  discountPaise?: number;
  amountPaidPaise?: number;
  notes?: string;
  allowNegativeStock?: boolean;
}

export async function recordSale(input: RecordSaleInput) {
  if (input.items.length === 0) {
    throw new TransactionInputError("A sale must have at least one item");
  }
  for (const item of input.items) {
    if (item.quantity <= 0) throw new TransactionInputError("Quantity must be positive");
    if (item.unitPricePaise < 0) throw new TransactionInputError("Price cannot be negative");
  }

  return prisma.$transaction(async (tx) => {
    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const id of productIds) {
      if (!productMap.has(id)) throw new TransactionInputError(`Product ${id} not found`);
    }

    const lineItems = input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPricePaise: item.unitPricePaise,
      unitCostPaise: productMap.get(item.productId)!.costPricePaise,
      lineTotalPaise: item.unitPricePaise * item.quantity,
    }));

    const subtotalPaise = lineItems.reduce((sum, i) => sum + i.lineTotalPaise, 0);
    const discountPaise = input.discountPaise ?? 0;
    if (discountPaise < 0 || discountPaise > subtotalPaise) {
      throw new TransactionInputError("Discount must be between 0 and the subtotal");
    }
    const totalPaise = subtotalPaise - discountPaise;
    const amountPaidPaise = input.amountPaidPaise ?? totalPaise;
    const paymentStatus = derivePaymentStatus(totalPaise, amountPaidPaise);
    const invoiceNo = input.invoiceNo?.trim() || (await nextInvoiceNo(tx));

    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        customerId: input.customerId || null,
        saleDate: input.saleDate ?? new Date(),
        subtotalPaise,
        discountPaise,
        totalPaise,
        amountPaidPaise,
        paymentStatus,
        notes: input.notes,
        items: { create: lineItems },
      },
      include: { items: true, customer: true },
    });

    await applyStockMovements(
      tx,
      input.items.map((item) => ({
        productId: item.productId,
        quantityDelta: -item.quantity,
        refType: "SALE" as const,
        refId: sale.id,
      })),
      { allowNegative: input.allowNegativeStock }
    );

    return sale;
  });
}

export async function voidSale(saleId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUniqueOrThrow({ where: { id: saleId }, include: { items: true } });
    if (sale.voidedAt) throw new TransactionInputError("Sale is already voided");

    await applyStockMovements(
      tx,
      sale.items.map((item) => ({
        productId: item.productId,
        quantityDelta: item.quantity,
        refType: "RETURN_SALE" as const,
        refId: sale.id,
      })),
      { allowNegative: true }
    );

    return tx.sale.update({
      where: { id: saleId },
      data: { voidedAt: new Date(), voidedReason: reason },
    });
  });
}
