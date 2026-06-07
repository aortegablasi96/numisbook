ALTER TABLE "coin_images" ADD COLUMN "storage_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "coin_images" ADD COLUMN "size_bytes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "coin_images" DROP COLUMN "data";