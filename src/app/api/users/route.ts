import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { userInputSchema } from "@/lib/validation/user";

export async function GET() {
  try {
    await requireSession("OWNER");
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession("OWNER");
    const body = await req.json();
    const input = userInputSchema.parse(body);

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: input.role },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
