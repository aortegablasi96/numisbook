import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth boundary (used by currentUser in ../_lib) and the services.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/user.service", () => ({ updateDisplayName: vi.fn() }));
vi.mock("@/services/account.service", () => ({ deleteAccount: vi.fn() }));

import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { updateDisplayName } from "@/services/user.service";
import { deleteAccount } from "@/services/account.service";
import { PATCH, DELETE } from "./route";

const user = {
  id: "u1",
  name: "Ada",
  email: "ada@example.com",
  emailVerified: null,
  image: null,
  baseCurrency: null,
  locale: null,
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

function patchRequest(body: unknown) {
  return new Request("http://test/api/user", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/user", () => {
  it("401s when unauthenticated", async () => {
    signedOut();
    const res = await PATCH(patchRequest({ name: "Grace" }));
    expect(res.status).toBe(401);
    expect(updateDisplayName).not.toHaveBeenCalled();
  });

  it("400s on invalid input (empty name) via real validation", async () => {
    signedIn();
    const res = await PATCH(patchRequest({ name: "" }));
    expect(res.status).toBe(400);
    expect(updateDisplayName).not.toHaveBeenCalled();
  });

  it("updates the name and returns it", async () => {
    signedIn();
    vi.mocked(updateDisplayName).mockResolvedValue("Grace Hopper");
    const res = await PATCH(patchRequest({ name: "Grace Hopper" }));
    expect(res.status).toBe(200);
    expect(updateDisplayName).toHaveBeenCalledWith("u1", "Grace Hopper");
    const body = await res.json();
    expect(body.name).toBe("Grace Hopper");
  });
});

describe("DELETE /api/user", () => {
  it("401s when unauthenticated", async () => {
    signedOut();
    const res = await DELETE();
    expect(res.status).toBe(401);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes the account and returns 204", async () => {
    signedIn();
    vi.mocked(deleteAccount).mockResolvedValue(undefined);
    const res = await DELETE();
    expect(res.status).toBe(204);
    expect(deleteAccount).toHaveBeenCalledWith("u1");
  });
});
