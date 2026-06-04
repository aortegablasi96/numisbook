import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveCurrentUser } from "./auth.service";
import { userRepository, type User } from "@/repositories/user.repository";

vi.mock("@/repositories/user.repository", () => ({
  userRepository: { findById: vi.fn() },
}));

const findById = vi.mocked(userRepository.findById);

const fakeUser: User = {
  id: "user-1",
  name: "Ada",
  email: "ada@example.com",
  emailVerified: null,
  image: null,
  createdAt: new Date(),
};

describe("resolveCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when there is no session", async () => {
    expect(await resolveCurrentUser(null)).toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });

  it("returns null when the session carries no user id", async () => {
    expect(await resolveCurrentUser({ user: {} })).toBeNull();
    expect(await resolveCurrentUser({ user: { id: null } })).toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });

  it("returns the user for a valid session", async () => {
    findById.mockResolvedValue(fakeUser);
    const user = await resolveCurrentUser({ user: { id: "user-1" } });
    expect(user).toEqual(fakeUser);
    expect(findById).toHaveBeenCalledWith("user-1");
  });

  it("returns null when the referenced user no longer exists", async () => {
    findById.mockResolvedValue(null);
    expect(await resolveCurrentUser({ user: { id: "ghost" } })).toBeNull();
    expect(findById).toHaveBeenCalledWith("ghost");
  });
});
