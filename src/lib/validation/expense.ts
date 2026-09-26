import { z } from "zod";

export const expenseInputSchema = z.object({
  category: z.string().trim().min(1, "Category is required").max(100),
  amountRupees: z.coerce.number().positive("Amount must be positive"),
  date: z.coerce.date().optional(),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const expenseUpdateSchema = z.object({
  category: z.string().trim().min(1, "Category is required").max(100).optional(),
  amountRupees: z.coerce.number().positive("Amount must be positive").optional(),
  date: z.coerce.date().optional(),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
