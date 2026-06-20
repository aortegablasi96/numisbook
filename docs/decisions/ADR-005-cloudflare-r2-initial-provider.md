# ADR-005-Initial Object Storage Provider

Status: Accepted

Date: 2026-06-08

## Context

The project requires low-cost object storage for images and future videos.

## Decision

Use Cloudflare R2 as the initial storage provider.

The storage implementation must remain S3-compatible.

## Alternatives Considered

### AWS S3

Pros:
* Industry standard

Cons:
* Potentially higher cost
* More operational complexity

## Consequences

Positive:
* Low operating cost
* S3 compatibility

Negative:
* Cloudflare dependency