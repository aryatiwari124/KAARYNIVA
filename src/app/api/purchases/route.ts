import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { purchaseInputSchema } from "@/lib/validation/purchase";
import { recordPurchase } from "@/lib/transactions/purchases";
import { rupeesToPaise } from "@/lib/money";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

    const purchases = await prisma.purchase.findMany({
      where: { ...(supplierId ? { supplierId } : {}) },
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { purchaseDate: "desc" },
      take: limit,
    });

    return NextResponse.json({ purchases });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const input = purchaseInputSchema.parse(body);

    const purchase = await recordPurchase({
      billNo: input.billNo || undefined,
      supplierId: input.supplierId || null,
      purchaseDate: input.purchaseDate,
      items: input.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitCostPaise: rupeesToPaise(i.unitCostRupees),
      })),
      amountPaidPaise:
        input.amountPaidRupees !== undefined ? rupeesToPaise(input.amountPaidRupees) : undefined,
      notes: input.notes || undefined,
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
