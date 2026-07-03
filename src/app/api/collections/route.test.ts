import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth boundary (used by currentUser in ../_lib) and the service.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/collection.service", () => ({
  listCollections: vi.fn(),
  createCollection: vi.fn(),
}));

import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import {
  listCollections,
  createCollection,
} from "@/services/collection.service";
import { GET, POST } from "./route";

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

function postRequest(body: unknown) {
  return new Request("http://test/api/collections", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/collections", () => {
  it("401s when unauthenticated", async () => {
    signedOut();
    const res = await GET();
    expect(res.status).toBe(401);
    expect(listCollections).not.toHaveBeenCalled();
  });

  it("returns the signed-in user's collections", async () => {
    signedIn();
    const rows = [
      { id: "c1", userId: "u1", name: "Rome", createdAt: new Date(), coinCount: 4, coverCoinId: null, coverImageId: null },
    ];
    vi.mocked(listCollections).mockResolvedValue(rows);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(listCollections).toHaveBeenCalledWith("u1");
    const body = await res.json();
    expect(body.collections).toHaveLength(1);
    expect(body.collections[0].coinCount).toBe(4);
  });
});

describe("POST /api/collections", () => {
  it("401s when unauthenticated", async () => {
    signedOut();
    const res = await POST(postRequest({ name: "Rome" }));
    expect(res.status).toBe(401);
    expect(createCollection).not.toHaveBeenCalled();
  });

  it("400s on invalid input (empty name) via real validation", async () => {
    signedIn();
    const res = await POST(postRequest({ name: "" }));
    expect(res.status).toBe(400);
    expect(createCollection).not.toHaveBeenCalled();
  });

  it("creates and returns 201", async () => {
    signedIn();
    const created = { id: "c1", userId: "u1", name: "Rome", createdAt: new Date() };
    vi.mocked(createCollection).mockResolvedValue(created);
    const res = await POST(postRequest({ name: "Rome" }));
    expect(res.status).toBe(201);
    expect(createCollection).toHaveBeenCalledWith("u1", "Rome");
    const body = await res.json();
    expect(body.collection.name).toBe("Rome");
  });
});
