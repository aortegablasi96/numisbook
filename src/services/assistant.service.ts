import OpenAI from "openai";
import * as collectionService from "@/services/collection.service";
import * as coinService from "@/services/coin.service";
import * as valuationService from "@/services/valuation.service";
import { getPortfolioSummary } from "@/services/analytics.service";
import { setCoinImage } from "@/services/coinImage.service";
import { userRepository } from "@/repositories/user.repository";
import { formatCoinTitle } from "@/lib/coin-format";
import { logger } from "@/lib/logger";

// NumisBook's collection assistant: OpenAI gpt-4o-mini with function calling over
// the domain services, driven by a manual agentic loop. Tenant isolation is
// structural — the acting user's id is captured server-side and injected into
// every tool handler, so the model can never act on another user's data (it is
// never given a userId parameter).

const MODEL = "gpt-4o-mini";
const MAX_TOOL_ITERATIONS = 12;

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatResult = { reply: string; actions: string[] };

const SYSTEM_PROMPT = `You are NumisBook's collection assistant. You help a single signed-in coin collector manage their own collection using the provided tools.

Guidelines:
- Use the tools to read and modify the user's data. Never invent collection names, coin ids, amounts, or values — look them up with the read tools first.
- When the user refers to a collection by name, or to a coin by its attributes, call the relevant list tool to resolve it to an id before acting on it.
- Coins belong to collections; valuations belong to coins. Amounts use a 3-letter ISO currency code (e.g. USD).
- Before deleting a collection or coin, confirm with the user, unless they have already clearly confirmed the deletion in this conversation. Deletions cannot be undone.
- Be concise. After taking an action, briefly confirm what you did.
- You only ever see and act on the current user's own data.
- When the user asks to add a coin and has attached a photo, let them know the photo will be saved automatically.`;

// The demo tenant is shared and read-only (ADR-016), so the model is given only
// the read tools — the write handlers are never even constructed. Telling it so
// keeps it from promising an edit it has no way to perform.
const READ_ONLY_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

IMPORTANT — this is the public read-only demo account:
- You can only read. You have no tools to create, edit or delete anything, and no valuation can be recorded.
- If the user asks for a change, explain that the demo collection is read-only and invite them to sign in with Google to build their own collection. Do not claim to have made the change.`;

/** Tools a demo visitor may use: reads only. Everything else mutates shared data. */
const READ_ONLY_TOOLS = [
  "list_collections",
  "list_coins",
  "list_valuations",
  "get_portfolio_summary",
] as const;

// The security boundary: each handler closes over `userId` and forwards it to a
// domain service, which enforces ownership. `actions` accumulates a human-readable
// log of mutations for display in the UI.
export function buildHandlers(
  userId: string,
  actions: string[],
  imageDataUrl?: string | null,
) {
  return {
    list_collections: () => collectionService.listCollections(userId),

    create_collection: async ({ name }: { name: string }) => {
      const created = await collectionService.createCollection(userId, name);
      actions.push(`Created collection "${created.name}"`);
      return created;
    },

    rename_collection: async ({
      collectionId,
      name,
    }: {
      collectionId: string;
      name: string;
    }) => {
      const updated = await collectionService.renameCollection(
        userId,
        collectionId,
        name,
      );
      actions.push(`Renamed a collection to "${updated.name}"`);
      return updated;
    },

    delete_collection: async ({ collectionId }: { collectionId: string }) => {
      await collectionService.deleteCollection(userId, collectionId);
      actions.push(`Deleted a collection`);
      return { deleted: true };
    },

    list_coins: ({ collectionId }: { collectionId: string }) =>
      coinService.listCoins(userId, collectionId),

    add_coin: async ({
      collectionId,
      ...attributes
    }: {
      collectionId: string;
      [key: string]: unknown;
    }) => {
      const coin = await coinService.addCoin(userId, collectionId, attributes);
      actions.push(`Added coin "${formatCoinTitle(coin)}"`);
      if (imageDataUrl) {
        try {
          const [meta, b64] = imageDataUrl.split(",");
          const mimeType = meta.split(":")[1].split(";")[0];
          await setCoinImage(userId, coin.id, mimeType, Buffer.from(b64, "base64"));
          actions.push("Saved coin photo");
        } catch (err) {
          logger.error("Assistant setCoinImage failed", {
            tool: "setCoinImage",
            error: err instanceof Error ? err.message : String(err),
          });
          actions.push(`⚠ Photo not saved: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      return coin;
    },

    edit_coin: async ({
      coinId,
      ...patch
    }: {
      coinId: string;
      [key: string]: unknown;
    }) => {
      const coin = await coinService.editCoin(userId, coinId, patch);
      actions.push(`Edited coin "${formatCoinTitle(coin)}"`);
      return coin;
    },

    delete_coin: async ({ coinId }: { coinId: string }) => {
      await coinService.deleteCoin(userId, coinId);
      actions.push(`Deleted a coin`);
      return { deleted: true };
    },

    list_valuations: ({ coinId }: { coinId: string }) =>
      valuationService.listValuations(userId, coinId),

    record_valuation: async ({
      coinId,
      ...valuation
    }: {
      coinId: string;
      [key: string]: unknown;
    }) => {
      const recorded = await valuationService.recordValuation(
        userId,
        coinId,
        valuation,
      );
      actions.push(`Recorded a valuation of ${recorded.amount} ${recorded.currency}`);
      return recorded;
    },

    get_portfolio_summary: async () => {
      const u = await userRepository.findById(userId);
      return getPortfolioSummary(userId, u?.baseCurrency ?? null);
    },
  };
}

