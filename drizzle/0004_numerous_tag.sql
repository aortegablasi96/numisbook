ALTER TABLE "coin_bills" RENAME TO "coin_invoices";--> statement-breakpoint
ALTER TABLE "coin_invoices" DROP CONSTRAINT "coin_bills_coin_id_coins_id_fk";
--> statement-breakpoint
ALTER TABLE "coin_invoices" ADD CONSTRAINT "coin_invoices_coin_id_coins_id_fk" FOREIGN KEY ("coin_id") REFERENCES "public"."coins"("id") ON DELETE cascade ON UPDATE no action;