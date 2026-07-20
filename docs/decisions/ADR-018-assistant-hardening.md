# ADR-018-Assistant Hardening (usage accounting in Postgres, streaming responses)

Status: Accepted

Date: 2026-07-19

## Context

The collection assistant (ADR-016 gave it a read-only demo surface; the feature
itself predates any ADR) shipped as an MVP and has never been hardened. NumisBook
is now live in production (ADR-012), which changes what that costs.

The assistant is **the only feature in NumisBook that spends money per request**.
Every other surface reads and writes the project's own Postgres; this one calls a
third-party API, in a loop, on behalf of anyone who can reach it — including
anonymous visitors, because the public demo deliberately exposes it without a
Google account (ADR-016).

Four gaps made that untenable:

- **No streaming.** `chat()` runs a manual agentic loop of up to 12 sequential
  OpenAI round-trips and returns one JSON body at the end. The user watches a
  spinner for the entire duration, with no signal of progress. A multi-tool
  request is the worst case: the longest wait, the least feedback.
- **No rate limiting.** Nothing bounded requests per user per unit time, on any
  surface.
- **No cost controls.** `MAX_TOOL_ITERATIONS = 12` bounds loop *steps*, not
  tokens; a conversation with large tool results can be expensive well within
  those 12 steps. Nothing recorded what the feature actually cost.
- **Weak conversation limits.** `DEMO_MAX_ASSISTANT_MESSAGES = 20` bounded the
  demo only. A signed-in conversation was unbounded, so history grew without
  limit and every turn resent it — cost per turn rising with length.

This is the active **Assistant Hardening** milestone (`roadmap.md`). What needed
deciding — and recording — was where rate-limit state lives on a serverless
runtime, and what the assistant's HTTP contract becomes.

## Decision

### 1. One concern, not three: usage accounting

Rate limiting, cost control, and usage visibility are not three mechanisms. They
answer one question — *how much has this subject spent, and may they spend more?*
— so they share one home: an `assistant_usage` table, an
`assistantUsage` repository, and an `assistant-limits` service that owns the
rules. Building them separately would scatter the same state across three places
and let the three drift.

**Conversation limits are deliberately excluded from that store.** The client
sends the full `messages` array on every request, so the length is already in
hand at the route — which is how the demo cap already works. Persisting it would
store a value we are handed anyway and invent a consistency question (stored
count vs. sent array) where none exists. The rule lives in the same service; only
its input differs.

### 2. Rate-limit state lives in Postgres

On Vercel serverless (ADR-012), limiter state must be shared across instances to
mean anything. It is stored in `assistant_usage` — one row per request, carrying
the metered subject, prompt and completion tokens, an outcome, and a timestamp.
Both guards are window queries over that row set: count rows for rate limiting,
sum tokens for cost control.

The cost is one extra read and one write per assistant request. Against a call
that already makes multi-second round-trips to OpenAI, that latency is noise.
**The trade being made is a few milliseconds for a limit that is actually
correct.**

Prompt and completion tokens are stored as **separate columns**, never as one
total: `gpt-4o-mini` prices input and output differently, so a single
`total_tokens` would make the row's cost unrecoverable — and "what does the
assistant cost" is the question this table exists to answer.

### 3. The metered subject: user id, or hashed session for the demo

Every usage row carries an opaque, **prefixed** `subject_key`:

- **Signed-in user** → `user:<uuid>`, from `currentUser()`. Consistent with the
  tenant invariant: the id comes from the session, never from client input.
- **Demo visitor** → `demo:<sha256 of the Auth.js session token>`.

Demo visitors all share one tenant id (ADR-016), so metering them by user id
would make every visitor compete for a single budget. The demo is a sales
surface; one abusive visitor starving every legitimate one is a worse failure
than the abuse. Per-session metering is weaker — clearing cookies buys a fresh
budget — and that is accepted knowingly: the demo tenant is read-only and its
conversation cap bounds each session. **This is a spend guard, not a security
boundary.**

The session token is **hashed, never stored raw**: it is a live credential, and a
leaked backup of this table must not be a set of usable sessions. The token is
read at the route (the Next-specific layer, where cookie access belongs) and the
service receives an opaque string.

