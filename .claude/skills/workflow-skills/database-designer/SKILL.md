---
name: database-designer
description: Design and review PostgreSQL and Drizzle schemas, relationships, indexes, and migrations for NumisBook. Use whenever a feature requires new tables, columns, relationships, constraints, or schema changes.
---

# Database Designer

Design database structures that support the approved architecture while maintaining consistency, normalization, and tenant isolation.

Owns:

- schema design
- relationships
- constraints
- indexes
- migration planning

Does not own:

- feature prioritization
- architecture decisions
- implementation logic
- testing strategys

---

## Workflow Position

This skill owns architectural design and technical planning.

Workflow:

Product Manager
→ UI Designer
→ Architect
→ Database Designer (if needed)
→ ADR Writer (if needed)
→ Implementation Engineer
→ Testing

Before any major refactor:

Refactoring Reviewer
→ Architect
→ Implementation Engineer
→ Testing

Escalate concerns to the appropriate workflow skill when necessary.

---

## Roadmap Awareness

Schema design should support:

- current milestone requirements
- near-term roadmap goals

Do not introduce schema complexity solely for distant future features.

Example:

Future auction monitoring should not result in auction tables being created until auction functionality is approved.

---

## Current Stack

* PostgreSQL
* Drizzle ORM
* UUID primary keys

---

## Design Principles

### Normalize First

Avoid duplication.

Only denormalize when a measurable performance issue exists.

---

### Explicit Relationships

Use foreign keys whenever appropriate.

All relationships must be documented.

---

### UUIDs

Use UUIDs for identifiers unless explicitly instructed otherwise.

---

### Migration Safety

Never generate destructive migrations without warning.

Always identify migration risks.

---

## Coin Collection Domains

Current domains:

* users
* collections
* coins
* images
* valuations
* auctions
* watchlists

---

## Required References

Before proposing schema changes:

Review:

* docs/database.md
* docs/architecture.md
* docs/decisions/*

Consult when useful:

* docs/product.md
* docs/roadmap.md
* docs/history.md

Respect:

* existing naming conventions
* established relationships
* indexing strategy
* tenant-isolation rules
* domain boundaries
* accepted architectural decisions

If a proposed schema change conflicts with an accepted ADR:

1. Identify the conflict.
2. Explain the tradeoffs.
3. Propose a new ADR.
4. Do not silently override the existing decision.

---

## Required Review Process

Before proposing schema changes:

### Step 1

Review existing schema.

### Step 2

Identify affected entities.

### Step 3

Evaluate relationship impact.

### Step 4

Evaluate indexing requirements.

### Step 5

Generate migration plan.

---

## Indexing Rules

Always evaluate indexes for:

* foreign keys
* search fields
* sorting fields
* frequent filters

Explain why indexes are proposed.

---

## Output Format

### Schema Review

...

### New Entities

...

### Modified Entities

...

### Relationships

...

### Index Recommendations

...

### Migration Plan

...

### Risks

...

### Drizzle Implementation

...
