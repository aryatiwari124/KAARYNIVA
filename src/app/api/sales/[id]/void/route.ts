import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { voidInputSchema } from "@/lib/validation/sale";
import { voidSale } from "@/lib/transactions/sales";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireSession("OWNER");
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { reason } = voidInputSchema.parse(body);
    const sale = await voidSale(id, reason);
    return NextResponse.json({ sale });
  } catch (error) {
    return handleApiError(error);
  }
}
