import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildHandlers, chat, MAX_REQUEST_TOKENS } from "./assistant.service";
import { recordUsage } from "@/services/assistant-limits.service";
import * as collectionService from "@/services/collection.service";
import * as coinService from "@/services/coin.service";
import * as valuationService from "@/services/valuation.service";
import * as analyticsService from "@/services/analytics.service";

vi.mock("@/services/collection.service", () => ({
  listCollections: vi.fn(),
  createCollection: vi.fn(),
  renameCollection: vi.fn(),
  deleteCollection: vi.fn(),
}));
vi.mock("@/services/coin.service", () => ({
  listCoins: vi.fn(),
  addCoin: vi.fn(),
  editCoin: vi.fn(),
  deleteCoin: vi.fn(),
}));
vi.mock("@/services/valuation.service", () => ({
  listValuations: vi.fn(),
  recordValuation: vi.fn(),
}));
vi.mock("@/services/analytics.service", () => ({
  getPortfolioSummary: vi.fn(),
}));
vi.mock("@/services/coinImage.service", () => ({
  setCoinImage: vi.fn(),
}));
vi.mock("@/repositories/user.repository", () => ({
  userRepository: { findById: vi.fn() },
}));
// assistant.service now records usage through this service, which reaches the
// database — mock it so importing the module under test does not touch @/db.
vi.mock("@/services/assistant-limits.service", () => ({ recordUsage: vi.fn() }));


const collections = vi.mocked(collectionService);
const coins = vi.mocked(coinService);
const valuations = vi.mocked(valuationService);
const analytics = vi.mocked(analyticsService);
const usageRecorded = vi.mocked(recordUsage);
// The OpenAI client is injected (see ChatOptions.client), so no module mocking
// is needed — this spy stands in for `chat.completions.create`.
const openAiCreate = vi.fn();
const fakeClient = { chat: { completions: { create: openAiCreate } } } as never;

const USER = "user-1";

beforeEach(() => vi.clearAllMocks());

describe("assistant handlers — tenant scoping", () => {
  // The security invariant: the model never supplies a userId; every handler
  // forwards the server-captured user id to the domain service.
  it("injects the acting user's id into every read and write", async () => {
    const actions: string[] = [];
    const h = buildHandlers(USER, actions);

    // Mutating handlers read fields off the result; give them shapes to return.
    const collection = { id: "c1", userId: USER, name: "Rome", createdAt: new Date() };
    const coin = {
      id: "k1",
      collectionId: "c1",
      issuingAuthority: null,
      category: null,
      yearFrom: null,
      yearTo: null,
      denomination: null,
      mint: null,
      metal: null,
      grade: null,
      weight: null,
      diameter: null,
      obverseDescription: null,
      reverseDescription: null,
      observations: null,
      catalogueReferences: null,
      pedigree: null,
      auctionHouse: null,
      auctionName: null,
      auctionLot: null,
      auctionDate: null,
      hammerPrice: null,
      auctionPremium: null,
      shippingCost: null,
      taxCost: null,
      finalPrice: null,
      priceCurrency: null,
      createdAt: new Date(),
    };
    collections.createCollection.mockResolvedValue(collection);
    collections.renameCollection.mockResolvedValue(collection);
    coins.addCoin.mockResolvedValue(coin);
    coins.editCoin.mockResolvedValue(coin);
    valuations.recordValuation.mockResolvedValue({
      id: "v1",
      coinId: "k1",
      amount: "100.00",
      currency: "USD",
      source: null,
      sourceUrl: null,
      valuedAt: new Date(),
      createdAt: new Date(),
    });

    await h.list_collections();
    expect(collections.listCollections).toHaveBeenCalledWith(USER);

    await h.create_collection({ name: "Rome" });
    expect(collections.createCollection).toHaveBeenCalledWith(USER, "Rome");

    await h.rename_collection({ collectionId: "c1", name: "Greek" });
    expect(collections.renameCollection).toHaveBeenCalledWith(USER, "c1", "Greek");

    await h.delete_collection({ collectionId: "c1" });
    expect(collections.deleteCollection).toHaveBeenCalledWith(USER, "c1");

    await h.list_coins({ collectionId: "c1" });
    expect(coins.listCoins).toHaveBeenCalledWith(USER, "c1");

    await h.add_coin({ collectionId: "c1", category: "Romans", metal: "silver" });
    expect(coins.addCoin).toHaveBeenCalledWith(USER, "c1", {
      category: "Romans",
      metal: "silver",
    });

    await h.edit_coin({ coinId: "k1", grade: "VF" });
    expect(coins.editCoin).toHaveBeenCalledWith(USER, "k1", { grade: "VF" });

    await h.delete_coin({ coinId: "k1" });
    expect(coins.deleteCoin).toHaveBeenCalledWith(USER, "k1");

    await h.list_valuations({ coinId: "k1" });
    expect(valuations.listValuations).toHaveBeenCalledWith(USER, "k1");

    await h.record_valuation({
      coinId: "k1",
      amount: 100,
      currency: "USD",
      valuedAt: "2026-01-01",
    });
    expect(valuations.recordValuation).toHaveBeenCalledWith(USER, "k1", {
      amount: 100,
      currency: "USD",
      valuedAt: "2026-01-01",
    });

    await h.get_portfolio_summary();
    // The user's saved base-currency preference is resolved and forwarded;
    // with no stored preference it falls back to null (auto).
    expect(analytics.getPortfolioSummary).toHaveBeenCalledWith(USER, null);
  });

  it("logs mutations (not reads) to the actions list", async () => {
    const actions: string[] = [];
    const h = buildHandlers(USER, actions);

    collections.createCollection.mockResolvedValue({
      id: "c1",
      userId: USER,
      name: "Rome",
      createdAt: new Date(),
    });
    coins.addCoin.mockResolvedValue({
      id: "k1",
      collectionId: "c1",
      issuingAuthority: null,
      category: "Romans",
      yearFrom: null,
      yearTo: null,
      denomination: null,
      mint: null,
      metal: null,
      grade: null,
      weight: null,
      diameter: null,
      obverseDescription: null,
      reverseDescription: null,
      observations: null,
      catalogueReferences: null,
      pedigree: null,
      auctionHouse: null,
      auctionName: null,
      auctionLot: null,
      auctionDate: null,
      hammerPrice: null,
      auctionPremium: null,
      shippingCost: null,
      taxCost: null,
      finalPrice: null,
      priceCurrency: null,
      createdAt: new Date(),
    });

    await h.list_collections();
    expect(actions).toHaveLength(0); // reads don't log

    await h.create_collection({ name: "Rome" });
    await h.add_coin({ collectionId: "c1", category: "Romans" });
    expect(actions).toEqual([
      'Created collection "Rome"',
      'Added coin "Romans"',
    ]);
  });
});

