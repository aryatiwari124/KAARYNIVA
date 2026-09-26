import { z } from "zod";

export const whatIfInputSchema = z.object({
  productId: z.string().min(1),
  newPriceRupees: z.coerce.number().min(0),
});
