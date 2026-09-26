import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { productUpdateSchema } from "@/lib/validation/product";
import { rupeesToPaise } from "@/lib/money";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const product = await prisma.product.findUniqueOrThrow({ where: { id } });
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await req.json();
    const input = productUpdateSchema.parse(body);

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.category !== undefined ? { category: input.category || null } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.costPriceRupees !== undefined
          ? { costPricePaise: rupeesToPaise(input.costPriceRupees) }
          : {}),
        ...(input.sellingPriceRupees !== undefined
          ? { sellingPricePaise: rupeesToPaise(input.sellingPriceRupees) }
          : {}),
        ...(input.reorderPoint !== undefined ? { reorderPoint: input.reorderPoint } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireSession("OWNER");
    const { id } = await params;
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}
