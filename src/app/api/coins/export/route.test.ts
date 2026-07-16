import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth boundary (used by currentUser in ../../_lib) and the service.
// Zod validation is deliberately real — the 400 case must exercise the actual
// search contract (ADR-015), not a stub of it.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/coin.service", () => ({ exportAllCoins: vi.fn() }));

import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { exportAllCoins } from "@/services/coin.service";
import { GET } from "./route";

const user = {
  id: "u1",
  name: "Ada",
  email: "ada@example.com",
  emailVerified: null,
  image: null,
  baseCurrency: null,
  locale: null,
  theme: null,
  isDemo: false,
  createdAt: new Date(),
};

function signedIn(overrides: Partial<typeof user> = {}) {
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
  vi.mocked(resolveCurrentUser).mockResolvedValue({ ...user, ...overrides });
}
function signedOut() {
  vi.mocked(auth).mockResolvedValue(null as never);
  vi.mocked(resolveCurrentUser).mockResolvedValue(null);
}

const request = (query = "") =>
  new Request(`http://test/api/coins/export${query}`);

const anExport = { filename: "numisbook-coins-2026-07-16.csv", csv: "title\r\n" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/coins/export", () => {
  it("401s when unauthenticated", async () => {
    signedOut();
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(exportAllCoins).not.toHaveBeenCalled();
  });

  it("returns the CSV as a download", async () => {
    signedIn();
    vi.mocked(exportAllCoins).mockResolvedValue(anExport);

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="numisbook-coins-2026-07-16.csv"',
    );
    expect(await res.text()).toBe(anExport.csv);
  });

  it("never lets a tenant's inventory into a shared cache", async () => {
    signedIn();
    vi.mocked(exportAllCoins).mockResolvedValue(anExport);
    const res = await GET(request());
    expect(res.headers.get("Cache-Control")).toBe("private, no-cache");
  });

  it("passes the search contract through, ignoring page", async () => {
    signedIn();
    vi.mocked(exportAllCoins).mockResolvedValue(anExport);

    await GET(request("?metal=Silver&metal=Gold&grade=EF&q=denarius&page=3"));

    expect(exportAllCoins).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        metals: ["Silver", "Gold"],
        grades: ["EF"],
        q: "denarius",
      }),
    );
  });

  it("acts as the session's user, never a client-supplied one", async () => {
    // Tenant isolation: coins carry no user_id, so the acting id must come from
    // the session even though this route is not nested under a collection.
    signedIn();
    vi.mocked(exportAllCoins).mockResolvedValue(anExport);

    await GET(request("?userId=someone-else"));

    expect(exportAllCoins).toHaveBeenCalledWith("u1", expect.anything());
  });

  it("400s on an invalid filter, without reaching the service", async () => {
    signedIn();
    const res = await GET(request("?grade=NOT_A_GRADE"));
    expect(res.status).toBe(400);
    expect(exportAllCoins).not.toHaveBeenCalled();
  });

  it("lets the read-only demo tenant export", async () => {
    // An export is a read: assertWritable does not apply (ADR-016/ADR-017 §10).
    signedIn({ isDemo: true });
    vi.mocked(exportAllCoins).mockResolvedValue(anExport);

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(exportAllCoins).toHaveBeenCalled();
  });

  it("returns a JSON error rather than a downloadable error body", async () => {
    // If this regressed, a browser would save the failure as a .csv.
    signedIn();
    vi.mocked(exportAllCoins).mockRejectedValue(new Error("boom"));

    const res = await GET(request());

    expect(res.status).toBe(500);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("Content-Disposition")).toBeNull();
  });
});
