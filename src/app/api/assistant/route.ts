import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { assistantRequestSchema } from "@/lib/validation/assistant";
import { chat } from "@/services/assistant.service";
import { assertWithinLimits } from "@/services/assistant-limits.service";
import {
  subjectKeyForUser,
  subjectKeyForDemoSession,
} from "@/lib/assistant-subject";
import { conversationLimitReached } from "@/lib/assistant-conversation";
import { SESSION_COOKIE_NAME } from "@/auth";
import { RateLimitError, ValidationError } from "@/lib/errors";
import { currentUser, errorResponse, unauthorized } from "../_lib";

// This route handles POST without `assertWritable` deliberately (it is listed as
// exempt in write-guard.test.ts): it stays open to demo visitors and enforces the
// read-only rule by handing the model a read-only tool set, so it never reaches a
// mutating service (ADR-016).

/**
 * Who to meter this request against (ADR-018 §3).
 *
 * Demo visitors all share one tenant id, so they are metered per session
 * instead — otherwise one visitor could exhaust the budget for every other, on
 * a sales surface. Reading the cookie belongs here: the route is the
 * Next-specific layer, and the service only ever sees an opaque string.
 *
 * If the demo cookie is somehow absent, fall back to the shared tenant key
 * rather than leaving the request unmetered — a coarse budget beats none.
 */
async function resolveSubjectKey(userId: string, isDemo: boolean): Promise<string> {
  if (!isDemo) return subjectKeyForUser(userId);
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? subjectKeyForDemoSession(token) : subjectKeyForUser(userId);
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "The assistant is not configured (OPENAI_API_KEY is unset)." },
        { status: 503 },
      );
    }

    const { messages, attachedImage } = assistantRequestSchema.parse(await request.json());

    // Every turn resends the whole history, so cost per turn rises with length.
    // One rule, two bounds: the demo keeps a tighter one because it is reachable
    // without signing in (ADR-018 §1). The widget enforces the same rule for a
    // clean experience; this is the guarantee.
    if (conversationLimitReached(messages.length, user.isDemo)) {
      throw new ValidationError(
        user.isDemo
          ? "This demo conversation has reached its limit. Sign in with Google to keep chatting."
          : "This conversation has reached its limit. Clear it to start a new one.",
      );
    }

    const subjectKey = await resolveSubjectKey(user.id, user.isDemo);

    // Checked before the model is called: the point is not to spend, so this
    // must run ahead of the OpenAI request, not alongside it.
    await assertWithinLimits(subjectKey, user.isDemo);

    const result = await chat(user.id, messages, attachedImage, {
      readOnly: user.isDemo,
      subjectKey,
      signal: request.signal,
    });
    return NextResponse.json(result);
  } catch (error) {
    // A rate-limited caller gets the standard header plus the exact moment in
    // the body, so the widget can say *when* rather than just refusing.
    if (error instanceof RateLimitError) {
      const seconds = Math.max(
        1,
        Math.ceil((error.retryAfter.getTime() - Date.now()) / 1000),
      );
      return NextResponse.json(
        { error: error.message, retryAfter: error.retryAfter.toISOString() },
        { status: 429, headers: { "Retry-After": String(seconds) } },
      );
    }
    return errorResponse(error);
  }
}
