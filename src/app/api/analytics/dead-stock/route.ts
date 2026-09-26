import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getDeadStock } from "@/lib/analytics/dead-stock";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const days = Number(new URL(req.url).searchParams.get("days")) || 30;
    const items = await getDeadStock(days);
    return NextResponse.json({ days, items });
  } catch (error) {
    return handleApiError(error);
  }
}
