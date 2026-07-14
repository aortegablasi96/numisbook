import { describe, it, expect, vi } from "vitest";
import { selectToolset } from "./assistant.service";

// The demo tenant is shared and read-only (ADR-016). The assistant is the one
// surface where a demo visitor still reaches the domain services, so what the
// model is handed is the whole security question: a write tool it is never
// offered, and a write handler that does not exist, cannot edit the demo.

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
vi.mock("@/services/analytics.service", () => ({ getPortfolioSummary: vi.fn() }));
vi.mock("@/services/coinImage.service", () => ({ setCoinImage: vi.fn() }));
vi.mock("@/repositories/user.repository", () => ({
  userRepository: { findById: vi.fn() },
}));

const READS = [
  "get_portfolio_summary",
  "list_coins",
  "list_collections",
  "list_valuations",
];
const WRITES = [
  "create_collection",
  "rename_collection",
  "delete_collection",
  "add_coin",
  "edit_coin",
  "delete_coin",
  "record_valuation",
];

/** Tool names on offer. ChatCompletionTool is a union, so narrow to function tools. */
function toolNames(tools: ReturnType<typeof selectToolset>["tools"]): string[] {
  return tools.flatMap((tool) =>
    tool.type === "function" ? [tool.function.name] : [],
  );
}

describe("selectToolset — read-only (demo) mode", () => {
  it("offers the model the read tools only", () => {
    const { tools } = selectToolset("demo-user", [], null, true);
    const names = toolNames(tools).sort();

    expect(names).toEqual(READS);
    for (const write of WRITES) expect(names).not.toContain(write);
  });

  it("builds no handler for any mutating tool", () => {
    // Belt and braces: even a hallucinated or prompt-injected call for a write
    // tool finds nothing to run, because the handler simply is not there.
    const { handlers } = selectToolset("demo-user", [], null, true);

    expect(Object.keys(handlers).sort()).toEqual(READS);
    for (const write of WRITES) expect(handlers[write]).toBeUndefined();
  });

  it("tells the model it is read-only, so it does not promise edits it cannot make", () => {
    const { systemPrompt } = selectToolset("demo-user", [], null, true);
    expect(systemPrompt).toMatch(/read-only demo/i);
  });
});

describe("selectToolset — ordinary user", () => {
  it("keeps every tool, read and write", () => {
    const { tools, handlers, systemPrompt } = selectToolset("real-user", [], null, false);
    const names = toolNames(tools);

    for (const tool of [...READS, ...WRITES]) {
      expect(names).toContain(tool);
      expect(handlers[tool]).toBeTypeOf("function");
    }
    expect(systemPrompt).not.toMatch(/read-only demo/i);
  });
});
