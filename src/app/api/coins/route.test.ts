import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth boundary (used by currentUser in ../_lib) and the service.
// Validation is NOT mocked — the route must really reject a bad query string.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/coin.service", () => ({ searchAllCoins: vi.fn() }));

import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { searchAllCoins } from "@/services/coin.service";
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
  createdAt: new Date(),
};

function signedIn() {
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
  vi.mocked(resolveCurrentUser).mockResolvedValue(user);
}
function signedOut() {
  vi.mocked(auth).mockResolvedValue(null as never);
  vi.mocked(resolveCurrentUser).mockResolvedValue(null);
}

const request = (query = "") => new Request(`http://test/api/coins${query}`);

const emptyResult = { coins: [], total: 0, page: 1, pageSize: 20 };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/coins", () => {
  it("401s when unauthenticated", async () => {
    signedOut();
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(searchAllCoins).not.toHaveBeenCalled();
  });

  it("searches with the session user id, never one supplied by the client", async () => {
    signedIn();
    vi.mocked(searchAllCoins).mockResolvedValue(emptyResult);

    // A hand-crafted userId in the query must have no effect: the acting user is
    // resolved from the session (tenant isolation, ADR-015).
    const res = await GET(request("?userId=u2&metal=Silver"));

    expect(res.status).toBe(200);
    expect(searchAllCoins).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ metals: ["Silver"] }),
    );
  });

  it("passes repeated params through as multi-value filters", async () => {
    signedIn();
    vi.mocked(searchAllCoins).mockResolvedValue(emptyResult);

    await GET(request("?metal=Silver&metal=Gold&grade=VF&yearFrom=-400&yearTo=-300&page=2"));

    expect(searchAllCoins).toHaveBeenCalledWith("u1", {
      q: undefined,
      metals: ["Silver", "Gold"],
      categories: [],
      denominations: [],
      mints: [],
      grades: ["VF"],
      yearFrom: -400,
      yearTo: -300,
      page: 2,
      sortBy: undefined,
      sortDir: undefined,
    });
  });

  it("400s on an invalid query via real validation", async () => {
    signedIn();

    const badGrade = await GET(request("?grade=XF"));
    const invertedRange = await GET(request("?yearFrom=100&yearTo=50"));

    expect(badGrade.status).toBe(400);
    expect(invertedRange.status).toBe(400);
    expect(searchAllCoins).not.toHaveBeenCalled();
  });

  it("returns the paginated result", async () => {
    signedIn();
    vi.mocked(searchAllCoins).mockResolvedValue({
      coins: [{ id: "coin-1", collectionName: "Ancient Rome" }] as never,
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.coins[0].collectionName).toBe("Ancient Rome");
  });
});
