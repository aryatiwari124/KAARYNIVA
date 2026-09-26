import { z } from "zod";

export const citedFigureSchema = z.object({
  label: z.string().max(80),
  value: z.number(),
});

export const insightResponseSchema = z.object({
  headline: z.string().max(140),
  body: z.string().max(1200),
  /** Every number mentioned in `body` must also appear here, taken verbatim from the input payload. */
  citedFigures: z.array(citedFigureSchema).max(8),
  severity: z.enum(["info", "positive", "warning", "critical"]),
});

export type InsightResponse = z.infer<typeof insightResponseSchema>;
export type CitedFigure = z.infer<typeof citedFigureSchema>;
