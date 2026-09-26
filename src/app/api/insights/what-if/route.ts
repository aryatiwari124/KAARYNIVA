import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getWhatIfInsight } from "@/lib/ai/insights/what-if";
import { whatIfInputSchema } from "@/lib/validation/what-if";

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const input = whatIfInputSchema.parse(body);

    const insight = await getWhatIfInsight(input.productId, input.newPriceRupees);
    if (!insight) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ insight });
  } catch (error) {
    return handleApiError(error);
  }
}
