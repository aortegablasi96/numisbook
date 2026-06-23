import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { AppError } from "@/lib/errors";
import { captureException } from "@/lib/observability";
import type { User } from "@/repositories/user.repository";

// Shared boundary helpers for API route handlers. Routes stay thin: resolve the
// caller, validate input, call a service, and shape the response/errors.

/** Resolve the signed-in domain user, or null when unauthenticated. */
export async function currentUser(): Promise<User | null> {
  const session = await auth();
  return resolveCurrentUser(session);
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Map thrown errors to a JSON response. Typed AppErrors carry their status. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  // Unexpected failure: report it (logs + correlation id) and hand the caller
  // an errorId they can quote to support, without leaking internals.
  const errorId = captureException(error, { kind: "unhandledApiError" });
  return NextResponse.json(
    { error: "Internal server error", errorId },
    { status: 500 },
  );
}
