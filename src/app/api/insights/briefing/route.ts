import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getBriefingInsight } from "@/lib/ai/insights/briefing";

export async function GET() {
  try {
    await requireSession();
    const insight = await getBriefingInsight();
    return NextResponse.json({ insight });
  } catch (error) {
    return handleApiError(error);
  }
}
