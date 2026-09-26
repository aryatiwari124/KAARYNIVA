import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getDailyRevenueSeries } from "@/lib/analytics/daily-series";
import { parseRangeParams } from "@/lib/analytics/date-range";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const range = parseRangeParams(new URL(req.url).searchParams);
    const series = await getDailyRevenueSeries(range);
    return NextResponse.json({ range, series });
  } catch (error) {
    return handleApiError(error);
  }
}
