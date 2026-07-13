"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

// Primary nav links with an active-state pill. Client Component so it can read
// the current path; the surrounding header stays a Server Component. Coins is a
// sibling of Collections, not a child — it is another way of seeing the same
// inventory (DDR-005) — so `/coins` and the coin detail highlight it, while
// `/collections/[id]` keeps Collections highlighted.
const LINKS: { href: string; label: MessageKey }[] = [
  { href: "/collections", label: "nav.collections" },
  { href: "/coins", label: "nav.coins" },
  { href: "/portfolio", label: "nav.portfolio" },
];

export function HeaderNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <>
      {LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
          >
            {t(link.label)}
          </Link>
        );
      })}
    </>
  );
}
