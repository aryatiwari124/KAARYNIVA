import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { userUpdateSchema } from "@/lib/validation/user";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession("OWNER");
    const { id } = await params;
    const body = await req.json();
    const input = userUpdateSchema.parse(body);

    if (id === session.user.id && (input.isActive === false || input.role === "STAFF")) {
      return NextResponse.json(
        { error: "You can't deactivate or demote your own account." },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
