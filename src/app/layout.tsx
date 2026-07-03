import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

// Self-hosted via next/font (no runtime request, no layout shift). Exposed as CSS
// variables consumed by globals.css: Fraunces (serif display/numerals), DM Sans
// (body/UI), DM Mono (uppercase micro-labels). See DDR-001.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NumisBook",
  description: "Collection management for coin collectors.",
};

async function FloatingAssistant() {
  const session = await auth();
  const user = await resolveCurrentUser(session);
  if (!user) return null;
  return <AssistantWidget />;
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Resolve the active locale once on the server and seed the client provider so
  // both render the same language (no hydration mismatch). User preference is
  // threaded in once `users.locale` exists (story #122); for now cookie +
  // Accept-Language decide.
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <body>
        <LocaleProvider locale={locale} messages={messages}>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <SiteHeader />
          <div id="main-content" tabIndex={-1} className="container">
            {children}
          </div>
          <FloatingAssistant />
        </LocaleProvider>
      </body>
    </html>
  );
}
