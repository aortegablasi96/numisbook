import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/archive.service", () => ({ exportArchive: vi.fn() }));

import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { exportArchive } from "@/services/archive.service";
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/account/archive", () => {
  it("401s when unauthenticated", async () => {
    signedOut();
    const res = await GET();
    expect(res.status).toBe(401);
    expect(exportArchive).not.toHaveBeenCalled();
  });

  it("streams the zip with download headers, scoped to the session user", async () => {
    signedIn();
    vi.mocked(exportArchive).mockResolvedValue({
      filename: "numisbook-archive-2026-07-17.zip",
      zip: Buffer.from("PK-zip-bytes"),
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(exportArchive).toHaveBeenCalledWith("u1");
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    expect(res.headers.get("Content-Disposition")).toContain("numisbook-archive-2026-07-17.zip");
    expect(res.headers.get("Cache-Control")).toBe("private, no-cache");
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe("PK-zip-bytes");
  });

  it("lets the read-only demo tenant export (a read, no write guard)", async () => {
    signedIn({ isDemo: true });
    vi.mocked(exportArchive).mockResolvedValue({
      filename: "numisbook-archive-2026-07-17.zip",
      zip: Buffer.from("demo"),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(exportArchive).toHaveBeenCalledWith("u1");
  });

  it("maps an unexpected error to a 500", async () => {
    signedIn();
    vi.mocked(exportArchive).mockRejectedValue(new Error("boom"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
