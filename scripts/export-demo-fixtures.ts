import "dotenv/config";
import { writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

import { objectStorage } from "@/lib/storage";
import { formatCoinTitle } from "@/lib/coin-format";

// Regenerate the demo fixtures from a real source account (ADR-016).
//
//   npm run db:export-demo                     # default source account
//   DEMO_SOURCE_EMAIL=other@x.com npm run db:export-demo
//
// Reads the source tenant's collections/coins/images/valuations from the
// database (PROD_DATABASE_URL when set, else DATABASE_URL) and its image bytes
// from object storage, then rewrites:
//
//   * scripts/demo-fixtures.ts   — the DEMO_COLLECTIONS the seed consumes
//   * scripts/demo-assets/*      — the coin photographs (old ones cleared first)
//
// The generated fixtures + assets are the committed, reviewable source of truth;
// `npm run db:seed-demo` then loads them into the public demo tenant through the
// domain services. Invoices are not yet handled by the exporter — it errors if
// the source account has any, so the fixtures can never silently drop data.

const SOURCE_EMAIL = process.env.DEMO_SOURCE_EMAIL ?? "aob96devtest@gmail.com";
const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, "demo-assets");

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Coin text columns emitted into the fixture attributes, in a readable order.
const TEXT_KEYS = [
  "issuingAuthority",
  "category",
  "denomination",
  "mint",
  "metal",
  "grade",
  "obverseDescription",
  "reverseDescription",
  "observations",
  "catalogueReferences",
  "pedigree",
  "auctionHouse",
  "auctionName",
  "auctionLot",
] as const;

const camelToSnake = (s: string) => s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const ser = (value: unknown): string => JSON.stringify(value);

// Wipe the previously-exported image assets so a re-run cannot leave orphans for
// coins that no longer exist. LICENSES.md (and any non-image file) is preserved.
function clearAssetImages() {
  for (const file of readdirSync(ASSETS)) {
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(file)) unlinkSync(join(ASSETS, file));
  }
}

