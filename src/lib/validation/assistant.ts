import { z } from "zod";
import { MAX_ASSISTANT_MESSAGES_PAYLOAD } from "@/lib/assistant-conversation";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(8000),
});

export const assistantRequestSchema = z.object({
  // A structural abuse guard, not the conversation limit — that is enforced with
  // a friendly message in the route, and must be the bound a normal user meets.
  messages: z.array(chatMessageSchema).min(1).max(MAX_ASSISTANT_MESSAGES_PAYLOAD),
  attachedImage: z.string().startsWith("data:image/").nullish(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
