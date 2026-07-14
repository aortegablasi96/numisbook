import "dotenv/config";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { userRepository } from "@/repositories/user.repository";
import { deleteAccount } from "@/services/account.service";
import { createCollection } from "@/services/collection.service";
import { addCoin } from "@/services/coin.service";
import { addCoinImage } from "@/services/coinImage.service";
import { addCoinInvoice } from "@/services/coinInvoice.service";
import { recordValuation } from "@/services/valuation.service";
import { formatCoinTitle } from "@/lib/coin-format";
import { DEMO_EMAIL, DEMO_NAME } from "@/lib/demo";
import { DEMO_BASE_CURRENCY, DEMO_COLLECTIONS } from "./demo-fixtures";
import { buildInvoicePdf } from "./demo-invoice-pdf";

// Seed the public demo tenant (ADR-016).
//
//   npm run db:seed-demo
//
// Re-runnable: it deletes any existing demo tenant first, reusing the account
// service's deletion path so the DB cascade *and* the object-storage purge both
// happen — a naive `DELETE FROM users` would orphan every image and invoice blob.
//
// It seeds through the domain **services** rather than writing rows directly, so
// the demo data is created by exactly the code paths a real user's data is, and
// image/invoice bytes go through the storage abstraction (local FS in dev, R2 in
// production — ADR-004).

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "demo-assets");

function mimeFor(file: string): string {
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function main() {
  const existing = await userRepository.findDemo();
  if (existing) {
    console.log(`Removing the existing demo tenant (${existing.id})…`);
    await deleteAccount(existing.id);
  }

  const demo = await userRepository.createDemo({
    email: DEMO_EMAIL,
    name: DEMO_NAME,
    baseCurrency: DEMO_BASE_CURRENCY,
  });
  console.log(`Created demo tenant ${demo.id} (${demo.email})`);

  let coins = 0;
  let images = 0;
  let invoices = 0;
  let valuations = 0;

  for (const fixture of DEMO_COLLECTIONS) {
    const collection = await createCollection(demo.id, fixture.name);
    console.log(`\n  ${collection.name}`);

    for (const coinFixture of fixture.coins) {
      const coin = await addCoin(demo.id, collection.id, coinFixture.attributes);
      coins++;
      console.log(`    ${formatCoinTitle(coin)}`);

      for (const file of coinFixture.images ?? []) {
        const data = readFileSync(join(ASSETS, file));
        await addCoinImage(demo.id, coin.id, mimeFor(file), data);
        images++;
      }

      if (coinFixture.invoice) {
        const { filename, house, lot, date, total } = coinFixture.invoice;
        const pdf = buildInvoicePdf({
          house,
          lot,
          date,
          total,
          buyer: DEMO_NAME,
          description: formatCoinTitle(coin),
        });
        await addCoinInvoice(demo.id, coin.id, "application/pdf", filename, pdf);
        invoices++;
      }

      for (const valuation of coinFixture.valuations ?? []) {
        await recordValuation(demo.id, coin.id, valuation);
        valuations++;
      }
    }
  }

  console.log(
    `\nSeeded ${DEMO_COLLECTIONS.length} collections, ${coins} coins, ` +
      `${images} images, ${invoices} invoices, ${valuations} valuations.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exit(1);
  });
