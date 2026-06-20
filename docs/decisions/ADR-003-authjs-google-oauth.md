# ADR-003-Authentication Strategy

Status: Accepted

Date: 2026-06-06

## Context

The application is initially intended for personal use and later expansion.

## Decision

Use Auth.js with Google OAuth as the initial authentication provider.

## Alternatives Considered

### Email + Password

Rejected due to:
* Password management
* Password resets
* Increased maintenance

### Magic Links

Rejected initially due to:
* Email infrastructure requirements

## Consequences

Positive:
* Fast onboarding
* Minimal maintenance

Negative:
* Dependency on Google identity provider