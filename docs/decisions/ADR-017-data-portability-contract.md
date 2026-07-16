# ADR-017-Data portability contract (CSV export, and the contract import will read)

Status: Accepted

Date: 2026-07-16

## Context

The active milestone is **Collector Experience** (`roadmap.md`), whose stated
objective is that a collector can get their data in and out. Today everything the
platform holds is trapped in it: a collection can only be built by typing coins in
one at a time, and there is no way to take it elsewhere or recover it. Import
lowers the cost of adopting NumisBook; export lowers the cost of leaving — and the
second is what makes the first credible.

The milestone is being taken in three slices: **CSV export** (this ADR), **CSV
import**, and a **full-account archive with restore** (all collections, coins,
valuations, plus image and invoice bytes). Export leads deliberately: it defines
the column contract import must consume, so import is designed against a contract
that already exists and has been exercised, rather than one invented alongside it.

That ordering is what makes this an architectural decision rather than a feature.
The exported file is a **long-lived, externally-visible interface**: it lands on
collectors' disks, is edited in Excel, and comes back through import. Once
collectors hold files, the column set and its value conventions are effectively
frozen — a later correction breaks every file already in the wild. The decisions
worth recording before import is written against them are:

- **(a)** what the file's columns are, where that is defined, and how export and
  import are prevented from drifting apart;
- **(b)** how values are represented, given that a coin's data model has two
  awkward cases — signed years where negative means BC (ADR-006), and per-coin
  price currencies that analytics normally converts to a base (ADR-007);
- **(c)** how spreadsheet formula injection is neutralized without corrupting the
  data, which is not the textbook answer here;
- **(d)** whether the export is bounded, and what happens when a collection is
  large.

The precedent is ADR-015, which recorded the *filter* contract once for two
surfaces. Those surfaces have not drifted since. This ADR does the same for the
portability contract, and is scoped to the whole milestone: import and archive
append to it rather than adding ADRs that would inevitably disagree.

## Decision

Adopt **CSV as the interchange format for coin attributes**, defined by a single
typed column contract, and expose it as a read-only sibling sub-resource of the
two existing coin surfaces.

1. **Scope: coin attributes only.** CSV carries one row per coin, one column per
   stored coin attribute. It deliberately does **not** carry valuations
   (one-to-many per coin — a flat row can only hold them lossily), images, or
   invoice PDFs (bytes, not cells). Those belong to the **archive** slice. CSV is
   for the spreadsheet use case; the archive is for the "everything I own" use
   case. Conflating them would produce a format that serves neither.

2. **Export mirrors the search contract — "you export what you see."** Export is
   a sibling sub-resource on both coin surfaces, following the shape `/facets`
   established:

   ```
   GET /api/coins/export                    → the user's coins, all collections
   GET /api/collections/[id]/coins/export   → coins in one collection
   ```

   Both parse the **existing** `coinSearchParamsSchema` (ADR-015) and ignore
   `page`: the export contains every coin matching the current filter, search, and
   sort — not the visible page. The filter bar and the export link build their
   query strings with the same helper, so a filtered list and its export cannot
   disagree. No new filter contract is introduced; this is a third consumer of the
   existing one.

3. **One typed column contract.** The ordered column set is defined **once**
   (`src/lib/coin-export.ts`): per column, a stable header, how to read it off a
   coin, and **its type**. Export writes through it and import will read through
   it. This is the ADR-015 pattern applied to columns rather than predicates: a
   contract with multiple consumers is defined once, or the consumers drift. Its
   correctness is pinned by a round-trip assertion (`parse(export(coin)) ≡ coin`)
   once import lands.

4. **Headers are stable English identifiers in every locale.** NumisBook is
   localized across 7 locales (ADR-014), and the surrounding UI stays localized —
   but the header row is a data contract, not user-facing prose. Localizing it
   would mean a file's machine-readable meaning depended on the exporter's language
   preference at the moment of export, and a file exported in `de` would fail to
   import for a `fr` user. The header row is an API; APIs are not translated.

5. **Values are exported as stored, not as displayed.** Specifically:
   - **Years as signed integers** — negative is BC, exactly as the column stores
     it and the coin form accepts it. Not the `44 BC` display form, which
     `formatCoinTitle` produces for humans and which does not round-trip.
   - **No FX conversion.** Prices export in the coin's own `priceCurrency`, with
     the currency in its own column. Analytics converts to a base currency
     (ADR-007) because aggregates demand one unit; an export is a record of fact,
     and converting it would bake a snapshot of a floating rate into a file the
     collector believes is their data.
   - Dates as ISO `YYYY-MM-DD`; empty fields as empty cells (null and empty string
     are not distinguished — the schema does not meaningfully distinguish them).

