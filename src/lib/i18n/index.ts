// Public i18n barrel — client-safe (no `next/headers`). Server request
// resolution lives in `./server` and must be imported directly.
export * from "./locales";
export * from "./resolve";
export { getMessages } from "./messages";
export { t, translate, interpolate, type TParams } from "./t";
export type { MessageKey, Messages } from "./messages/en";
