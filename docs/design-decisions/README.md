# Design Decision Records (DDRs)

Significant UI and design decisions. Filenames are self-describing — read the
file for the decision and its rationale. Use `template.md` to start a new one.

| # | Decision |
| --- | --- |
| DDR-001 | Figma UI redesign ("stone & gold") |
| DDR-002 | Global display density |
| DDR-003 | Dark mode |
| DDR-004 | Theme toggle |
| DDR-005 | Filter bar pattern |
| DDR-006 | Responsive layout |
| DDR-007 | Demo mode UI |

## Supersessions and amendments

What you **cannot** see from the filenames — this chain matters, because
DDR-001 no longer says what it originally said:

* **DDR-003** (dark mode) **supersedes DDR-001**'s light-only stance and adds
  the `--on-gold` token.
* **DDR-004** (theme toggle) **amends DDR-003 §3** — the user-selectable
  "System" option is dropped, but the `system` fallback still governs
  never-chosen accounts.
* **DDR-005 §7** **amends DDR-001** — light-mode `--accent` deepened to
  `#7f5612`, because gold text failed WCAG AA on its own `--accent-weak` tint
  when composited against `--bg` off-card.
* **DDR-006** (responsive layout) **amends DDR-002** — `zoom: 0.75` is
  desktop-only; at and below the tablet stop the app renders at 100%.
* **DDR-002** builds on, and does **not** supersede, DDR-001.

Architecture-side supersessions live in [`../decisions/README.md`](../decisions/README.md).

## Rules

- The design system is **dependency-free CSS** in `src/app/globals.css`. Do not
  introduce a CSS-in-JS library or a component framework (Tailwind, shadcn,
  MUI) — extend `globals.css` instead.
- An accepted decision **takes precedence over generated suggestions.** Propose
  a new DDR rather than silently overriding one.
