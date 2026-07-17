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

## Addendum — CSV import (slice 2 of 3)

Status: Accepted

Date: 2026-07-17

This ADR is scoped to the whole Collector Experience milestone, and its Context
reserves this: "import and archive append to it rather than adding ADRs that would
inevitably disagree." This addendum records the decisions the **import** slice
settled. It adds to the decisions above and reverses none of them; §§1–12 stand as
accepted, and the numbering continues from them.

### Context

Export shipped (Phase 20) and defined the column contract. Writing import against
it surfaced two facts about that contract that §§1–12 did not state, both
consequences of decisions taken there deliberately, and one question §11 explicitly
deferred to this slice. Recording them here keeps the portability contract in one
place, which is the point of scoping this ADR to the milestone.

### Decisions

13. **The parser is dependency-free, answering the question §11 deferred.**

    §11 left this open: "a library earns its place only if import's *parsing*
    proves genuinely hard — a decision for that slice, on its own evidence." The
    evidence:

    - The dialect is a **strict, known subset** — comma, CRLF, `"`-quoting with
      doubled inner quotes, BOM — because `csv.ts` writes it and Excel round-trips
      it unchanged. Decision 20 below means a file of unknown shape is rejected
      before parsing, so we never face an arbitrary third-party CSV.
    - What a library sells — delimiter sniffing, encoding detection, streaming,
      type inference, ragged-row recovery — is dead weight against a
      contract-checked file of a known dialect.
    - Exactly one thing is genuinely hard: a **quoted field containing a newline**,
      which is real here (`observations` and `pedigree` are 4000-char free text)
      and which defeats naive line-splitting. That is an argument against the naive
      parser, not for a library. The answer is a two-state character scanner, the
      same order of size as the writer it inverts.

    So the parser is a `parseCsv` beside `toCsv` in `src/lib/csv.ts`,
    domain-agnostic like its inverse. This is conditional on it being a character
    state machine — a line-split implementation is a defect, not a style choice —
    and on the round-trip property test §3 already mandates covering the
    adversarial cases.

    **Revisit trigger:** accepting foreign spreadsheets of unknown dialect (i.e.
    if column-mapping ever ships). Not before.

