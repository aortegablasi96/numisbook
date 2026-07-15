# Demo coin photographs — provenance

The public demo tenant (ADR-016) is seeded with real coin photographs so that a
visitor sees a credible collection rather than placeholders.

These images are **the demo account owner's own photographs** of their own coins,
exported from the source account (`aob96devtest@gmail.com`) by
`scripts/export-demo-fixtures.ts` and committed here as fixtures for
`scripts/seed-demo.ts`. They are not application assets and are not served from
`public/`; the seed uploads them through the object-storage abstraction like any
other coin image.

They are provided by the owner for use as the NumisBook demo collection. To
refresh them (and `demo-fixtures.ts`) from the source account, run
`npm run db:export-demo`.

| File | Coin |
| --- | --- |
| `brutus-denarius-obverse.jpg`, `brutus-denarius-reverse.jpg` | Roman Republic — Brutus, Denarius (42 BC) |
| `hadrian-aureus-obverse.jpg`, `hadrian-aureus-reverse.jpg` | Roman Empire — Hadrian, Aureus (117–138 AD) |
| `mark-antony-cleopatra-tetradrachm-obverse.jpg`, `mark-antony-cleopatra-tetradrachm-reverse.jpg` | Roman Republic — Mark Antony & Cleopatra, Tetradrachm (36 BC) |
| `carlos-iii-8-escudos-obverse.jpg`, `carlos-iii-8-escudos-reverse.jpg` | Spanish Empire — Carlos III, 8 Escudos (1769) |
| `felipe-iv-8-escudos-obverse.jpg`, `felipe-iv-8-escudos-reverse.jpg` | Spanish Empire — Felipe IV, 8 Escudos (1637) |
| `ferdinand-vii-2-reales-obverse.jpg`, `ferdinand-vii-2-reales-reverse.jpg` | Spanish Empire — Ferdinand VII, 2 Reales (1808) |