The prefix is not cosmetic. Without it, user uuids and token hashes share one
namespace, and a collision would silently merge two subjects' budgets — and
account cleanup (§5) could not target rows exactly.

### 4. `assistant_usage` has no foreign keys, and sits outside the tenant model

`subject_key` is polymorphic — sometimes a `users.id`, sometimes a hash
referencing no row we can point at. No foreign key can express that.

This makes `assistant_usage` the **second table outside the tenant ownership
model**, alongside `fx_rates`. The distinction matters: `fx_rates` is global
reference data with no subject at all, whereas `assistant_usage` *does* reference
a user — just not referentially. That difference is exactly what creates the next
decision.

### 5. Account deletion clears usage rows explicitly

Because there is no foreign key, `assistant_usage` is **outside ADR-013's
deletion cascade**. Left alone, deleting an account would leave rows containing
the deleted user's uuid behind.

"Delete my account" must mean it. `account.service` therefore deletes usage rows
for `user:<id>` alongside its existing object-storage purge — the established
home for cleanup the database cannot cascade — and a test pins it. This is part
of the milestone, not a follow-up: a privacy gap should not outlive the work that
introduced it.

### 6. The guards fail closed

If `assistant_usage` is unreachable, assistant requests are **refused, not waved
through**. A spend guard that fails open is not a guard. The assistant degrades;
every other page keeps working.

### 7. Exactness is traded for simplicity, knowingly

Two concurrent requests can both read "4 used" and both proceed, allowing 6
against a limit of 5. Exact enforcement would require a lock or transaction on
every assistant request. **The slack is accepted**: the overshoot is bounded by
concurrency, and locking every request to prevent an occasional off-by-one on a
spend guard is a poor trade.

Windows are evaluated against the database clock (`now()`), which is consistent
across instances — a quieter benefit of choosing Postgres over per-instance
memory.

### 8. Retention is a decision, not an oversight

Usage rows accumulate unboundedly. At a generous 10,000 requests/day the table
reaches roughly 3.6M rows and ~400 MB per year, and the window queries never scan
beyond their range regardless of size.

**No automatic pruning is added.** A scheduled job would introduce infrastructure
the project does not have, for a problem it does not have. A tested
`deleteOlderThan(date)` exists on the repository so the capability is present,
and this paragraph is the record that the question was asked. Revisit once real
growth is measured — which the cost-control slice measures for the first time.

### 9. `/api/assistant` streams (Server-Sent Events)

`chat()` becomes an async generator yielding a discriminated union — text
deltas, actions, errors, and an explicit `done` — and the route serializes it as
SSE. The service keeps yielding plain objects and knows nothing about HTTP;
**the route remains the only layer aware of transport**, preserving the layering
rule.

Two properties are load-bearing:

- **The explicit `done` terminator.** Without it, a complete reply and a
  connection that died mid-stream are indistinguishable, and a truncated answer
  reads as a finished one.
- **Actions stream as they happen**, rather than batching at the end. If a limit
  trips after three coins were added, the user has already seen those three
  confirmed. This is what makes the "limit hit mid-loop, after a write" case
  honest rather than reconstructed.

An aborted request (the user closes the widget) stops the loop via the request's
abort signal and **still writes its usage row** — otherwise aborting becomes a
way to consume tokens for free.

### 10. Sequencing: guards first, streaming last

The three guards ship before streaming. They are small, independent, and close a
live financial liability; streaming is the larger change and rewrites the
response contract. Shipping the guards first closes the liability early and lets
the risky change land alone.

Within the guards, **cost controls ship before rate limiting** — deliberately, so
the rate-limit thresholds are set from measured spend rather than guessed.

## Alternatives Considered

### Rate-limit state: in-memory

Pros:
* Free, instant, no schema, no dependency.

Cons:
* Per-instance. With N serverless instances the effective limit is N×, and it
  resets on every cold start.
* For a guard whose entire purpose is bounding spend, "approximately enforced,
  unpredictably" is not enforcement.

**Rejected.**

### Rate-limit state: a hosted store (Upstash / Redis)

