ALTER TABLE "coin_images" ADD COLUMN "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "coin_images" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "coin_images" DROP CONSTRAINT "coin_images_pkey";
--> statement-breakpoint
ALTER TABLE "coin_images" ADD PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE "coin_images" DROP COLUMN "updated_at";