14. **Import is additive. It creates coins; it never updates them.**

    `COIN_EXPORT_OMITTED` excludes `id` (§ the contract module), and this ADR
    defends that: letting a collector edit surrogate identity in a spreadsheet
    would mean editing NumisBook's bookkeeping. The consequence, unstated until
    now: **import has no way to recognise a row it has already seen.** Exporting a
    collection and importing the file back yields a second copy of every coin.

    This is accepted rather than engineered around. For the use case that
    motivates the slice — "bring my spreadsheet in" — insert is the correct and
    only sensible semantic. Upsert would require an identity column this ADR
    deliberately omitted, plus a merge UI, to serve a case (re-importing your own
    export) that no collector has asked for.

    Note what this means for §3's round-trip assertion: `parse(export(coin)) ≡
    coin` pins **field fidelity, not idempotency**, and passes while the
    duplication above is true. It is not a guard against it.

    The mitigation is disclosure, not prevention: the import preview states the
    count before anything is written, and the commit control is labelled with it
    ("Add 37 coins"). If duplicate-on-re-import is reported in practice, the
    remedy is an `id` column — and this ADR's Consequences already note that
    **adding** a column is the safe direction of change.

15. **Import targets one collection, chosen by the collector. The `collection`
    column is advisory and is ignored.**

    A comment in the contract module assumed import "can route on it". The schema
    does not support that: `collections.name` is `text NOT NULL` with only a
    `user_id` index — **no unique constraint** — so one user may own two
    collections named "Roman", and routing a row by name is ambiguous by
    construction. Every available tie-break (first, newest, error) is a guess at
    intent.

    This also follows from a product rule that predates the milestone: `/coins` is
    read-only and coins are created inside a collection (ADR-015, DDR-005). Import
    creates coins, so it lives on the collection surface and nowhere else. A file
    exported from `/coins` spanning three collections imports into the one
    collection the collector chose; its `collection` column becomes text that
    describes where the coins came from, exactly as `title` is text that describes
    the coin (§6).

    Multi-collection restore is the **archive** slice's job, where collection
    identity travels properly instead of being inferred from a display name.

    The stale comment in the contract module is corrected as part of this slice.

16. **Import is exposed as one route with a `commit` flag, not a preview route and
    a commit route.**

    Two routes would each parse, header-check, and validate identically, differing
    only in the final insert — 95% duplication of the one code path whose
    divergence this ADR names as the milestone's highest-severity risk. One path,
    one flag at the end. `commit` defaults to false, so a request that omits it
    previews rather than writes.

    The client therefore uploads the file twice: once to preview, once to commit.
    The alternative is server-side parse state behind a token, with a cache, an
    expiry, and a new way to be wrong. Re-validating on commit is correct rather
    than wasteful — a preview token is a claim about the past that the commit would
    have to trust.

17. **Import is a mutation, and the demo tenant does not get it.**

    The mirror of §10. Export carries no `assertWritable` because it is a read, and
    the read-only demo tenant keeps it deliberately. Import writes, so ADR-016
    applies in full: `assertWritable`, enforced mechanically by the
    build-failing write-guard test, and DDR-007 removes the affordance rather than
    disabling it.

18. **Validation is the coin form's, not import's own.**

    Rows validate through the existing `createCoinSchema`, and map to storage
    through the existing private `toCoinRow`, which encodes the price-partition
    rule (finalPrice = hammer+premium+shipping+tax when any component is present —
    ADR-009). Import must not acquire a second opinion about what a valid coin is,
    or about what a coin's `finalPrice` is, decided by which door the coin entered
    through.

    A consequence worth stating: a hand-edited file whose `finalPrice` disagrees
    with its components will have `finalPrice` **silently recomputed** from the
    components. That is the existing rule winning, correctly — but it means import
    is not a pure round-trip of the file's bytes, and it must be an explicit test
    rather than a discovery.

19. **No new domain, no new service** — the same call as §12, for the same reason,
    reinforced: `toCoinRow` is private to the coins service, and reaching it from a
    separate import service would mean exporting the price rule to any caller.
    Import is a coin use case and stays with the coins aggregate.

20. **A file whose header row does not match the contract is rejected whole.**

    Not partially imported, not silently ignored: the response names the
    unrecognised and missing headers. A collector's spreadsheet carrying a `value`
    column they expect to be read is better refused than half-imported. Headers are
    matched as the stable English identifiers §4 fixed them as, in every locale.

### Consequences

Positive:

* The milestone's objective — "let a collector get their data in and out" — is
  true in both directions for coin attributes, with one contract and one parser
  pair proving it.
* §11's deferral paid off: the parser call was made against a known dialect and a
  known rejection rule, rather than guessed at while export was being designed.
* The round-trip test §3 anticipated now exists and gates CI, closing the drift
  risk this ADR named as highest-severity — structurally, not by review.

Negative:

* **Re-importing an export duplicates a collection** (13). The platform's answer is
  a preview and a counted button, which makes it visible but not impossible.
* CSV import cannot restore a multi-collection export as it was. The archive slice
  remains load-bearing for the milestone's promise, exactly as §1 and this ADR's
  Consequences already said.
* Import inherits export's buffering ceiling and adds a request-body ceiling of its
  own; both are bounded by an explicit row/byte limit rather than streamed.

Risks:

* **Parser correctness is now load-bearing for data integrity.** A quote-handling
  bug does not throw — it shifts cells one column left and writes a mint into
  `metal`. This is the cost of decision 13, taken knowingly, and paid for with the
  round-trip property test and adversarial fixtures rather than with a dependency.
* **The typed-escaping risk this ADR already named now cuts both ways.** §7's
  mitigation depends on columns being correctly typed; a mistyped free-text column
  loses its *un*escaping too, landing `'=SUM(A1)` in the database with a stray
  quote. The inverse pair (`escapeCell` / `unescapeCell`) must be tested as a pair.

## Related Documents

* docs/decisions/ADR-015-coin-filter-rework.md
* docs/decisions/ADR-006-coin-and-valuation-attribute-rework.md
* docs/decisions/ADR-007-portfolio-analytics-upgrade.md
* docs/decisions/ADR-014-internationalization.md
* docs/decisions/ADR-016-public-demo-account.md
* docs/design-decisions/DDR-007-demo-mode-ui.md
* docs/architecture.md
* docs/roadmap.md