6. **One derived, read-only column.** A `title` column (via `formatCoinTitle`,
   the single source of truth for a coin's title per ADR-006) leads the file so a
   human scanning a spreadsheet can identify each row. Coins have no `name`, so
   without it the first columns are bare attributes. It is derived, and **import
   ignores it** — the contract marks it as such, so a collector editing the title
   cell is not silently misled into thinking it did something.

7. **Formula injection is neutralized per column type, not per field.** A field
   beginning `=`, `+`, `-`, or `@` is executed as a formula when Excel opens the
   file, and coins carry long free text (`observations`, `pedigree`) that could
   contain one. The textbook mitigation — prefix *any* such field with `'` — is
   **wrong for this schema**: `year_from` is signed, so a coin from 44 BC exports
   `-44`, which the blanket rule would rewrite to `'-44`, turning a number into
   text in Excel and corrupting the round-trip for the most numismatically
   important field in the file.

   Because the contract is typed, escaping applies **only to free-text columns**.
   Numbers, dates, and the grade enum are machine-generated from constrained
   columns and cannot carry a formula, so they pass through untouched. Import's
   inverse — strip a leading `'` on text columns only — is then well-defined.
   Quoting alone is not a mitigation: Excel executes a formula inside a quoted
   field.

8. **Buffered, not streamed — for now, with a stated ceiling.** The export runs
   as one query and builds one response body. A realistic collection (hundreds of
   coins) is single-digit MB; the pathological case (~10 KB/row from the 4000-char
   `observations` and `pedigree` fields) puts 5,000 coins near 50 MB. This is a
   known ceiling, not an unexamined one. **Revisit when real collections approach
   four figures**; the escape hatch is batched reads behind a stream, and the
   contract module localizes that change.

   Buffering also keeps error handling honest: the query completes before any
   download header is set, so a failure returns a normal JSON error rather than a
   browser saving an error body as a `.csv`.

   **Prerequisite if this is ever revisited:** `buildCoinOrderBy` sorts by a
   single nullable column with **no tiebreaker**, so the row order is not a total
   order. Buffering is immune (one query, one snapshot), but any batched export
   would silently skip or duplicate rows. The missing `coins.id` tiebreaker is a
   pre-existing pagination defect, logged to the technical backlog; it becomes a
   hard blocker the moment export streams.

9. **Filenames are ASCII slugs.** Collection names are arbitrary user text, and
   interpolating them into `Content-Disposition` is both a header-injection vector
   (quotes, newlines) and an RFC 5987 encoding problem (`Münzen`). The filename is
   built from an ASCII slug plus the date, falling back to a generic stem when the
   slug empties, which sidesteps both. It is composed in the service, so it is
   unit-testable.

10. **Export is a read.** It carries no `assertWritable` (ADR-016 governs
    *mutations*), and therefore the read-only demo tenant can export. This is
    correct rather than incidental: letting a visitor pull the seeded collection
    into a spreadsheet demonstrates the portability promise before they sign up.
    DDR-007 removes mutation affordances in demo mode; export is not one, and must
    not be hidden.

11. **No CSV dependency.** RFC 4180 serialization of a known column set is a small
    amount of dependency-free code (quoting, embedded delimiters/newlines, UTF-8
    BOM for Excel). A library earns its place only if import's *parsing* proves
    genuinely hard — a decision for that slice, on its own evidence.

12. **No new domain.** Export is a use case on the existing coins aggregate, not
    an export service or export domain. Serialization lives in the service (what
    the file contains and what it is called are business rules, testable without
    HTTP); routes stay thin, per the layering rules.

## Alternatives Considered

### Option A — Typed CSV column contract, defined once, exposed on both surfaces (chosen)

Pros:
* Reuses the ADR-015 filter contract wholesale — export inherits filtering,
  search, and sort for free, and "export what you see" needs no new concepts.
* One column definition serves export and import, so the round-trip cannot drift.
* Typing the columns is what makes safe injection escaping possible at all
  (see Option D).
* Purely additive: no schema change, no new dependency, no new domain.

Cons:
* CSV cannot express valuations, images, or invoices, so the milestone still needs
  the archive slice to make "get your data out" fully true.
* The column set is frozen once collectors hold files.

### Option B — Export XLSX or JSON instead

Pros:
* XLSX has real types (no formula-injection class, no BOM problem, no separator
  ambiguity). JSON round-trips nested valuations and images natively.

Cons:
* XLSX needs a heavyweight dependency and is hostile to scripting; JSON is not
  something a collector can open, and the spreadsheet is the actual user need.
  Neither is what someone asking for their collection "in Excel" means. JSON's
  strengths belong to the archive slice, where nesting is the point — and that is
  where they will be used.

### Option C — Localize the header row

Pros:
* A German collector opens a spreadsheet with German headers; consistent with the
  app being fully localized (ADR-014).

Cons:
* Makes a file's meaning depend on the exporter's language preference, so a file
  exported in `de` would not import for a `fr` user, and a file's contract would
  change if the user changed their locale between export and import. Breaks the
  round-trip for no gain a documented header set does not provide. Rejected.

### Option D — Blanket OWASP prefix escaping on every field

Pros:
* The textbook mitigation; one rule, no per-column knowledge, impossible to
  under-apply.

Cons:
* Corrupts `-44` (44 BC) into text, breaking the round-trip on the field that
  most distinguishes this domain, and does the same to any negative number a
  future column adds. A safety rule that silently damages correct data in the
  common case is the wrong rule. Rejected in favour of typed escaping, which is
  both safer and more faithful.

### Option E — Stream the export from the start

Pros:
* No memory ceiling; large collections never a concern.

Cons:
* Requires batched reads, which require a total row order that
  `buildCoinOrderBy` does not currently provide — so it would pull a pre-existing
  pagination fix into an export slice, and get row-skipping wrong if that were
  missed. Also commits the response headers before the query can fail. Premature
  against realistic collection sizes; deferred, not rejected, with an explicit
  revisit trigger.

### Option F — A dedicated export service / export domain

Pros:
* Keeps `coin.service.ts` from growing; an obvious home if more entities become
  exportable.

Cons:
* A second service over the same aggregate, duplicating the ownership and
  tenant-scoping rules `coin.service` already enforces — two places to get tenant
  isolation right instead of one. Export is a coin use case. Rejected as an
  abstraction without a second caller.

## Consequences

Positive:
* A collector can take their inventory elsewhere, which is the milestone's stated
  objective and the precondition for import being credible.
* Import inherits a contract that exists, is typed, and has been exercised by a
  shipped consumer — rather than one negotiated while writing the parser.
* The filter contract now serves three consumers with one definition, further
  validating the ADR-015 pattern.
* The demo tenant gains a genuinely persuasive capability at no cost.

Negative:
* The column set becomes externally frozen the moment collectors hold files;
  changing it later means versioning the contract or breaking existing files.
  Adding columns is safe, renaming and removing are not.
* CSV alone does not fulfil the milestone's promise — a collector's photography,
  invoices, and value history stay in the platform until the archive slice lands.
  This is a scoped slice, not the finished objective.
* Export bypasses pagination, so it is the first route in the system whose
  response size is bounded only by the tenant's data.

Risks:
* **Contract drift when import lands** is the highest-severity risk: two sides of
  a round-trip that disagree corrupt collectors' data silently, on re-import. It
  is mitigated structurally (one module) and must be pinned by an explicit
  round-trip test, not assumed from the shape of the code.
* **Spreadsheet injection** is mitigated by typed escaping, but the mitigation now
  depends on columns being correctly typed in the contract — a new free-text column
  typed as anything else would silently lose its escaping. This must be covered by
  a test in the contract module, not left to review.
* Excel's regional list separator (`;` in some locales) is not addressed; RFC 4180
  commas are assumed. Accepted for now — revisit if collectors report friction.

## Related Documents

* docs/decisions/ADR-015-coin-filter-rework.md
* docs/decisions/ADR-006-coin-and-valuation-attribute-rework.md
* docs/decisions/ADR-007-portfolio-analytics-upgrade.md
* docs/decisions/ADR-014-internationalization.md
* docs/decisions/ADR-016-public-demo-account.md
* docs/design-decisions/DDR-007-demo-mode-ui.md
* docs/architecture.md
* docs/roadmap.md
