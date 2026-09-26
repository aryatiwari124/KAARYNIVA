import { z } from "zod";

export const supplierInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().max(200).email("Invalid email").optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

// NOTE: built independently rather than via supplierInputSchema.partial() —
// zod's .partial() still applies .default() to absent keys, which could
// silently reset defaulted fields on every partial PATCH. Supplier has no
// .default() fields, but we keep this standalone-object convention anyway
// for consistency with productUpdateSchema.
export const supplierUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().max(200).email("Invalid email").optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type SupplierInput = z.infer<typeof supplierInputSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