// --- Cost accounting (#195, ADR-018 §2) -------------------------------------

describe("chat — token accounting and the request ceiling", () => {
  beforeEach(() => {
    openAiCreate.mockReset();
    usageRecorded.mockReset();
    usageRecorded.mockResolvedValue(undefined);
  });

  /** A completion with no tool calls — ends the loop. */
  function finalReply(text: string, prompt = 10, completion = 5) {
    return {
      choices: [{ message: { content: text, tool_calls: [] } }],
      usage: { prompt_tokens: prompt, completion_tokens: completion },
    };
  }

  /** A completion asking for one `list_collections` call — continues the loop. */
  function toolCall(prompt = 10, completion = 5) {
    return {
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: "call-1",
                type: "function",
                function: { name: "list_collections", arguments: "{}" },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: prompt, completion_tokens: completion },
    };
  }

  it("records one usage row per request, summed across iterations", async () => {
    collections.listCollections.mockResolvedValue([]);
    openAiCreate
      .mockResolvedValueOnce(toolCall(100, 20))
      .mockResolvedValueOnce(finalReply("done", 200, 30));

    const result = await chat(USER, [{ role: "user", content: "hi" }], null, {
      subjectKey: "user:u1",
      client: fakeClient,
    });

    expect(result.reply).toBe("done");
    // Each iteration resends the conversation, so the cost is the sum.
    expect(usageRecorded).toHaveBeenCalledTimes(1);
    expect(usageRecorded).toHaveBeenCalledWith({
      subjectKey: "user:u1",
      promptTokens: 300,
      completionTokens: 50,
      outcome: "completed",
    });
  });

  it("stops once the request ceiling is passed, and says so honestly", async () => {
    collections.listCollections.mockResolvedValue([]);
    openAiCreate.mockResolvedValue(toolCall(MAX_REQUEST_TOKENS, 1));

    const result = await chat(USER, [{ role: "user", content: "hi" }], null, {
      subjectKey: "user:u1",
      client: fakeClient,
    });

    expect(result.reply).toMatch(/stopped partway/i);
    // Cut short well before the 12-iteration cap — the ceiling, not the counter.
    expect(openAiCreate).toHaveBeenCalledTimes(1);
    expect(usageRecorded).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "limit_exceeded" }),
    );
  });

  // "Never leaves a partial mutation misreported as complete": whatever the
  // model already did must still reach the user when the ceiling cuts in.
  it("still reports the mutations it already performed when cut short", async () => {
    collections.createCollection.mockResolvedValue({
      id: "c1",
      userId: USER,
      name: "Rome",
      createdAt: new Date(),
    });
    openAiCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: "call-1",
                type: "function",
                function: {
                  name: "create_collection",
                  arguments: JSON.stringify({ name: "Rome" }),
                },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: MAX_REQUEST_TOKENS, completion_tokens: 0 },
    });

    const result = await chat(USER, [{ role: "user", content: "add Rome" }], null, {
      subjectKey: "user:u1",
      client: fakeClient,
    });

    expect(result.actions).toContain('Created collection "Rome"');
  });

  it("records usage even when the request fails mid-loop", async () => {
    openAiCreate.mockRejectedValue(new Error("openai down"));

    await expect(
      chat(USER, [{ role: "user", content: "hi" }], null, { subjectKey: "user:u1", client: fakeClient }),
    ).rejects.toThrow("openai down");

    expect(usageRecorded).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "error" }),
    );
  });

  // Aborting must not become a way to spend tokens for free.
  it("records usage when the caller aborts mid-loop", async () => {
    const controller = new AbortController();
    collections.listCollections.mockResolvedValue([]);
    openAiCreate.mockImplementation(async () => {
      controller.abort();
      return toolCall(50, 10);
    });

    const result = await chat(USER, [{ role: "user", content: "hi" }], null, {
      subjectKey: "user:u1",
      signal: controller.signal,
      client: fakeClient,
    });

    expect(result.reply).toBe("");
    expect(usageRecorded).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "aborted", promptTokens: 50 }),
    );
  });

  // The reply is already earned and the tokens already spent; an accounting
  // failure must not turn a good response into an error for the user.
  it("does not fail the request when the usage write fails", async () => {
    usageRecorded.mockRejectedValue(new Error("db down"));
    openAiCreate.mockResolvedValueOnce(finalReply("done"));

    const result = await chat(USER, [{ role: "user", content: "hi" }], null, {
      subjectKey: "user:u1",
      client: fakeClient,
    });

    expect(result.reply).toBe("done");
  });
});
