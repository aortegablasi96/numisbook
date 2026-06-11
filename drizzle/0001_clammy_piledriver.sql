CREATE TABLE "fx_rates" (
	"rate_date" date NOT NULL,
	"currency" text NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fx_rates_rate_date_currency_pk" PRIMARY KEY("rate_date","currency")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "base_currency" text;--> statement-breakpoint
CREATE INDEX "fx_rates_currency_date_idx" ON "fx_rates" USING btree ("currency","rate_date");