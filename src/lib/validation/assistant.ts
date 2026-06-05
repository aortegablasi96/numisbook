import { z } from "zod";

// Validation for the assistant chat endpoint: a transcript of plain-text turns.
export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(8000),
});

export const assistantRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
