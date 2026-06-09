# ADR-006: Postgres enums for fixed value sets

Status: Accepted

Date: 2026-06-09

## Context

The Data Model Reform milestone reforms the coin attribute schema. Some coin
attributes are drawn from a small, fixed, *ordered* set of values rather than
free text — the first being **grade**, on the lettered ancient/world circulated
scale (`G, VG, F, VF, EF, AU, MS`, worst → best).

Until now every coin attribute (`metal`, `category`, `grade`, …) was a plain
`text` column. `database.md` explicitly flagged the grading scale as an open
question: free text vs. a structured scale. Free text let inconsistent values
in (`"vf"`, `"Very Fine"`, `"EF?"`) and sorted alphabetically — meaningless for
a quality scale — so a decision was needed on how the codebase models fixed,
enumerable domain values. There was no existing pattern for this.

## Decision

Model fixed, enumerable domain value sets as **PostgreSQL native enums** via
Drizzle `pgEnum`.

First application: coin `grade`, as the `coin_grade` enum
(`G, VG, F, VF, EF, AU, MS`), declared worst → best so declaration order is the
quality order. The Zod schema mirrors the enum (`z.enum`) at the API boundary,
and the value list (`COIN_GRADES`) is exported once from the validation layer and
reused by the UI selects and the assistant tool schema, so the set is defined in
one place.

This applies to **fixed, app-defined** sets only. Free-text descriptive fields
(`issuing_authority`, `category`, `catalogue_references`, …) deliberately stay
`text`; user-defined or frequently-changing sets should use a lookup table
instead (see Alternatives).

## Alternatives Considered

### Free text + application-only validation

Pros:
* Simplest; no migration to change the set.

Cons:
* No database-level integrity; inconsistent values persist.
* Sorts alphabetically, not by quality.

### Text column + CHECK constraint

Pros:
* Database-enforced membership.

Cons:
* No native ordering type; quality sort needs a CASE expression.
* Changing the set still needs a migration, with less expressive Drizzle support.

### Lookup table + foreign key

Pros:
* Easily extended; can carry metadata (labels, ordering, i18n).

Cons:
* Heavier (join + seed data) for a tiny, static set.
* Over-engineered for values that change only with a code release.

### Postgres enum via `pgEnum` (chosen)

Pros:
* Database-enforced integrity, lightweight, typed end-to-end.
* Declaration order gives a meaningful `ORDER BY`.

Cons:
* Changing values requires a migration (see Consequences).

## Consequences

Positive:
* Invalid grades are rejected at the database, not just the app.
* `ORDER BY grade` reflects coin quality (enum order), no CASE needed.
* Types flow from the schema through services to the UI; dropdowns are trivial.

Negative:
* Evolving the set requires a migration. In Postgres, `ALTER TYPE … ADD VALUE`
  appends easily, but **removing or reordering** values is awkward (recreate the
  type). Not suitable for user-defined or volatile sets — use a lookup table.
* The value list lives in two synchronized places (the `pgEnum` and the Zod
  `COIN_GRADES`); they must be kept in step.

## Related Documents

* docs/database.md (Coin table; "grade is a Postgres enum")
* docs/roadmap.md (Data Model Reform milestone)
* src/db/schema/coins.ts, src/lib/validation/coin.ts
