import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { comparePeriods } from "@/lib/analytics/period-compare";
import { parseRangeParams } from "@/lib/analytics/date-range";
import { previousPeriod } from "@/lib/analytics/types";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const current = parseRangeParams(new URL(req.url).searchParams);
    const previous = previousPeriod(current);
    const comparison = await comparePeriods(current, previous);
    return NextResponse.json({ currentRange: current, previousRange: previous, ...comparison });
  } catch (error) {
    return handleApiError(error);
  }
}