Pros:
* The conventional answer; purpose-built, fastest option.
* Mature rate-limiting primitives.

Cons:
* A new vendor, a new dependency, and a new failure mode, against the standing
  rule not to add dependencies without justification.
* Solves a throughput problem the project does not have at this traffic.

**Rejected for now.** Revisit if Postgres proves too slow — the seam is the
repository, so the swap is confined.

### Rate-limit state: Postgres

Pros:
* Durable, shared across every instance, exact.
* Reuses the repository layer that already exists; no new infrastructure.
* One consistent clock for window evaluation.
* Doubles as the queryable cost record, which the milestone needs anyway.

Cons:
* One extra read + write per assistant request.
* Ties assistant availability to database availability (intended — see §6).

**Chosen.**

### Demo metering: one shared pool vs. per-session

A single shared budget for the demo tenant is simpler and unbypassable, but makes
every visitor compete with every other. Per-session is bypassable by clearing
cookies but never fails a legitimate visitor because of someone else.

**Per-session chosen** — the demo is a sales surface, and the tenant is read-only,
so the downside of the bypass is bounded spend rather than data risk.

### Streaming: SSE vs. keeping JSON vs. WebSockets

Keeping the JSON contract avoids all risk but forfeits the milestone's clearest
user-facing win. WebSockets would add a bidirectional transport for a
unidirectional problem, plus infrastructure Vercel serverless does not naturally
provide. **SSE chosen**: one-way, HTTP-native, and adequate.

## Consequences

### Benefits

- The platform's one uncapped spend liability is closed, on every surface
  including the anonymous one.
- What the assistant costs becomes answerable from production data rather than
  estimated.
- Replies appear progressively; the assistant stops being the app's slowest,
  least communicative interaction.
- Rate-limit thresholds are set from measurement, not guesswork.
- The tenant-isolation invariant is untouched: the acting `userId` still comes
  from the session and is still injected server-side into every tool handler.
- No new vendor, dependency, or infrastructure.

### Tradeoffs

- Every assistant request now costs a database read and write.
- Assistant availability now depends on database availability (deliberate, §6).
- Rate limits are approximately, not exactly, enforced under concurrency (§7).
- Demo metering is bypassable by clearing cookies (§3).
- The response contract change means route and widget must deploy together. They
  do today — one Next.js build — but that is now load-bearing and should not be
  "optimized" into separate deploys.
- Adding a fifth `outcome` value requires a migration.

### Risks

- **Streaming may buffer in production.** Response streaming depends on the
  hosting runtime; it can work locally and buffer on Vercel, silently delivering
  the old all-at-once experience while appearing to succeed. **This must be
  verified against a real deployment, not `npm run dev`** — it is the single most
  likely way this milestone ships broken.
- **Retention deferred** (§8) risks never being revisited. This ADR is the
  mitigation.
- **Abort handling** must stop the loop and still record usage; getting either
  half wrong produces silent billing or free tokens.
- **Usage rows on crash.** A process that dies mid-loop leaves its tokens
  unrecorded and the guard under-counting. Writing incrementally or in a
  `finally` is more robust than writing once at the end.
- Component logic for stream consumption cannot be tested by rendering
  (`environment: "node"`, no DOM), so the parsing and accumulation logic must be
  extracted into pure helpers to be testable at all.

## Supersedes

None. This ADR **extends ADR-016** — the demo's assistant remains read-only and
its conversation cap is preserved, now as one case of a general mechanism rather
than a special case — and **extends ADR-013**, whose account deletion gains an
explicit usage-row purge (§5).

## Related Documents

* docs/roadmap.md (Assistant Hardening milestone)
* docs/architecture.md
* docs/database.md
* docs/decisions/ADR-012-production-deployment.md (the serverless runtime that
  makes in-memory limiter state unworkable)
* docs/decisions/ADR-016-public-demo-account.md (the anonymous surface being
  metered; read-only tool set preserved)
* docs/decisions/ADR-013-account-settings-and-deletion.md (deletion extended)
* docs/decisions/ADR-011-observability.md (`logger`; usage logging accompanies
  but does not replace the usage row)
* CLAUDE.md (Collection Assistant; tenant isolation exceptions)
