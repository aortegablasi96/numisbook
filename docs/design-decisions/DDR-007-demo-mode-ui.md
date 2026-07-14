# DDR-007 — Demo mode UI

Status: Accepted

Date: 2026-07-14

## Context

The Public Demo Account (ADR-016) signs a visitor into a shared, **read-only**
tenant. That creates a UI problem the backend cannot solve: a product whose
create/edit/delete controls all fail is worse than one that never offered them.
The interface has to make the demo state legible, and it has to do it without
turning the demo into a tour of disabled buttons.

## Decision

### 1. Entry point: secondary to Google, on the signed-out home page

"Try the demo" sits **beneath** the gold "Sign in with Google" button, with a
one-line hint ("No sign-up needed. Explore a real collection first."). Google
stays the primary, gold-filled action: signing up is the goal, the demo is the
on-ramp to it.

The button renders **only when a demo tenant actually exists** — a fresh checkout
that has never run `npm run db:seed-demo` shows the old signed-out page rather
than a door that opens onto an error.

Styling reuses the existing token system: a `.btn-demo` outline button in
`--accent` on a hairline gold border. No new colours.

### 2. A persistent, non-dismissible banner

Every page of a demo session carries a slim bar above the header: a "Demo" badge,
"You're exploring a demo collection — changes are disabled.", and a call to
action.

**It cannot be dismissed.** That is the point of it: it is the only thing
explaining why the create/edit/delete controls are absent. A visitor who closed it
would be left believing the product simply lacks them. It is tinted with
`--accent-weak` and reads correctly in both colour schemes.

The banner's CTA **signs in with Google directly** rather than linking home. The
visitor is already signed in (as the demo tenant), so a link to `/` would just
show them the demo again.

### 3. Mutation affordances are removed, not disabled

Demo sessions render **no** create / rename / delete / upload / edit controls —
they are not shown greyed out. A row of dead buttons invites clicking and teaches
the visitor that the product is broken; their absence, plus one banner explaining
why, reads as a deliberate mode.

Suppressed: the new-collection button and per-card rename/delete; the add-coin
form and the coin table's whole actions column; the coin-detail edit pencil; image
upload/remove; invoice upload/remove; the record-valuation form; the profile form;
the base-currency select (on both `/settings` and `/portfolio`); and the delete
account section.

Deliberately **kept**: invoice *download*, the image carousel, and the full
valuation history — a demo visitor should be able to open a receipt and read a
coin's value over time. Those are the product, not the plumbing.

This is presentation only. The server refuses demo writes regardless (ADR-016);
the UI just stops offering them.

### 4. `DemoProvider` / `useIsDemo`, mirroring `LocaleProvider`

Demo state is seeded once in the root layout from the server-resolved user and
read by the domain "manager" components through a `useIsDemo()` hook — rather than
every page threading an `isDemo` prop down to every manager. This mirrors the
existing `LocaleProvider` pattern exactly, so it introduces no new idea.

### 5. Settings: a note, not an empty page

`/settings` for a demo session shows a card explaining the mode instead of the
profile form, and keeps **language and theme** working — both are cookie-backed, so
each visitor gets a private preference without the shared row ever being written
(ADR-016 §4). The demo can therefore still show off dark mode and i18n, which are
shipped features worth showing.

## Consequences

* The demo reads as a deliberate mode rather than a broken app.
* Verified with axe on `/`, `/coins`, `/collections`, `/portfolio` and `/settings`,
  in **both** colour schemes: no violations. The banner stacks compactly at the
  phone breakpoint (DDR-006) without eating the fold.
* Every domain manager now carries an `isDemo` branch. If a future surface adds a
  mutation control and forgets one, the control will render and then fail with a
  403 — ugly, but not unsafe (and the server-side guard test makes the *route* side
  impossible to forget).

## References

* ADR-016 (Public Demo Account) — the mechanism and the read-only policy
* DDR-003 / DDR-004 (theme), ADR-014 (i18n) — the cookie-backed preferences the
  demo keeps
* DDR-006 (responsive layout) — the breakpoint the banner respects
