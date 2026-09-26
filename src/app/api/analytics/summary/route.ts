import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getRevenueSummary } from "@/lib/analytics/revenue";
import { parseRangeParams } from "@/lib/analytics/date-range";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const range = parseRangeParams(new URL(req.url).searchParams);
    const summary = await getRevenueSummary(range);
    return NextResponse.json({ range, summary });
  } catch (error) {
    return handleApiError(error);
  }
}
