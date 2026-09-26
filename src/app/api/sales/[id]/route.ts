import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const sale = await prisma.sale.findUniqueOrThrow({
      where: { id },
      include: { customer: true, items: { include: { product: true } } },
    });
    return NextResponse.json({ sale });
  } catch (error) {
    return handleApiError(error);
  }
}
