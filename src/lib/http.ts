// Client-side fetch helpers shared by the domain "manager" components. Keeps
// error messaging consistent: a failed Response yields the API's { error } text
// (or a fallback), and a thrown fetch (offline, server unreachable, aborted)
// yields a friendly network message instead of failing silently.

/** Read a JSON `{ error }` message from a non-OK Response, with a safe fallback. */
export async function readError(
  response: Response,
  fallback = "Something went wrong.",
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

/** Shown when `fetch` itself rejects (no response): network down, aborted, etc. */
export const NETWORK_ERROR =
  "Couldn’t reach the server. Check your connection and try again.";
