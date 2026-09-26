import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { supplierInputSchema } from "@/lib/validation/supplier";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const includeInactive = searchParams.get("includeInactive") === "true";

    const suppliers = await prisma.supplier.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const input = supplierInputSchema.parse(body);

    const supplier = await prisma.supplier.create({
      data: {
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        notes: input.notes || null,
      },
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
