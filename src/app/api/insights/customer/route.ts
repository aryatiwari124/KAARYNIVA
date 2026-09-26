import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getCustomerInsight } from "@/lib/ai/insights/customer";

export async function GET() {
  try {
    await requireSession();
    const insight = await getCustomerInsight();
    return NextResponse.json({ insight });
  } catch (error) {
    return handleApiError(error);
  }
}
