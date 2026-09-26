import type { CitedFigure } from "./schemas";

/** Rounding tolerance when comparing a cited figure to a grounded payload number. */
const TOLERANCE = 0.5;

function roundForCompare(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Recursively collects every finite numeric leaf value out of a JSON-like payload. */
export function extractGroundedNumbers(payload: unknown, acc: Set<number> = new Set()): Set<number> {
  if (typeof payload === "number" && Number.isFinite(payload)) {
    acc.add(roundForCompare(payload));
  } else if (Array.isArray(payload)) {
    for (const item of payload) extractGroundedNumbers(item, acc);
  } else if (payload && typeof payload === "object") {
    for (const value of Object.values(payload)) extractGroundedNumbers(value, acc);
  }
  return acc;
}

/**
 * The AI never computes — it only narrates numbers we hand it. This checks
 * that every figure the model claims to cite actually appeared somewhere in
 * the payload we sent (within a small rounding tolerance). A response that
 * fails this check is rejected outright, never partially trusted.
 */
export function validateNumericGrounding(
  citedFigures: CitedFigure[],
  groundedNumbers: Set<number>
): boolean {
  if (citedFigures.length === 0) return true;
  const pool = [...groundedNumbers];
  return citedFigures.every((fig) => {
    const target = roundForCompare(fig.value);
    return pool.some((g) => Math.abs(g - target) <= TOLERANCE);
  });
}
