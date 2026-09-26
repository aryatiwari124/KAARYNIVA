import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";

export class ApiAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Throws ApiAuthError if unauthenticated, or unauthorized when a role is required. */
export async function requireSession(minRole?: Role) {
  const session = await auth();
  if (!session?.user) {
    throw new ApiAuthError(401, "Not authenticated");
  }
  if (minRole === "OWNER" && session.user.role !== "OWNER") {
    throw new ApiAuthError(403, "Owner access required");
  }
  return session;
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
