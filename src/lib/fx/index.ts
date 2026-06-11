import type { FxRateProvider } from "./types";
import { FrankfurterProvider } from "./frankfurter";

export type { FxRateProvider, RatesByDate } from "./types";

// Selects the FX-rate provider from the environment. Only frankfurter (ECB)
// exists today; FX_API_URL overrides the endpoint (e.g. a self-hosted mirror).
// Mirrors the objectStorage singleton in src/lib/storage — swapping providers is
// a change confined to this folder.
function createFxRateProvider(): FxRateProvider {
  return new FrankfurterProvider(process.env.FX_API_URL || undefined);
}

export const fxRateProvider: FxRateProvider = createFxRateProvider();
