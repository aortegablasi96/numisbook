import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError } from "@/lib/errors";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/collection.service", () => ({
  renameCollection: vi.fn(),
  deleteCollection: vi.fn(),
}));

import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import {
  renameCollection,
  deleteCollection,
} from "@/services/collection.service";
import { PATCH, DELETE } from "./route";

const user = {
  id: "u1",
  name: "Ada",
  email: "ada@example.com",
  emailVerified: null,
  image: null,
  baseCurrency: null,
  locale: null,
  theme: null, isDemo: false,
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

const params = { params: Promise.resolve({ id: "c1" }) };

function patchRequest(body: unknown) {
  return new Request("http://test/api/collections/c1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/collections/[id]", () => {
  it("401s when unauthenticated", async () => {
    signedOut();
    const res = await PATCH(patchRequest({ name: "Greek" }), params);
    expect(res.status).toBe(401);
  });

  it("renames and returns 200", async () => {
    signedIn();
    const updated = { id: "c1", userId: "u1", name: "Greek", createdAt: new Date() };
    vi.mocked(renameCollection).mockResolvedValue(updated);
    const res = await PATCH(patchRequest({ name: "Greek" }), params);
    expect(res.status).toBe(200);
    expect(renameCollection).toHaveBeenCalledWith("u1", "c1", "Greek");
    expect((await res.json()).collection.name).toBe("Greek");
  });

  it("maps NotFoundError to 404", async () => {
    signedIn();
    vi.mocked(renameCollection).mockRejectedValue(new NotFoundError());
    const res = await PATCH(patchRequest({ name: "Greek" }), params);
    expect(res.status).toBe(404);
  });

  it("400s on invalid body", async () => {
    signedIn();
    const res = await PATCH(patchRequest({ name: "" }), params);
    expect(res.status).toBe(400);
    expect(renameCollection).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/collections/[id]", () => {
  it("401s when unauthenticated", async () => {
    signedOut();
    const res = await DELETE(new Request("http://test/api/collections/c1"), params);
    expect(res.status).toBe(401);
  });

  it("deletes and returns 204", async () => {
    signedIn();
    vi.mocked(deleteCollection).mockResolvedValue(undefined);
    const res = await DELETE(new Request("http://test/api/collections/c1"), params);
    expect(res.status).toBe(204);
    expect(deleteCollection).toHaveBeenCalledWith("u1", "c1");
  });

  it("maps NotFoundError to 404", async () => {
    signedIn();
    vi.mocked(deleteCollection).mockRejectedValue(new NotFoundError());
    const res = await DELETE(new Request("http://test/api/collections/c1"), params);
    expect(res.status).toBe(404);
  });
});
