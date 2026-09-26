import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getProductVelocity } from "@/lib/analytics/velocity";
import { parseRangeParams } from "@/lib/analytics/date-range";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const range = parseRangeParams(new URL(req.url).searchParams);
    const products = await getProductVelocity(range);
    return NextResponse.json({ range, products });
  } catch (error) {
    return handleApiError(error);
  }
}
