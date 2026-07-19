import { NextResponse } from "next/server";
import { assistantRequestSchema } from "@/lib/validation/assistant";
import { chat } from "@/services/assistant.service";
import { conversationLimitReached } from "@/lib/assistant-conversation";
import { ValidationError } from "@/lib/errors";
import { currentUser, errorResponse, unauthorized } from "../_lib";

// This route handles POST without `assertWritable` deliberately (it is listed as
// exempt in write-guard.test.ts): it stays open to demo visitors and enforces the
// read-only rule by handing the model a read-only tool set, so it never reaches a
// mutating service (ADR-016).

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

    const result = await chat(user.id, messages, attachedImage, {
      readOnly: user.isDemo,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
