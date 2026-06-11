# ADR-007: Portfolio Analytics Upgrade

> Scope: the Portfolio Analytics Upgrade milestone. The part requiring an
> architectural decision is multi-currency support — a per-user base currency
> plus the conversion mechanism that expresses all portfolio figures in it. The
> derived analytics (cost breakdown, per-coin proportion, the filterable
> acquisition-cost timeline) are computed in the service/UI from existing data
> and need no separate ADR, but the **conversion semantics** they rely on (which
> rate is applied, and what happens when one is missing) are recorded here, and
> the presentation is summarised under Consequences so the milestone is legible
> from one place.

Status: Accepted

Date: 2026-06-10 (updated 2026-06-11)

## Context

Portfolio analytics aggregates the **price each coin was paid** (the hammer /
premium / shipping partition, or a directly-entered final price), which may be
recorded in different currencies. Until now figures were reported per-currency
and never summed — so a collector who bought coins in USD, EUR and GBP never saw
one portfolio total.

> Analytics is currently based on the price paid, **not** on market valuations.
> Valuation-based value and gain/loss are deferred to a later stage (when
> valuation tracking matures); the conversion mechanism below applies equally to
> them when they arrive.

The Portfolio Analytics Upgrade milestone pulls multi-currency support forward
(see `docs/roadmap.md`): portfolio figures — totals, the cost breakdown,
per-coin proportions and the acquisition-cost trend — must be expressed in one
**base currency** the collector chooses. That requires exchange rates, including
**historical** rates, so each purchase keeps its real base-currency cost at its
acquisition date.

## Decision

### Base currency

* Add a per-user base-currency preference (`users.base_currency`, ISO 4217,
  nullable; `null` means "derive from the dominant price currency" — the most
  common price currency across the collector's priced coins).

### Conversion source and cache

* Convert using **European Central Bank** reference rates obtained from
  **frankfurter.app** (free, open, **no API key**).
* Access rates behind an `FxRateProvider` interface in `src/lib/fx`, mirroring
  the `ObjectStorage` abstraction (ADR-004 / ADR-005), so the provider is a
  one-file swap and no feature code depends on frankfurter directly.
* Cache fetched daily rates in an `fx_rates` table storing **units of each
  currency per 1 EUR** (ECB's native quotation). Any pair is derived via the
  EUR pivot: `convert(a, from→to, d) = a / rate(from,d) * rate(to,d)`. The cache
  makes reads offline-safe (dev/test) and avoids per-request network calls.
  `fx_rates` is **global reference data**, not tenant-scoped — rates are shared
  across all users and `fxRate.repository` takes no `userId`.
* A `fx.service` orchestrates cache-or-fetch and exposes a converter to the
  analytics service. **Conversion is business logic (service layer)**; the
  `fx_rates` table is reached only through `fxRate.repository`.

### When to (re)fetch

The cache is refreshed for a currency when **either** end of the needed window is
not covered, not merely when it looks stale:

* the currency has never been cached, **or**
* its newest cached rate is older than a staleness cutoff (covers the recent
  end — weekends/holidays included), **or**
* its **oldest** cached rate is later than the oldest acquisition date a
  conversion will look up (the cache does not reach back far enough — e.g. a
  fresh-but-shallow cache cannot price a 2024 purchase).

The third condition is the key correction over a recency-only check: without it,
a cache holding only recent rates silently fails every historical conversion.
`fxRate.repository.rateDateBounds` returns the `{min, max}` per currency that
drives this decision. The fetch spans `[oldest acquisition − lookback, today]`,
so the "current" snapshot is always covered too.

### Which rate, and missing rates

* **Acquisition-day rate, with a current-rate fallback.** Each price is
  converted at the ECB publication day **on or before** its acquisition date
  (ECB skips weekends/holidays), so historical purchases keep their real
  base-currency cost. When no rate covers that date — or the coin has no
  acquisition date — the **current** (most recent) rate is used instead.
* An amount already **in the base currency** needs no rate (identity), so it is
  never marked unconvertible even if that currency is absent from the cache.
* A price is counted as **unconvertible** only when ECB does not quote its
  currency **at all** (no historical and no current rate) — e.g. an exotic
  currency or crypto. Such prices are reported as a count, never silently
  dropped or summed across currencies.

## Consequences

### Conversion

Benefits:

* Single-currency portfolio figures across mixed-currency holdings.
* FX-accurate cost (each price converted at its acquisition-date rate), with a
  graceful current-rate fallback rather than dropped figures when history is
  sparse.
* No API key or secret to manage; works in dev/test offline via the cache.
* Provider is swappable behind an interface.

Tradeoffs:

* A new outbound HTTP dependency (frankfurter / ECB) at rate-sync time.
* ECB coverage excludes some exotic currencies and all crypto.
* Rates are daily (no intraday granularity) — acceptable for a collection app.
* The current-rate fallback means a figure can mix an acquisition-day basis
  (most coins) with a current basis (coins whose date ECB cannot cover); this is
  preferred over excluding the coin, and is bounded to currencies/dates the
  cache genuinely lacks.

Risks:

* Provider availability — mitigated by the cache and by treating truly
  unquoted currencies as unconvertible (figures stay honest rather than wrong).
* ECB history starts in 1999 — irrelevant for this app's data. (A purchase dated
  before ECB's earliest rate would refetch each load, since the cache can never
  cover it; out of scope per the data's realistic range.)

### Analytics & presentation (derived, no separate ADR)

The reworked `/portfolio` view is built from the converted figures the service
produces — `totalFinal`, a `costBreakdown`, and a list of per-coin
`AcquisitionEvent`s (date + base-currency amount + dimension labels):

* **Cost breakdown** — a stacked bar splitting total cost into hammer, premium,
  shipping and "final only" (coins entered with just a final price, counted but
  not split). The four components reconstitute the total paid.
* **Coins by share of cost** — a stacked bar where each segment is one coin,
  sized by its share of the total and ordered along the acquisition timeline,
  coloured by collection with a legend.
* **Acquisition-cost timeline** — the cumulative cost trend, with multi-select
  per-dimension filters (metal, category, collection, year, currency). The
  filters and the running total are computed client-side from the events; they
  **replace** the previous static allocation and per-collection comparison
  tables (those dimensions are now the timeline's filters).

## Alternatives Considered

### Latest-rates-only conversion

Convert every figure (including each trend point) at the latest rate. Simpler —
no historical lookups — but the trend would not reflect currency movement. The
chosen approach uses the latest rate only as a **fallback** when the
acquisition-day rate is genuinely unavailable, keeping historical accuracy where
the data supports it.

### Recency-only cache refresh

Refresh a currency only when its newest cached rate is stale. Rejected: a
fresh-but-shallow cache (recent rates only) would never fetch the history older
purchases need, so historical conversions would silently fail. The cache must be
refreshed on missing **coverage**, not just staleness.

### Manual / seeded rate table

A table maintained by hand or seeded at build time. No external dependency, but
rates go stale and the maintenance burden lands on the collector. Rejected as
poor UX.

### Paid FX APIs (e.g. openexchangerates)

Require API keys/secrets and incur cost. Unnecessary: ECB reference rates via
frankfurter cover the realistic currency set for free.

## References

* docs/architecture.md
* docs/database.md
* ADR-004 (S3 storage abstraction) — the provider-behind-an-interface pattern
* ADR-005 (Cloudflare R2 initial provider)
* ADR-006 (coin & valuation attribute rework) — the hammer/premium/shipping/final
  price partition the cost breakdown splits on