const optionalText = { type: "string" } as const;

// Coin attribute properties shared by the add_coin / edit_coin tool schemas.
// Years are integers (negative = BC) given as a range; auctionDate is YYYY-MM-DD.
const coinAttributeProps = {
  issuingAuthority: optionalText,
  category: optionalText,
  yearFrom: { type: "integer" },
  yearTo: { type: "integer" },
  denomination: optionalText,
  mint: optionalText,
  metal: optionalText,
  grade: { type: "string", enum: ["G", "VG", "F", "VF", "EF", "AU", "MS"] },
  weight: { type: "number", description: "grams" },
  diameter: { type: "number", description: "millimetres" },
  obverseDescription: optionalText,
  reverseDescription: optionalText,
  observations: optionalText,
  catalogueReferences: optionalText,
  pedigree: optionalText,
  auctionHouse: optionalText,
  auctionName: optionalText,
  auctionLot: optionalText,
  auctionDate: { type: "string", description: "YYYY-MM-DD" },
  hammerPrice: { type: "number", description: "price paid: hammer price" },
  auctionPremium: { type: "number", description: "price paid: buyer's premium" },
  shippingCost: { type: "number", description: "price paid: shipping" },
  taxCost: { type: "number", description: "price paid: tax" },
  finalPrice: {
    type: "number",
    description:
      "total price paid; computed from hammer+premium+shipping+tax when those are given",
  },
  priceCurrency: { type: "string", description: "ISO 4217 code for the price paid" },
} as const;

