import crypto from "node:crypto";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient, isAiEnabled, AI_MODEL } from "./client";
import { insightResponseSchema, type InsightResponse } from "./schemas";
import { extractGroundedNumbers, validateNumericGrounding } from "./numeric-validator";
import { INSIGHT_SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { stableStringify } from "./stable-stringify";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_ATTEMPTS = 2;

export type InsightSource = "ai" | "cache" | "deterministic";

export interface GroundedInsight extends InsightResponse {
  source: InsightSource;
}

export interface GenerateInsightOptions {
  /** Short stable key identifying which insight feature this is (e.g. "briefing"). */
  feature: string;
  /** The grounded numeric payload — every number the model may cite must live here. */
  payload: object;
  /** What to ask the model to do with the payload. */
  instruction: string;
  /** Deterministic, non-AI narrative used when AI is disabled or fails validation. */
  fallback: () => InsightResponse;
}

async function callModel(instruction: string, payload: unknown): Promise<InsightResponse> {
  const client = getAnthropicClient();
  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: zodOutputFormat(insightResponseSchema),
    },
    system: INSIGHT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(instruction, payload) }],
  });

  if (!response.parsed_output) {
    throw new Error("Model response did not parse against the insight schema");
  }
  return response.parsed_output;
}

/**
 * Grounded insight generation: cache → AI (validated, one retry) → deterministic
 * fallback. The AI is never trusted with arithmetic — see numeric-validator.ts.
 */
export async function generateGroundedInsight(opts: GenerateInsightOptions): Promise<GroundedInsight> {
  const payloadJson = stableStringify(opts.payload);
  const payloadHash = crypto.createHash("sha256").update(payloadJson).digest("hex");
  const cacheKey = `${opts.feature}:${payloadHash}`;

  const cached = await prisma.insightCache.findUnique({ where: { cacheKey } });
  if (cached && cached.expiresAt > new Date()) {
    return { ...(cached.response as InsightResponse), source: "cache" };
  }

  if (!isAiEnabled()) {
    return { ...opts.fallback(), source: "deterministic" };
  }

  const groundedNumbers = extractGroundedNumbers(opts.payload);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const result = await callModel(opts.instruction, opts.payload);
      if (validateNumericGrounding(result.citedFigures, groundedNumbers)) {
        await prisma.insightCache.upsert({
          where: { cacheKey },
          create: {
            cacheKey,
            feature: opts.feature,
            payloadHash,
            response: result,
            model: AI_MODEL,
            expiresAt: new Date(Date.now() + CACHE_TTL_MS),
          },
          update: {
            response: result,
            model: AI_MODEL,
            expiresAt: new Date(Date.now() + CACHE_TTL_MS),
          },
        });
        return { ...result, source: "ai" };
      }
      console.warn(`AI insight "${opts.feature}" failed numeric grounding check (attempt ${attempt + 1})`);
    } catch (error) {
      console.error(`AI insight "${opts.feature}" generation error (attempt ${attempt + 1}):`, error);
    }
  }

  return { ...opts.fallback(), source: "deterministic" };
}