async function main() {
  const cs = process.env.PROD_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!cs) throw new Error("No PROD_DATABASE_URL / DATABASE_URL set");
  const pool = new Pool({ connectionString: cs });

  const u = await pool.query(
    `SELECT id, base_currency FROM users WHERE lower(email) = lower($1)`,
    [SOURCE_EMAIL],
  );
  if (u.rows.length === 0) throw new Error(`No user found for ${SOURCE_EMAIL}`);
  const user = u.rows[0];

  const cols = await pool.query(
    `SELECT id, name FROM collections WHERE user_id = $1 ORDER BY created_at`,
    [user.id],
  );

  clearAssetImages();

  const usedSlugs = new Set<string>();
  let assetCount = 0;
  const collectionBlocks: string[] = [];

  for (const col of cols.rows) {
    const coins = await pool.query(
      `SELECT * FROM coins WHERE collection_id = $1 ORDER BY created_at`,
      [col.id],
    );

    const coinBlocks: string[] = [];
    for (const coin of coins.rows) {
      const invs = await pool.query(
        `SELECT id FROM coin_invoices WHERE coin_id = $1`,
        [coin.id],
      );
      if (invs.rows.length > 0) {
        throw new Error(
          `Coin ${coin.id} has invoices — the exporter does not handle invoices yet.`,
        );
      }

      const title = formatCoinTitle({
        category: coin.category,
        issuingAuthority: coin.issuing_authority,
        yearFrom: coin.year_from,
        yearTo: coin.year_to,
        mint: coin.mint,
      });
      let base = slugify(
        [coin.issuing_authority, coin.denomination].filter(Boolean).join(" ") || title,
      );
      while (usedSlugs.has(base)) base = `${base}-x`;
      usedSlugs.add(base);

      // --- images ---
      const imgs = await pool.query(
        `SELECT mime_type, storage_key FROM coin_images WHERE coin_id = $1 ORDER BY created_at`,
        [coin.id],
      );
      const imageFiles: string[] = [];
      for (let i = 0; i < imgs.rows.length; i++) {
        const { mime_type, storage_key } = imgs.rows[i];
        const bytes = await objectStorage.get(storage_key);
        if (!bytes) throw new Error(`Missing object in storage: ${storage_key}`);
        const ext = EXT[mime_type] ?? "bin";
        const suffix =
          imgs.rows.length === 1 ? "" : i === 0 ? "-obverse" : i === 1 ? "-reverse" : `-${i + 1}`;
        const file = `${base}${suffix}.${ext}`;
        writeFileSync(join(ASSETS, file), bytes);
        imageFiles.push(file);
        assetCount++;
      }

      // --- valuations ---
      const vals = await pool.query(
        `SELECT amount, currency, source, source_url, valued_at
           FROM valuations WHERE coin_id = $1 ORDER BY valued_at`,
        [coin.id],
      );

      // --- attribute lines ---
      const lines: string[] = [];
      for (const key of TEXT_KEYS) {
        const v = coin[camelToSnake(key)];
        if (v != null && String(v).trim() !== "") lines.push(`          ${key}: ${ser(v)},`);
      }
      if (coin.year_from != null) lines.push(`          yearFrom: ${coin.year_from},`);
      if (coin.year_to != null) lines.push(`          yearTo: ${coin.year_to},`);
      if (coin.weight != null) lines.push(`          weight: ${Number(coin.weight)},`);
      if (coin.diameter != null) lines.push(`          diameter: ${Number(coin.diameter)},`);
      if (coin.auction_date != null) {
        const d =
          coin.auction_date instanceof Date
            ? coin.auction_date.toISOString().slice(0, 10)
            : String(coin.auction_date).slice(0, 10);
        lines.push(`          auctionDate: ${ser(d)},`);
      }

      // Price: reproduce the create-time partition. When any of the four
      // components is set, addCoin recomputes finalPrice as their sum — so emit
      // the components (faithful when the sum matches the stored total); else
      // emit finalPrice directly.
      const comp = {
        hammerPrice: coin.hammer_price,
        auctionPremium: coin.auction_premium,
        shippingCost: coin.shipping_cost,
        taxCost: coin.tax_cost,
      };
      const hasComp = Object.values(comp).some((x) => x != null);
      const storedFinal = coin.final_price != null ? Number(coin.final_price) : null;
      const sum =
        Number(comp.hammerPrice ?? 0) +
        Number(comp.auctionPremium ?? 0) +
        Number(comp.shippingCost ?? 0) +
        Number(comp.taxCost ?? 0);
      if (hasComp && (storedFinal == null || Math.abs(sum - storedFinal) <= 0.005)) {
        for (const [k, v] of Object.entries(comp)) {
          if (v != null) lines.push(`          ${k}: ${Number(v)},`);
        }
      } else if (storedFinal != null) {
        if (hasComp)
          console.warn(`  ! ${title}: component sum ${sum} != final ${storedFinal}; emitting finalPrice`);
        lines.push(`          finalPrice: ${storedFinal},`);
      }
      if (coin.price_currency != null) lines.push(`          priceCurrency: ${ser(coin.price_currency)},`);

      // --- assemble ---
      const parts: string[] = [`      {`, `        // ${title}`, `        attributes: {`, ...lines, `        },`];
      if (imageFiles.length)
        parts.push(`        images: [${imageFiles.map((f) => ser(f)).join(", ")}],`);
      if (vals.rows.length) {
        parts.push(`        valuations: [`);
        for (const v of vals.rows) {
          const va =
            v.valued_at instanceof Date
              ? v.valued_at.toISOString().slice(0, 10)
              : String(v.valued_at).slice(0, 10);
          const vp = [`amount: ${Number(v.amount)}`, `currency: ${ser(v.currency)}`, `valuedAt: ${ser(va)}`];
          if (v.source) vp.push(`source: ${ser(v.source)}`);
          if (v.source_url) vp.push(`sourceUrl: ${ser(v.source_url)}`);
          parts.push(`          { ${vp.join(", ")} },`);
        }
        parts.push(`        ],`);
      }
      parts.push(`      },`);
      coinBlocks.push(parts.join("\n"));
    }

    collectionBlocks.push(
      [`  {`, `    name: ${ser(col.name)},`, `    coins: [`, coinBlocks.join("\n"), `    ],`, `  },`].join("\n"),
    );
  }

  const baseCurrency = user.base_currency ?? "EUR";

  const header = `// The demo collector's collection (ADR-016).
//
// GENERATED by scripts/export-demo-fixtures.ts from the source demo account, then
// committed. Do not hand-edit — re-run \`npm run db:export-demo\` to refresh it.
// It is the shop-window collection a visitor sees on the public demo tenant,
// loaded through the domain services by scripts/seed-demo.ts.
//
// The coin photographs in demo-assets/ are the account owner's own images — see
// demo-assets/LICENSES.md.

export type DemoValuation = {
  amount: number;
  currency: string;
  valuedAt: string;
  source?: string;
  sourceUrl?: string;
};

export type DemoCoin = {
  // Coins have no name column: the title is derived from these attributes by
  // formatCoinTitle (ADR-006).
  attributes: Record<string, unknown>;
  /** Files in demo-assets/, in carousel order (obverse first). */
  images?: string[];
  /** Auction invoice: a generated PDF receipt. */
  invoice?: { filename: string; house: string; lot: string; date: string; total: string };
  valuations?: DemoValuation[];
};

export type DemoCollection = { name: string; coins: DemoCoin[] };

export const DEMO_BASE_CURRENCY = ${ser(baseCurrency)};

export const DEMO_COLLECTIONS: DemoCollection[] = [
`;

  writeFileSync(join(HERE, "demo-fixtures.ts"), header + collectionBlocks.join("\n") + "\n];\n", "utf8");

  console.log(
    `Wrote demo-fixtures.ts from ${SOURCE_EMAIL}: ${cols.rows.length} collections, ` +
      `${usedSlugs.size} coins, ${assetCount} image assets. Base currency ${baseCurrency}.`,
  );

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
