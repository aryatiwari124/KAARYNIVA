import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { supplierUpdateSchema } from "@/lib/validation/supplier";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id } });
    return NextResponse.json({ supplier });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await req.json();
    const input = supplierUpdateSchema.parse(body);

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        ...(input.address !== undefined ? { address: input.address || null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return NextResponse.json({ supplier });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireSession("OWNER");
    const { id } = await params;
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ supplier });
  } catch (error) {
    return handleApiError(error);
  }
}
