import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getCustomerInsights } from "@/lib/analytics/customers";

export async function GET() {
  try {
    await requireSession();
    const customers = await getCustomerInsights();
    return NextResponse.json({ customers });
  } catch (error) {
    return handleApiError(error);
  }
}