// Function-tool schemas exposed to the model (no userId — it is injected
// server-side). `strict: false` so optional fields can be omitted.
const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_collections",
      description: "List all of the user's collections (id, name, createdAt).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_collection",
      description: "Create a new collection for the user.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rename_collection",
      description: "Rename one of the user's collections.",
      parameters: {
        type: "object",
        properties: {
          collectionId: { type: "string" },
          name: { type: "string" },
        },
        required: ["collectionId", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_collection",
      description:
        "Delete a collection and all of its coins. Irreversible — confirm with the user first.",
      parameters: {
        type: "object",
        properties: { collectionId: { type: "string" } },
        required: ["collectionId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_coins",
      description: "List the coins in one of the user's collections.",
      parameters: {
        type: "object",
        properties: { collectionId: { type: "string" } },
        required: ["collectionId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_coin",
      description:
        "Add a coin to a collection. All attributes are optional (coins have no " +
        "name — they are identified by their attributes). Years are negative for " +
        "BC; use yearFrom/yearTo (equal when a single year is known).",
      parameters: {
        type: "object",
        properties: {
          collectionId: { type: "string" },
          ...coinAttributeProps,
        },
        required: ["collectionId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_coin",
      description: "Edit attributes of a coin. Provide only the fields to change.",
      parameters: {
        type: "object",
        properties: {
          coinId: { type: "string" },
          ...coinAttributeProps,
        },
        required: ["coinId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_coin",
      description:
        "Delete a coin and its valuations. Irreversible — confirm with the user first.",
      parameters: {
        type: "object",
        properties: { coinId: { type: "string" } },
        required: ["coinId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_valuations",
      description: "List the valuation history of a coin (most recent first).",
      parameters: {
        type: "object",
        properties: { coinId: { type: "string" } },
        required: ["coinId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_valuation",
      description:
        "Record a valuation for a coin. valuedAt is an ISO date and cannot be in the future.",
      parameters: {
        type: "object",
        properties: {
          coinId: { type: "string" },
          amount: { type: "number" },
          currency: { type: "string" },
          valuedAt: { type: "string" },
          source: optionalText,
          sourceUrl: { type: "string", description: "link to the sale/hammer page" },
        },
        required: ["coinId", "amount", "currency", "valuedAt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_portfolio_summary",
      description:
        "Get aggregate portfolio analytics: total value per currency, allocation, and trend.",
      parameters: { type: "object", properties: {} },
    },
  },
];

type ToolHandlers = Record<
  string,
  (input: Record<string, unknown>) => Promise<unknown> | unknown
>;

/**
 * What the model is allowed to see and do this turn.
 *
 * Read-only mode (the demo tenant — ADR-016) is enforced in two places at once:
 * the tool *set* loses the mutating tools, so the model is never offered one; and
 * the *handler map* loses them too, so a hallucinated or injected call for a
 * write tool finds nothing to execute. Either alone would do; both mean the demo
 * cannot be edited even if the model misbehaves.
 *
 * Pure and exported so it can be tested without standing up an OpenAI client.
 */
export function selectToolset(
  userId: string,
  actions: string[],
  imageDataUrl: string | null | undefined,
  readOnly: boolean,
): {
  tools: OpenAI.Chat.Completions.ChatCompletionTool[];
  handlers: ToolHandlers;
  systemPrompt: string;
} {
  const handlers = buildHandlers(userId, actions, imageDataUrl) as unknown as ToolHandlers;
  if (!readOnly) {
    return { tools: TOOLS, handlers, systemPrompt: SYSTEM_PROMPT };
  }

  const allowed = (name: string) =>
    (READ_ONLY_TOOLS as readonly string[]).includes(name);

  return {
    // ChatCompletionTool is a union (function | custom), so narrow before reading
    // the name. Every tool we define is a function tool.
    tools: TOOLS.filter(
      (tool) => tool.type === "function" && allowed(tool.function.name),
    ),
    handlers: Object.fromEntries(
      Object.entries(handlers).filter(([name]) => allowed(name)),
    ),
    systemPrompt: READ_ONLY_SYSTEM_PROMPT,
  };
}

export async function chat(
  userId: string,
  messages: ChatMessage[],
  imageDataUrl?: string | null,
  options: { readOnly?: boolean } = {},
): Promise<ChatResult> {
  const client = new OpenAI();
  const actions: string[] = [];
  const { tools, handlers, systemPrompt } = selectToolset(
    userId,
    actions,
    imageDataUrl,
    options.readOnly ?? false,
  );

  const convo: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: convo,
      tools,
    });

    const message = completion.choices[0]?.message;
    if (!message) break;

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { reply: (message.content ?? "").trim(), actions };
    }

    // Preserve the assistant turn (carrying the tool_calls) before answering them.
    convo.push(message);

    for (const call of message.tool_calls) {
      if (call.type !== "function") continue;
      const handler = handlers[call.function.name];
      let content: string;
      try {
        const args = call.function.arguments
          ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
          : {};
        const result = handler
          ? await handler(args)
          : `Error: unknown tool ${call.function.name}`;
        content = typeof result === "string" ? result : JSON.stringify(result);
      } catch (error) {
        content = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
      convo.push({ role: "tool", tool_call_id: call.id, content });
    }
  }

  return {
    reply:
      "I wasn't able to finish that in a reasonable number of steps. Please try rephrasing or breaking it into smaller requests.",
    actions,
  };
}
