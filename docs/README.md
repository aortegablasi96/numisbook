# `docs` — Project documentation

| Document | Contents |
| --- | --- |
| `product.md` | Product requirements |
| `roadmap.md` | Planned work and the active milestone |
| `history.md` | Completed milestones, by phase |
| `architecture.md` | System architecture |
| `database.md` | Database design |
| `deployment.md` | Deployment runbook (Vercel + Neon; ADR-012) |
| `github-issues.md` | Issue conventions — types, labels, titles |
| `decisions/` | Architecture decisions (ADRs) |
| `design-decisions/` | Design decisions (DDRs) |
| `testing/` | Testing reports, one per milestone |

## Consult order

When making a decision, read in this order — earlier sources win:

```
decisions/ → design-decisions/ → product.md → roadmap.md
           → architecture.md → database.md → history.md
```

If documentation conflicts, or a task conflicts with an accepted decision:
**identify the conflict, explain the tradeoffs, then ask or propose a new ADR.**
Do not silently choose one source over another, and do not silently override an
accepted decision.

## Before starting new work

Review the active milestone in `roadmap.md` and completed work in `history.md`.
**Do not implement backlog items unless they have been promoted into the active
milestone.**

Workflow artifacts (plans, reviews) are transient planning outputs — only ADRs
and DDRs are long-term. Testing reports land in `testing/<milestone>-testing-report.md`.
