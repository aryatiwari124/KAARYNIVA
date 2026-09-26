import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { saleInputSchema } from "@/lib/validation/sale";
import { recordSale } from "@/lib/transactions/sales";
import { rupeesToPaise } from "@/lib/money";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

    const sales = await prisma.sale.findMany({
      where: { ...(customerId ? { customerId } : {}) },
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { saleDate: "desc" },
      take: limit,
    });

    return NextResponse.json({ sales });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const input = saleInputSchema.parse(body);

    const sale = await recordSale({
      invoiceNo: input.invoiceNo || undefined,
      customerId: input.customerId || null,
      saleDate: input.saleDate,
      items: input.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPricePaise: rupeesToPaise(i.unitPriceRupees),
      })),
      discountPaise: input.discountRupees ? rupeesToPaise(input.discountRupees) : undefined,
      amountPaidPaise:
        input.amountPaidRupees !== undefined ? rupeesToPaise(input.amountPaidRupees) : undefined,
      notes: input.notes || undefined,
      allowNegativeStock: input.allowNegativeStock,
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
