import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/coin.service", () => ({ exportCoins: vi.fn() }));

import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { exportCoins } from "@/services/coin.service";
import { NotFoundError } from "@/lib/errors";
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

function signedIn() {
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
  vi.mocked(resolveCurrentUser).mockResolvedValue(user);
}
function signedOut() {
  vi.mocked(auth).mockResolvedValue(null as never);
  vi.mocked(resolveCurrentUser).mockResolvedValue(null);
}

const request = (query = "") =>
  new Request(`http://test/api/collections/col-1/coins/export${query}`);
const params = { params: Promise.resolve({ id: "col-1" }) };

const anExport = {
  filename: "numisbook-ancient-rome-2026-07-16.csv",
  csv: "title\r\n",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/collections/[id]/coins/export", () => {
  it("401s when unauthenticated", async () => {
    signedOut();
    const res = await GET(request(), params);
    expect(res.status).toBe(401);
    expect(exportCoins).not.toHaveBeenCalled();
  });

  it("returns the collection's coins as a named download", async () => {
    signedIn();
    vi.mocked(exportCoins).mockResolvedValue(anExport);

    const res = await GET(request(), params);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="numisbook-ancient-rome-2026-07-16.csv"',
    );
    expect(exportCoins).toHaveBeenCalledWith("u1", "col-1", expect.anything());
  });

  it("passes the search contract through", async () => {
    signedIn();
    vi.mocked(exportCoins).mockResolvedValue(anExport);

    await GET(request("?metal=Silver&yearFrom=-100&yearTo=-1&page=2"), params);

    expect(exportCoins).toHaveBeenCalledWith(
      "u1",
      "col-1",
      expect.objectContaining({ metals: ["Silver"], yearFrom: -100, yearTo: -1 }),
    );
  });

  it("404s for a collection the user does not own", async () => {
    // Tenant isolation surfaces as "not found", never as another tenant's data.
    signedIn();
    vi.mocked(exportCoins).mockRejectedValue(new NotFoundError("Collection not found"));

    const res = await GET(request(), params);

    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Disposition")).toBeNull();
  });

  it("400s on an invalid filter, without reaching the service", async () => {
    signedIn();
    const res = await GET(request("?yearFrom=1&yearTo=-1"), params);
    expect(res.status).toBe(400);
    expect(exportCoins).not.toHaveBeenCalled();
  });
});
