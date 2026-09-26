import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { productInputSchema } from "@/lib/validation/product";
import { rupeesToPaise } from "@/lib/money";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const includeInactive = searchParams.get("includeInactive") === "true";

    const products = await prisma.product.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { sku: { contains: query, mode: "insensitive" } },
                { category: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ products });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const input = productInputSchema.parse(body);

    const product = await prisma.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        category: input.category || null,
        unit: input.unit,
        costPricePaise: rupeesToPaise(input.costPriceRupees),
        sellingPricePaise: rupeesToPaise(input.sellingPriceRupees),
        reorderPoint: input.reorderPoint,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
