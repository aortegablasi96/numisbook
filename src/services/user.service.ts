import { userRepository } from "@/repositories/user.repository";
import { baseCurrencySchema } from "@/lib/validation/user";

// User-preferences business logic. Framework-agnostic; data access goes through
// the repository. The acting userId always comes from the session, never client
// input (tenant isolation).

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
