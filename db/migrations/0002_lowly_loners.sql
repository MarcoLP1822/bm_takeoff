ALTER TABLE "books" ADD COLUMN "analysis_progress" json DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "generated_content" ADD COLUMN "source_type" text;--> statement-breakpoint
ALTER TABLE "generated_content" ADD COLUMN "source_content" text;--> statement-breakpoint
ALTER TABLE "generated_content" ADD COLUMN "variation_group_id" uuid;--> statement-breakpoint
ALTER TABLE "generated_content" ADD COLUMN "generation_context" json;