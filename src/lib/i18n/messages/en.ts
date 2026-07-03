// Canonical English message catalog — the single source of truth for UI copy
// and for the `MessageKey` type. Every other locale is a Partial of this shape
// and falls back to English per-key at runtime (ADR-014). Keys are grouped by
// area with dotted names; keep them flat (no nesting) so lookup stays trivial.

export const en = {
  // Global chrome
  "app.name": "NumisBook",
  "app.tagline": "Collection management for coin collectors.",
  "skip.toContent": "Skip to content",

  // Primary navigation
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
  "settings.language.help": "The language NumisBook’s interface is shown in.",
  "settings.danger.heading": "Danger zone",
  "settings.danger.deleteAccount": "Delete account",
  "settings.danger.deleteWarning":
    "Permanently delete your account and all associated data. This cannot be undone.",
} as const;

export type MessageKey = keyof typeof en;

/** A complete catalog (English). Other locales are `Partial<Messages>`. */
export type Messages = Record<MessageKey, string>;
