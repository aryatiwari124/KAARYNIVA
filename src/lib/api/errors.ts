import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ApiAuthError } from "@/lib/auth/require-session";
import { InsufficientStockError } from "@/lib/inventory/stock";
import { TransactionInputError } from "@/lib/transactions/errors";

/** Turns thrown errors from an API route into a consistent JSON response. */
export function handleApiError(error: unknown) {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof InsufficientStockError) {
    return NextResponse.json(
      {
        error: `Not enough stock (${error.available} available, ${error.requested} requested).`,
        productId: error.productId,
      },
      { status: 409 }
    );
  }
  if (error instanceof TransactionInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(", ") ?? "field";
      return NextResponse.json(
        { error: `A record with this ${target} already exists.` },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
