import { z } from "zod";

export const productInputSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(64),
  name: z.string().trim().min(1, "Name is required").max(200),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(20).default("pc"),
  costPriceRupees: z.coerce.number().min(0, "Cost price cannot be negative"),
  sellingPriceRupees: z.coerce.number().min(0, "Selling price cannot be negative"),
  reorderPoint: z.coerce.number().int().min(0).default(0),
});

// NOTE: built independently rather than via productInputSchema.partial() —
// zod's .partial() still applies .default() to absent keys, which would
// silently reset unit/reorderPoint to their defaults on every partial PATCH.
export const productUpdateSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(64).optional(),
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(20).optional(),
  costPriceRupees: z.coerce.number().min(0, "Cost price cannot be negative").optional(),
  sellingPriceRupees: z.coerce.number().min(0, "Selling price cannot be negative").optional(),
  reorderPoint: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
