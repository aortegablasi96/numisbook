# Testing Report — Rework Filters (ADR-015 / DDR-005)

Date: 2026-07-13
Milestone: **Rework Filters** (active)
Validated against: `ADR-015-coin-filter-rework`, `DDR-005-filter-bar-pattern`

## Summary

The implementation satisfies the approved planning artifacts. Filter semantics,
tenant isolation, and the new `/coins` surface were each verified against a
running app and a real database rather than inferred from the code.

One **real defect** was found — and only found by rendering the UI: the active
filter chip and the year-range hint badge failed WCAG AA colour contrast in the
light theme (4.2:1, floor is 4.5:1). It is fixed and re-verified. See
"Accessibility" below.

Recommendation: **Approved with Recommendations.**

## Requirements Validation

| Approved item | Status | How it was verified |
| --- | --- | --- |
| Composite index `coins (collection_id, created_at DESC)` | Met | Migration `0007` applied; index confirmed present in `pg_indexes` |
| Widened filter set (grade, denomination, mint, signed year **range**) | Met | Driven through the live API and UI |
| Broadened `q` (denomination, mint, catalogue refs) | Met | `q=Bactra` (a **mint**) returns 3 coins — previously 0 |
| `GET /api/coins` + `/api/coins/facets` (cross-collection) | Met | Returns all 9 coins across both collections |
| Multi-select: OR within a field, AND across fields | Met | `category=Indo-Greek&category=Greco-Bactrian` → 7; `+grade=AU` → 1 |
| Active-filter chips + working clear-all | Met | One chip per value; per-value removal; clear-all restores 9 |
| `/coins` read-only, in nav, dashboard "View all →" repointed | Met | No Add button; nav active-state correct; link → `/coins` |
| Tenant isolation on the two new queries (ADR-015's top risk) | Met | See below — verified live, not assumed |

## Test Coverage

**Automated (CI gates):** lint clean, typecheck clean, **263 unit tests pass**
across 29 files. New suites cover the filter contract (`coin-filters.test.ts`),
query validation (`validation/coin.test.ts`), the new route
(`api/coins/route.test.ts`), and service-level scoping (`coin.service.test.ts`).

**End-to-end (this report):** 37 assertions against the running app + dev
Postgres, driving the real browser (Playwright) and the real HTTP API — all pass.

Interaction coverage (DDR-005): multi-select popover stays open while ticking;
trigger shows an active count; **Escape closes the popover and returns focus to
the trigger**; `aria-expanded` resets; grade chips carry `aria-pressed`; the BC
year hint renders (`-220`/`-160` → "220 BC – 160 BC"); no-match empty state.

## Tenant Isolation (ADR-015's highest-severity risk)

Verified **live** with a second user's real session, not just via mocked
unit tests:

| Probe as the other tenant | Result |
| --- | --- |
| `GET /api/coins` | `{"coins":[],"total":0}` |
| `GET /api/coins/facets` | all facet lists empty — **no leak through the dropdown** |
| `GET /api/coins?q=Bactra` (owner's mint) | empty |
| `GET /api/collections/{owner's id}/coins` | **404** (does not reveal existence) |
| No cookie | **401** |

The facets endpoint was the specific leak ADR-015 warned about; it is scoped
correctly.

Validation boundaries also hold: inverted year range, unknown grade, unknown
`sortBy`, and `page=0` each return **400** via real Zod validation.

## Regression Review

The per-collection coin table (the pre-existing filter surface, refactored out of
a 535-line `CoinsManager`) was re-verified: it lists its own 8 coins, its facet
filters still narrow correctly, it keeps its Add button, and it does **not** show
the Collection column. The two tables persist column state under **distinct**
keys (`numisbook:coin-columns-v4` vs `numisbook:all-coin-columns-v1`), so the
corruption risk DDR-005 flagged is avoided.

## Accessibility Review

axe (WCAG 2.0/2.1 A + AA) on `/coins` and `/`, in **light and dark**, including
the filter bar's most complex state (popover open + active chips): **0 violations**
— after the fix below.

**Defect found and fixed.** The active-filter chip (`.chip.is-active`) rendered
`--accent` text on an `--accent-weak` tint at **4.2:1**, below the 4.5:1 AA floor
for its 12.8px text. Root cause was a **token contract bug, not a chip bug**:
`--accent` (`#8a5f15`) was validated on `--surface` (white, 5.6:1), but off-card
the tint composites over the stone `--bg` to `#e6decd`, where it fails. The same
pairing is used by `.badge`, so the year-range hint was failing too — axe missed
it only because no year filter was active during that scan.

DDR-005 §6 had asserted this pairing was "already AA in both schemes". That claim
was untested: `.chip.is-active` had **no user** until this milestone.

Fix: light-mode `--accent` deepened to **`#7f5612`** (4.8:1 on the tint, 6.5:1 on
white; white-on-gold buttons improve 5.6 → 6.5). Dark mode was already passing and
is untouched. Recorded as **DDR-005 §7**, amending DDR-001.

## Remaining Risks / Follow-ups

* **Deferred by design (ADR-015):** `pg_trgm` indexed search, price-paid range
  filtering, URL-synced (shareable) filter state.
* **Facet lists are unbounded** — usable at 6 mints, unpleasant at 60. A
  type-to-filter box inside the popover is the expected follow-up (DDR-005).
* **No automated a11y/E2E in CI.** This milestone's only serious defect was
  invisible to lint, typecheck, and 263 unit tests — it required rendering the
  page. Worth considering an axe check in CI.
* Pagination beyond page 1 was not exercised (the dev inventory is 9 coins,
  under the page size of 20).
