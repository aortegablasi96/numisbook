import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { setBaseCurrency, setLocale, updateDisplayName } from "./user.service";
import { userRepository } from "@/repositories/user.repository";

vi.mock("@/repositories/user.repository", () => ({
  userRepository: {
    updateBaseCurrency: vi.fn(),
    updateName: vi.fn(),
    updateLocale: vi.fn(),
  },
}));

const repo = vi.mocked(userRepository);

beforeEach(() => {
  vi.clearAllMocks();
  repo.updateBaseCurrency.mockResolvedValue(undefined);
  repo.updateName.mockResolvedValue(undefined);
  repo.updateLocale.mockResolvedValue(undefined);
});

describe("setBaseCurrency", () => {
  it("persists a valid ISO 4217 code", async () => {
    await setBaseCurrency("user-1", "EUR");
    expect(repo.updateBaseCurrency).toHaveBeenCalledWith("user-1", "EUR");
  });

  it("treats an empty string as clearing the preference (null)", async () => {
    await setBaseCurrency("user-1", "");
    expect(repo.updateBaseCurrency).toHaveBeenCalledWith("user-1", null);
  });

  it("accepts null to clear the preference", async () => {
    await setBaseCurrency("user-1", null);
    expect(repo.updateBaseCurrency).toHaveBeenCalledWith("user-1", null);
  });

  it.each(["us", "USDD", "123", "eur"])(
    "rejects a malformed code (%s) without touching the repository",
    async (bad) => {
      await expect(setBaseCurrency("user-1", bad)).rejects.toBeInstanceOf(
        ZodError,
      );
      expect(repo.updateBaseCurrency).not.toHaveBeenCalled();
    },
  );
});

describe("updateDisplayName", () => {
  it("persists a valid name and returns it", async () => {
    const result = await updateDisplayName("user-1", "Ada Lovelace");
    expect(repo.updateName).toHaveBeenCalledWith("user-1", "Ada Lovelace");
    expect(result).toBe("Ada Lovelace");
  });

  it("trims surrounding whitespace before persisting", async () => {
    const result = await updateDisplayName("user-1", "  Ada  ");
    expect(repo.updateName).toHaveBeenCalledWith("user-1", "Ada");
    expect(result).toBe("Ada");
  });

  it.each(["", "   "])(
    "rejects an empty/whitespace-only name (%j) without touching the repository",
    async (bad) => {
      await expect(updateDisplayName("user-1", bad)).rejects.toBeInstanceOf(
        ZodError,
      );
      expect(repo.updateName).not.toHaveBeenCalled();
    },
  );

  it("rejects a name longer than 80 characters", async () => {
    await expect(
      updateDisplayName("user-1", "a".repeat(81)),
    ).rejects.toBeInstanceOf(ZodError);
    expect(repo.updateName).not.toHaveBeenCalled();
  });
});

describe("setLocale", () => {
  it("persists a supported locale and returns it", async () => {
    const result = await setLocale("user-1", "es");
    expect(repo.updateLocale).toHaveBeenCalledWith("user-1", "es");
    expect(result).toBe("es");
  });

  it("treats an empty string as clearing the preference (null)", async () => {
    const result = await setLocale("user-1", "");
    expect(repo.updateLocale).toHaveBeenCalledWith("user-1", null);
    expect(result).toBeNull();
  });

  it("accepts null to clear the preference", async () => {
    const result = await setLocale("user-1", null);
    expect(repo.updateLocale).toHaveBeenCalledWith("user-1", null);
    expect(result).toBeNull();
  });

  it.each(["EN", "xx", "en-US", "klingon"])(
    "rejects an unsupported locale (%s) without touching the repository",
    async (bad) => {
      await expect(setLocale("user-1", bad)).rejects.toBeInstanceOf(ZodError);
      expect(repo.updateLocale).not.toHaveBeenCalled();
    },
  );
});
