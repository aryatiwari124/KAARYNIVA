import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { expenseInputSchema } from "@/lib/validation/expense";
import { rupeesToPaise } from "@/lib/money";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const expenses = await prisma.expense.findMany({
      where: {
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const input = expenseInputSchema.parse(body);

    const expense = await prisma.expense.create({
      data: {
        category: input.category,
        amountPaise: rupeesToPaise(input.amountRupees),
        date: input.date ?? new Date(),
        note: input.note || null,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
