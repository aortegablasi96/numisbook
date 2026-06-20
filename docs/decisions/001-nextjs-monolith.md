# ADR-001-Monolithic Next.js Architecture

Status: Accepted

Date: 2026-06-06

## Context

The application is currently developed by a single developer and is in the MVP stage.

## Decision

Use a monolithic Next.js application with App Router.

Frontend and backend functionality will live in the same repository.

## Alternatives Considered

### Microservices

Pros:
* Independent deployment

Cons:
* Operational complexity
* Premature optimization

## Consequences

Positive:
* Faster development
* Simpler deployment
* Easier maintenance

Negative:
* Future extraction may be required if scale increases