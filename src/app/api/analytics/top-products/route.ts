import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getTopProducts, type RankMetric } from "@/lib/analytics/top-products";
import { parseRangeParams } from "@/lib/analytics/date-range";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const range = parseRangeParams(searchParams);
    const by = (searchParams.get("by") as RankMetric | null) ?? "revenue";
    const limit = Number(searchParams.get("limit")) || 10;

    const products = await getTopProducts(range, { by, limit });
    return NextResponse.json({ range, products });
  } catch (error) {
    return handleApiError(error);
  }
}
