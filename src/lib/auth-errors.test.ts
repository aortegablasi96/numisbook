import { describe, it, expect } from "vitest";
import { authErrorMessage } from "./auth-errors";

describe("authErrorMessage", () => {
  it("treats AccessDenied as a benign cancellation", () => {
    const msg = authErrorMessage("AccessDenied");
    expect(msg.title).toMatch(/cancelled/i);
    expect(msg.body).not.toMatch(/AccessDenied/);
  });

  it("frames Configuration as a temporary server-side problem", () => {
    const msg = authErrorMessage("Configuration");
    expect(msg.title).toMatch(/unavailable/i);
  });

  it("explains an expired Verification link", () => {
    const msg = authErrorMessage("Verification");
    expect(msg.title).toMatch(/expired/i);
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(authErrorMessage("SomethingNew").title).toBe(
      authErrorMessage("OAuthCallbackError").title,
    );
  });

  it("falls back to a generic message when no code is given", () => {
    expect(authErrorMessage().title).toMatch(/couldn't sign you in/i);
    expect(authErrorMessage(null).title).toMatch(/couldn't sign you in/i);
    expect(authErrorMessage(undefined).title).toMatch(/couldn't sign you in/i);
  });

  it("never leaks the raw code in any message", () => {
    for (const code of ["AccessDenied", "Configuration", "Verification", "Weird"]) {
      const msg = authErrorMessage(code);
      expect(msg.title).not.toContain(code);
      expect(msg.body).not.toContain(code);
    }
  });
});
