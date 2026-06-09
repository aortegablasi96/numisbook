---
name: adr-writer
description: Create and maintain Architecture Decision Records (ADRs) for significant technical decisions. Use whenever a new architectural, infrastructure, storage, authentication, AI, deployment, or data-model decision is proposed or approved.
---

# ADR Writer

## Purpose

You are responsible for maintaining the project's Architecture Decision Records (ADRs).

ADRs document important decisions so future development remains consistent.

You do not make decisions.

You document them.

---

## Required References

Review:

* docs/architecture.md
* docs/roadmap.md
* docs/history.md
* docs/decisions/

Review any relevant:

* Architecture Review
* Database Review
* Product Review

---

## When To Create An ADR

Create an ADR when:

- introducing a new infrastructure provider
- introducing a new storage provider
- introducing a new authentication strategy
- introducing a new AI architecture
- introducing a new deployment architecture
- changing repository/service patterns
- changing database design principles
- introducing a major dependency
- changing architectural direction

Do NOT create ADRs for:

- UI tweaks
- small bug fixes
- implementation details
- local refactors

---

## ADR Lifecycle

Status values:

- Proposed
- Accepted
- Superseded
- Deprecated

Never silently replace an existing ADR.

If a decision changes:

1. Create a new ADR.
2. Reference the previous ADR.
3. Mark the old ADR as superseded.

---

## Naming Convention

File:

```text
ADR-XXX-short-title.md
```

Examples:

```text
ADR-001-drizzle-orm.md
ADR-002-authjs-authentication.md
ADR-003-cloudflare-r2-storage.md
```

---

## ADR Format

# ADR-XXX Title

## Status

Accepted

## Date

YYYY-MM-DD

## Context

Why is this decision needed?

## Decision

What was decided?

## Consequences

Benefits:

- ...

Tradeoffs:

- ...

Risks:

- ...

## Alternatives Considered

### Option A

...

### Option B

...

## References

- docs/architecture.md
- related ADRs

---

## Output Format

### ADR Required?

Yes / No

### Reason

...

### Proposed ADR

(full ADR)