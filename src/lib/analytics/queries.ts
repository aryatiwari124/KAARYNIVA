import { prisma } from "@/lib/prisma";
import type { DateRange } from "./types";

export interface AllocatedSaleItem {
  productId: string;
  quantity: number;
  unitCostPaise: number;
  lineTotalPaise: number; // pre-discount line total (quantity * unitPrice)
  netRevenuePaise: number; // this line's share of the sale's post-discount total
  profitPaise: number; // netRevenuePaise - quantity * unitCostPaise
  saleId: string;
  saleDate: Date;
  customerId: string | null;
}

/**
 * Sale.discountPaise lives at the header level, not per line — so summing
 * SaleItem.lineTotalPaise directly would overstate per-product revenue
 * whenever a sale carries a discount. This allocates each sale's discount
 * across its lines proportionally to line size, so per-product figures
 * still foot to the sale's true totalPaise. Small paise-level rounding
 * drift across lines is acceptable; the header total remains the source of
 * truth for the sale as a whole.
 */
export async function getAllocatedSaleItems(range: DateRange): Promise<AllocatedSaleItem[]> {
  const sales = await prisma.sale.findMany({
    where: { voidedAt: null, saleDate: { gte: range.from, lt: range.to } },
    include: { items: true },
  });

  const result: AllocatedSaleItem[] = [];
  for (const sale of sales) {
    const subtotal = sale.subtotalPaise;
    for (const item of sale.items) {
      const share = subtotal > 0 ? item.lineTotalPaise / subtotal : 0;
      const netRevenuePaise = Math.round(item.lineTotalPaise - sale.discountPaise * share);
      result.push({
        productId: item.productId,
        quantity: item.quantity,
        unitCostPaise: item.unitCostPaise,
        lineTotalPaise: item.lineTotalPaise,
        netRevenuePaise,
        profitPaise: netRevenuePaise - item.quantity * item.unitCostPaise,
        saleId: sale.id,
        saleDate: sale.saleDate,
        customerId: sale.customerId,
      });
    }
  }
  return result;
}
