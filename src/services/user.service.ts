import { userRepository } from "@/repositories/user.repository";
import { baseCurrencySchema, displayNameSchema } from "@/lib/validation/user";

// User-preferences business logic. Framework-agnostic; data access goes through
// the repository. The acting userId always comes from the session, never client
// input (tenant isolation).

/**
 * Update the user's display name. Trims and length-bounds the input; rejects an
 * empty/whitespace-only name. Returns the stored (trimmed) name.
 */
export async function updateDisplayName(
  userId: string,
  input: string,
): Promise<string> {
  const name = displayNameSchema.parse(input);
  await userRepository.updateName(userId, name);
  return name;
}

/**
 * Set the user's preferred portfolio base currency. Accepts a 3-letter ISO 4217
 * code, or null/"" to clear it (revert to the dominant valuation currency).
 */
export async function setBaseCurrency(
  userId: string,
  input: string | null,
): Promise<void> {
  const baseCurrency = baseCurrencySchema.parse(input);
  await userRepository.updateBaseCurrency(userId, baseCurrency);
}
