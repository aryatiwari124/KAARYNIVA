import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitPriceRupees: z.coerce.number().min(0, "Price cannot be negative"),
});

export const saleInputSchema = z.object({
  invoiceNo: z.string().trim().max(40).optional().or(z.literal("")),
  customerId: z.string().min(1).optional().or(z.literal("")),
  saleDate: z.coerce.date().optional(),
  items: z.array(saleItemSchema).min(1, "Add at least one item"),
  discountRupees: z.coerce.number().min(0).optional(),
  amountPaidRupees: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  allowNegativeStock: z.boolean().optional(),
});

export const voidInputSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type SaleInput = z.infer<typeof saleInputSchema>;
