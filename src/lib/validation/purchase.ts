import { z } from "zod";

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitCostRupees: z.coerce.number().min(0, "Cost cannot be negative"),
});

export const purchaseInputSchema = z.object({
  billNo: z.string().trim().max(60).optional().or(z.literal("")),
  supplierId: z.string().min(1).optional().or(z.literal("")),
  purchaseDate: z.coerce.date().optional(),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
  amountPaidRupees: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type PurchaseInput = z.infer<typeof purchaseInputSchema>;
