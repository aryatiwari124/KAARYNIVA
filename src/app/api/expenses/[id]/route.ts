import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { expenseUpdateSchema } from "@/lib/validation/expense";
import { rupeesToPaise } from "@/lib/money";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const expense = await prisma.expense.findUniqueOrThrow({ where: { id } });
    return NextResponse.json({ expense });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await req.json();
    const input = expenseUpdateSchema.parse(body);

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.amountRupees !== undefined ? { amountPaise: rupeesToPaise(input.amountRupees) } : {}),
        ...(input.date !== undefined ? { date: input.date } : {}),
        ...(input.note !== undefined ? { note: input.note || null } : {}),
      },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireSession("OWNER");
    const { id } = await params;
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
