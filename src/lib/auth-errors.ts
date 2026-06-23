// Maps Auth.js sign-in error codes (passed to the custom error page as the
// `?error=` query param) to collector-friendly, non-leaky copy. Pure and
// framework-agnostic so it can be unit-tested without a DOM or Auth.js.
//
// Auth.js v5 surfaces a small set of error codes on the error page; we group
// them by what the user can do about them rather than echoing internals.

export type AuthErrorMessage = {
  /** Short heading for the error card. */
  title: string;
  /** One or two plain-language sentences explaining what happened. */
  body: string;
};

/**
 * Resolve a friendly message for an Auth.js error code. Unknown or missing
 * codes fall back to a generic (but reassuring) message — we never surface the
 * raw code or any provider internals to the user.
 */
export function authErrorMessage(code?: string | null): AuthErrorMessage {
  switch (code) {
    case "AccessDenied":
      return {
        title: "Sign-in was cancelled",
        body:
          "You'll need to approve access with Google to continue. No information was shared.",
      };
    case "Configuration":
      return {
        title: "Sign-in is temporarily unavailable",
        body:
          "We couldn't start the sign-in process. This is on our side — please try again in a moment.",
      };
    case "Verification":
      return {
        title: "This sign-in link has expired",
        body:
          "The link is no longer valid. Please start the sign-in process again.",
      };
    default:
      return {
        title: "We couldn't sign you in",
        body:
          "Something went wrong while signing you in with Google. Please try again.",
      };
  }
}
