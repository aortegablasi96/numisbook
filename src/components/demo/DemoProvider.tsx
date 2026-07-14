"use client";

import { createContext, useContext, type ReactNode } from "react";

// Whether the current session is the read-only demo tenant (ADR-016).
//
// Seeded once in the root layout from the server-resolved user, exactly like
// LocaleProvider — so the domain "manager" components can hide their mutation
// controls without every page threading an `isDemo` prop down to them.
//
// This is presentation only. It decides what is *rendered*, never what is
// *allowed*: the server refuses demo writes in `assertWritable` regardless.

const DemoContext = createContext(false);

export function DemoProvider({
  isDemo,
  children,
}: {
  isDemo: boolean;
  children: ReactNode;
}) {
  return <DemoContext.Provider value={isDemo}>{children}</DemoContext.Provider>;
}

/** True when the signed-in user is the read-only demo tenant. */
export function useIsDemo(): boolean {
  return useContext(DemoContext);
}
