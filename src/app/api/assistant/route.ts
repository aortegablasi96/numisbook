import { NextResponse } from "next/server";
import { assistantRequestSchema } from "@/lib/validation/assistant";
import { chat } from "@/services/assistant.service";
import { DEMO_MAX_ASSISTANT_MESSAGES } from "@/lib/demo";
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

    // The demo is reachable without signing in, so it is the one surface where an
    // anonymous stranger spends our OpenAI budget. Bound a single conversation.
    if (user.isDemo && messages.length > DEMO_MAX_ASSISTANT_MESSAGES) {
      throw new ValidationError(
        "This demo conversation has reached its limit. Sign in with Google to keep chatting.",
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
