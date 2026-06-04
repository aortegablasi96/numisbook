import { userRepository, type User } from "@/repositories/user.repository";

// Framework-agnostic shape of what Auth.js hands us. The route / Server
// Component calls `auth()` (Next-specific) and passes the result here, so this
// service stays free of Request/Response and React.
export type AuthSession = {
  user?: { id?: string | null } | null;
} | null;

/**
 * Resolve the authenticated session into a domain user.
 * Returns null when there is no session, the session carries no user id, or
 * the referenced user no longer exists.
 */
export async function resolveCurrentUser(
  session: AuthSession,
): Promise<User | null> {
  const id = session?.user?.id;
  if (!id) return null;
  return userRepository.findById(id);
}
