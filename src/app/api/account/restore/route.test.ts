import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth boundary and the service; the demo guard (assertWritable, from
// @/lib/demo) is deliberately real — it is the whole of the 403 case.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/archive.service", () => ({ restoreArchive: vi.fn() }));

import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { restoreArchive } from "@/services/archive.service";
import { ValidationError } from "@/lib/errors";
import { MAX_RESTORE_BYTES } from "@/lib/archive";
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

function upload(bytes: string, { field = "file" }: { field?: string } = {}) {
  const body = new FormData();
  body.append(field, new File([bytes], "archive.zip", { type: "application/zip" }));
  return new Request("http://test/api/account/restore", { method: "POST", body });
}

const summary = { collections: 1, coins: 3, valuations: 2, images: 4, invoices: 1 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/account/restore", () => {
  it("401s when unauthenticated", async () => {
    signedOut();
    const res = await POST(upload("zip"));
    expect(res.status).toBe(401);
    expect(restoreArchive).not.toHaveBeenCalled();
  });

  it("403s the read-only demo tenant, without reaching the service", async () => {
    signedIn({ isDemo: true });
    const res = await POST(upload("zip"));
    expect(res.status).toBe(403);
    expect(restoreArchive).not.toHaveBeenCalled();
  });

  it("400s when no file was sent", async () => {
    signedIn();
    const res = await POST(upload("zip", { field: "archive" }));
    expect(res.status).toBe(400);
    expect(restoreArchive).not.toHaveBeenCalled();
  });

  it("400s an archive over the size limit, without reading it", async () => {
    signedIn();
    const tooBig = "x".repeat(MAX_RESTORE_BYTES + 1);
    const res = await POST(upload(tooBig));
    expect(res.status).toBe(400);
    expect(restoreArchive).not.toHaveBeenCalled();
  });

  it("restores as the session user and returns the counts", async () => {
    signedIn();
    vi.mocked(restoreArchive).mockResolvedValue(summary);

    const res = await POST(upload("zip-bytes"));

    expect(res.status).toBe(200);
    expect(restoreArchive).toHaveBeenCalledTimes(1);
    const [userId, buf] = vi.mocked(restoreArchive).mock.calls[0];
    expect(userId).toBe("u1");
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(await res.json()).toEqual(summary);
  });

  it("maps a validation error (bad archive) to a 400", async () => {
    signedIn();
    vi.mocked(restoreArchive).mockRejectedValue(new ValidationError("not a valid archive"));
    const res = await POST(upload("garbage"));
    expect(res.status).toBe(400);
  });

  it("maps an unexpected error to a 500", async () => {
    signedIn();
    vi.mocked(restoreArchive).mockRejectedValue(new Error("boom"));
    const res = await POST(upload("zip"));
    expect(res.status).toBe(500);
  });
});
