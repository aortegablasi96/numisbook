# Demo coin photographs — provenance

The public demo tenant (ADR-016) is seeded with real coin photographs so that a
visitor sees a credible collection rather than placeholders. Every file here is
**public domain or CC0** — mostly museum photography from the Metropolitan Museum
of Art, the Smithsonian National Numismatic Collection, and Yale.

These images are fixtures for `scripts/seed-demo.ts`. They are not application
assets and are not served from `public/`; the seed uploads them through the
object-storage abstraction like any other coin image.

Neither CC0 nor public domain requires attribution. The table is recorded anyway,
so the provenance of anything committed here is auditable.

| File | Source (Wikimedia Commons) | Licence | Credit |
| --- | --- | --- | --- |
| `alexander-tetradrachm.jpg` | [Tetradrachm of Alexander the Great MET DP-13132-044.jpg](https://commons.wikimedia.org/wiki/File:Tetradrachm_of_Alexander_the_Great_MET_DP-13132-044.jpg) | CC0 | Unknown |
| `double-eagle-1907.jpg` | [NNC-US-1907-G$20-Saint Gaudens (Roman, high relief).jpg](https://commons.wikimedia.org/wiki/File:NNC-US-1907-G$20-Saint_Gaudens_(Roman,_high_relief).jpg) | Public domain | US Mint (coin), National Numismatic Collection (photograph by Jaclyn Nash) |
| `greek-tetradrachm-2.jpg` | [Tetradrachm MET DP-13132-041.jpg](https://commons.wikimedia.org/wiki/File:Tetradrachm_MET_DP-13132-041.jpg) | CC0 | Unknown |
| `greek-tetradrachm.jpg` | [Tetradrachm MET DP-13132-029.jpg](https://commons.wikimedia.org/wiki/File:Tetradrachm_MET_DP-13132-029.jpg) | CC0 | Unknown |
| `hadrian-aureus.jpg` | [Gold aureus of Hadrian MET DP104782b.jpg](https://commons.wikimedia.org/wiki/File:Gold_aureus_of_Hadrian_MET_DP104782b.jpg) | CC0 | Unknown |
| `indian-head-eagle-obverse.jpg` | [NNC-US-1907-G$10-Indian Head (no motto) obverse (cropped).jpg](https://commons.wikimedia.org/wiki/File:NNC-US-1907-G$10-Indian_Head_(no_motto)_obverse_(cropped).jpg) | Public domain | US Mint (coin), National Numismatic Collection (photograph by Jaclyn Nash) |
| `indian-head-eagle-reverse.jpg` | [NNC-US-1907-G$10-Indian Head (no motto) reverse (cropped).jpg](https://commons.wikimedia.org/wiki/File:NNC-US-1907-G$10-Indian_Head_(no_motto)_reverse_(cropped).jpg) | Public domain | US Mint (coin), National Numismatic Collection (photograph by Jaclyn Nash) |
| `liberty-double-eagle-obverse.jpg` | [NNC-US-1849-G$20-Liberty Head (Twenty D.) obverse (cropped).jpg](https://commons.wikimedia.org/wiki/File:NNC-US-1849-G$20-Liberty_Head_(Twenty_D.)_obverse_(cropped).jpg) | Public domain | US Mint (coin), National Numismatic Collection (photograph by Jaclyn Nash) |
| `liberty-double-eagle-reverse.jpg` | [NNC-US-1849-G$20-Liberty Head (Twenty D.) reverse (cropped).jpg](https://commons.wikimedia.org/wiki/File:NNC-US-1849-G$20-Liberty_Head_(Twenty_D.)_reverse_(cropped).jpg) | Public domain | US Mint (coin), National Numismatic Collection (photograph by Jaclyn Nash) |
| `morgan-dollar-obverse.jpg` | [1879S Morgan Dollar NGC MS67plus Obverse.png](https://commons.wikimedia.org/wiki/File:1879S_Morgan_Dollar_NGC_MS67plus_Obverse.png) | Public domain | Brandon Grossardt for the coin image. George T. Morgan for the coin design. |
| `morgan-dollar-reverse.jpg` | [1879S Morgan Dollar NGC MS67plus Reverse.png](https://commons.wikimedia.org/wiki/File:1879S_Morgan_Dollar_NGC_MS67plus_Reverse.png) | Public domain | Brandon Grossardt for the coin image. George T. Morgan for the coin design. |
| `peace-dollar.jpg` | [NNC-US-1921-1$-Peace dollar.jpg](https://commons.wikimedia.org/wiki/File:NNC-US-1921-1$-Peace_dollar.jpg) | Public domain | US Mint (coin), National Numismatic Collection (photograph by Jaclyn Nash) |
| `turban-head-eagle.jpg` | [NNC-US-1795-G$10-Turban Head (small eagle).jpg](https://commons.wikimedia.org/wiki/File:NNC-US-1795-G$10-Turban_Head_(small_eagle).jpg) | Public domain | US Mint (coin), National Numismatic Collection (photograph by Jaclyn Nash) |
| `turban-head-half-eagle-obverse.jpg` | [NNC-US-1795-G$5-Turban Head (small eagle) (cropped).jpg](https://commons.wikimedia.org/wiki/File:NNC-US-1795-G$5-Turban_Head_(small_eagle)_(cropped).jpg) | Public domain | US Mint (coin), National Numismatic Collection (photograph by Jaclyn Nash) |
| `turban-head-half-eagle-reverse.jpg` | [NNC-US-1795-G$5-Turban Head (small eagle) reverse (cropped).jpg](https://commons.wikimedia.org/wiki/File:NNC-US-1795-G$5-Turban_Head_(small_eagle)_reverse_(cropped).jpg) | Public domain | US Mint (coin), National Numismatic Collection (photograph by Jaclyn Nash) |
| `victoria-double-sovereign.jpg` | [Queen Victoria proof double sovereign MET DP100383 (cropped).jpg](https://commons.wikimedia.org/wiki/File:Queen_Victoria_proof_double_sovereign_MET_DP100383_(cropped).jpg) | Public domain | Thomas Brock |
| `victoria-sovereign.jpg` | [Victoria sovereign MET DP100379.jpg](https://commons.wikimedia.org/wiki/File:Victoria_sovereign_MET_DP100379.jpg) | CC0 | William Wyon / Royal Mint |

Total: 17 files, 3635 KB. Each is resized to fit
1200×1200 and re-encoded as JPEG (q82) — the app serves 128–800px thumbnails, so
the originals' full resolution is dead weight in git.
