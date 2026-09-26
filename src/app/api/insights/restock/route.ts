import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getRestockInsight } from "@/lib/ai/insights/restock";

export async function GET() {
  try {
    await requireSession();
    const insight = await getRestockInsight();
    return NextResponse.json({ insight });
  } catch (error) {
    return handleApiError(error);
  }
}
