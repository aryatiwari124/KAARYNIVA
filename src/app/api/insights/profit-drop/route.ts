import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getProfitDropInsight } from "@/lib/ai/insights/profit-drop";

export async function GET() {
  try {
    await requireSession();
    const insight = await getProfitDropInsight();
    return NextResponse.json({ insight });
  } catch (error) {
    return handleApiError(error);
  }
}
