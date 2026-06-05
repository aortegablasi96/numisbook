import { NextResponse } from "next/server";
import { assistantRequestSchema } from "@/lib/validation/assistant";
import { chat } from "@/services/assistant.service";
import { currentUser, errorResponse, unauthorized } from "../_lib";

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

    const { messages } = assistantRequestSchema.parse(await request.json());
    const result = await chat(user.id, messages);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
