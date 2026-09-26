import { z } from "zod";

export const userInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["OWNER", "STAFF"]),
});

export const userUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["OWNER", "STAFF"]).optional(),
});

export type UserInput = z.infer<typeof userInputSchema>;
