CREATE TABLE "assistant_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_key" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_usage_tokens_non_negative" CHECK ("assistant_usage"."prompt_tokens" >= 0 AND "assistant_usage"."completion_tokens" >= 0),
	CONSTRAINT "assistant_usage_outcome_valid" CHECK ("assistant_usage"."outcome" IN ('completed', 'aborted', 'limit_exceeded', 'error'))
);
--> statement-breakpoint
CREATE INDEX "assistant_usage_subject_created_idx" ON "assistant_usage" USING btree ("subject_key","created_at" DESC NULLS LAST);