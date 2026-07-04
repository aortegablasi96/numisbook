"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

// Primary nav links with an active-state pill. Client Component so it can read
// the current path; the surrounding header stays a Server Component. Coin and
// collection-detail routes keep "Collections" highlighted (they live under it).
const LINKS: { href: string; label: MessageKey }[] = [
  { href: "/collections", label: "nav.collections" },
  { href: "/portfolio", label: "nav.portfolio" },
];

export function HeaderNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <>
      {LINKS.map((link) => {
        const active =
          link.href === "/collections"
            ? pathname.startsWith("/collections") || pathname.startsWith("/coins")
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
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
