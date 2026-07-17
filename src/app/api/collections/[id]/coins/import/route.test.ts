import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth boundary (used by currentUser in ../../../../_lib) and the
// service. The demo guard (`assertWritable`, from @/lib/demo) is deliberately
// real — a stub of it would test nothing, and it is the whole of the 403 case.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/coin.service", () => ({ importCoins: vi.fn() }));

import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { importCoins } from "@/services/coin.service";
import { NotFoundError } from "@/lib/errors";
import { MAX_IMPORT_BYTES } from "@/lib/csv-import";
import { POST } from "./route";

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

const params = { params: Promise.resolve({ id: "col-1" }) };

/** A multipart POST carrying a CSV, as the panel sends it. */
function upload(
  csv: string,
  { commit, field = "file" }: { commit?: boolean; field?: string } = {},
) {
  const body = new FormData();
  body.append(field, new File([csv], "coins.csv", { type: "text/csv" }));
  if (commit !== undefined) body.append("commit", String(commit));
  return new Request("http://test/api/collections/col-1/coins/import", {
    method: "POST",
    body,
  });
}

const report = {
  rowsRead: 2,
  toAdd: 2,
  added: 0,
  invalidRows: 0,
  errors: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/collections/[id]/coins/import", () => {
  it("401s when unauthenticated", async () => {
    signedOut();
    const res = await POST(upload("title\r\n"), params);
    expect(res.status).toBe(401);
    expect(importCoins).not.toHaveBeenCalled();
  });

  it("403s the read-only demo tenant, without reaching the service", async () => {
    // Import writes, so unlike export the demo tenant is refused (ADR-016).
    signedIn({ isDemo: true });
    const res = await POST(upload("title\r\n", { commit: true }), params);
    expect(res.status).toBe(403);
    expect(importCoins).not.toHaveBeenCalled();
  });

  it("400s when no file was sent", async () => {
    signedIn();
    const res = await POST(upload("title\r\n", { field: "csv" }), params);
    expect(res.status).toBe(400);
    expect(importCoins).not.toHaveBeenCalled();
  });

  it("400s a file over the size limit, without reading it", async () => {
    signedIn();
    const tooBig = "x".repeat(MAX_IMPORT_BYTES + 1);
    const res = await POST(upload(tooBig), params);
    expect(res.status).toBe(400);
    expect(importCoins).not.toHaveBeenCalled();
  });

  it("previews by default when commit is absent", async () => {
    // The safe default: a request that forgets the flag must not write.
    signedIn();
    vi.mocked(importCoins).mockResolvedValue(report);

    const res = await POST(upload("title\r\n"), params);

    expect(res.status).toBe(200);
    expect(importCoins).toHaveBeenCalledWith("u1", "col-1", "title\r\n", false);
  });

  it("previews when commit is false", async () => {
    signedIn();
    vi.mocked(importCoins).mockResolvedValue(report);
    await POST(upload("title\r\n", { commit: false }), params);
    expect(importCoins).toHaveBeenCalledWith("u1", "col-1", "title\r\n", false);
  });

  it("commits when commit is true, and returns the report", async () => {
    signedIn();
    vi.mocked(importCoins).mockResolvedValue({ ...report, added: 2 });

    const res = await POST(upload("title\r\n", { commit: true }), params);

    expect(res.status).toBe(200);
    expect(importCoins).toHaveBeenCalledWith("u1", "col-1", "title\r\n", true);
    expect(await res.json()).toMatchObject({ added: 2, rowsRead: 2 });
  });

  it("acts as the session's user and the routed collection, never client input", async () => {
    signedIn();
    vi.mocked(importCoins).mockResolvedValue(report);

    const body = new FormData();
    body.append("file", new File(["title\r\n"], "coins.csv", { type: "text/csv" }));
    body.append("commit", "true");
    body.append("userId", "someone-else");
    body.append("collectionId", "someone-elses-collection");
    await POST(
      new Request("http://test/api/collections/col-1/coins/import", {
        method: "POST",
        body,
      }),
      params,
    );

    expect(importCoins).toHaveBeenCalledWith("u1", "col-1", "title\r\n", true);
  });

  it("maps a domain error to its status", async () => {
    signedIn();
    vi.mocked(importCoins).mockRejectedValue(new NotFoundError("Collection not found"));
    const res = await POST(upload("title\r\n"), params);
    expect(res.status).toBe(404);
  });

  it("maps an unexpected error to a 500", async () => {
    signedIn();
    vi.mocked(importCoins).mockRejectedValue(new Error("boom"));
    const res = await POST(upload("title\r\n"), params);
    expect(res.status).toBe(500);
  });
});
