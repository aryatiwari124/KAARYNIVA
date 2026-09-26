import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getProductForecast } from "@/lib/forecast";

type Params = { params: Promise<{ productId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { productId } = await params;
    const forecast = await getProductForecast(productId);
    if (!forecast) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ forecast });
  } catch (error) {
    return handleApiError(error);
  }
}
