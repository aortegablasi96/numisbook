"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Primary nav links with an active-state pill. Client Component so it can read
// the current path; the surrounding header stays a Server Component. Coin and
// collection-detail routes keep "Collections" highlighted (they live under it).
const LINKS = [
  { href: "/collections", label: "Collections" },
  { href: "/portfolio", label: "Portfolio" },
];

export function HeaderNav() {
  const pathname = usePathname();
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
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
