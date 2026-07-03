// Canonical English message catalog — the single source of truth for UI copy
// and for the `MessageKey` type. Every other locale is a Partial of this shape
// and falls back to English per-key at runtime (ADR-014). Keys are grouped by
// area with dotted names; keep them flat (no nesting) so lookup stays trivial.
//
// Scope: the app "shell" — global chrome, home dashboard, settings, and the
// entry/error pages. Deep domain screens (coins/collections/valuations/
// assistant) are extracted in a follow-up pass and fall back to English until
// then.

export const en = {
  // Global chrome
  "app.name": "NumisBook",
  "app.tagline": "Collection management for coin collectors.",
  "skip.toContent": "Skip to content",

  // Primary navigation
  "nav.primaryAria": "Primary",
  "nav.home": "Home",
  "nav.collections": "Collections",
  "nav.portfolio": "Portfolio",
  "nav.assistant": "Assistant",
  "nav.settings": "Settings",
  "nav.signIn": "Sign in",
  "nav.signInWithGoogle": "Sign in with Google",
  "nav.signOut": "Sign out",

  // Shared actions
  "action.save": "Save",
  "action.saving": "Saving…",
  "action.cancel": "Cancel",
  "action.apply": "Apply",
  "action.delete": "Delete",
  "action.confirm": "Confirm",
  "action.tryAgain": "Try again",
  "action.trySignInAgain": "Try signing in again",
  "action.backToHome": "Back to home",

  // Home dashboard
  "home.signedInAs": "Signed in as",
  "home.thereFallback": "there",
  "home.signInPrompt":
    "Sign in to start cataloguing and valuing your coin collection.",
  "home.stat.collections": "Collections",
  "home.stat.collectionsOne": "Collection",
  "home.stat.coins": "Coins",
  "home.stat.coinsOne": "Coin",
  "home.stat.totalPaid": "Total paid · {currency}",
  "home.stat.totalPaidNone": "Total paid · no prices yet",
  "home.stat.noValue": "—",
  "home.emptyHint": "Start by creating a collection, then add coins to it.",
  "feature.collections.body":
    "Organize your coins into collections — add, rename, and curate.",
  "feature.portfolio.body":
    "Aggregate value, allocation by metal and collection, and trends.",

  // Settings page
  "settings.title": "Settings",
  "settings.signInPrompt": "Sign in to manage your account and preferences.",
  "settings.profile.heading": "Profile",
  "settings.profile.name": "Display name",
  "settings.profile.email": "Email",
  "settings.profile.saved": "Profile updated.",
  "settings.preferences.heading": "Preferences",
  "settings.baseCurrency.label": "Base currency",
  "settings.baseCurrency.auto": "Auto (largest holding)",
  "settings.baseCurrency.help":
    "Applied to your portfolio analytics. “Auto” uses the currency of your largest holding.",
  "settings.language.label": "Language",
  "settings.language.systemDefault": "System default",
  "settings.language.help": "The language NumisBook’s interface is shown in.",
  "settings.danger.heading": "Danger zone",
  "settings.danger.body":
    "Deleting your account permanently removes your collections, coins, images, invoices, and valuations. This cannot be undone.",
  "settings.danger.deleteAccount": "Delete account",
  "settings.danger.deleting": "Deleting…",
  "settings.danger.confirm":
    "Delete your account and all associated data? This cannot be undone.",

  // Not found (404)
  "notFound.title": "Page not found",
  "notFound.body":
    "We couldn’t find the page you were looking for. It may have been moved or no longer exists.",

  // Error boundary
  "error.title": "Something went wrong",
  "error.body":
    "Your collection is safe — we’re having trouble reaching our servers right now. Please try again in a moment.",
  "error.reference": "Reference",
} as const;

export type MessageKey = keyof typeof en;

/** A complete catalog (English). Other locales are `Partial<Messages>`. */
export type Messages = Record<MessageKey, string>;
