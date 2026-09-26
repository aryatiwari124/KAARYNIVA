import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getDeadStockInsight } from "@/lib/ai/insights/dead-stock";

export async function GET() {
  try {
    await requireSession();
    const insight = await getDeadStockInsight();
    return NextResponse.json({ insight });
  } catch (error) {
    return handleApiError(error);
  }
}
