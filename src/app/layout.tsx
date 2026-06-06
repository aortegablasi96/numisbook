import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <div className="container">{children}</div>
        <FloatingAssistant />
      </body>
    </html>
  );
}
