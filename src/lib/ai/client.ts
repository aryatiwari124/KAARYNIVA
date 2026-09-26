import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/** The AI layer is entirely optional — every feature has a deterministic fallback. */
export function isAiEnabled(): boolean {
  return process.env.AI_INSIGHTS_ENABLED === "true" && !!process.env.ANTHROPIC_API_KEY;
}

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const AI_MODEL = "claude-opus-4-8";
