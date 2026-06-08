# ADR-004: Storage Provider Abstraction

Status: Accepted

Date: 2026-06-07

## Context

Coin images and future videos must be stored outside PostgreSQL.

## Decision

Implement a storage abstraction layer.

Architecture:

Repository
→ Storage Interface
→ Provider

## Consequences

Positive:
* Provider independence
* Easier migrations

Negative:
* Additional abstraction layer