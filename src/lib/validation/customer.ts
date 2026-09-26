import { z } from "zod";

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

// NOTE: built independently rather than via customerInputSchema.partial() —
// zod's .partial() still applies .default() to absent keys, which would
// silently reset defaulted fields on every partial PATCH. Customer has no
// .default() fields, but we keep this convention for consistency across
// the codebase's validation schemas.
export const customerUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
