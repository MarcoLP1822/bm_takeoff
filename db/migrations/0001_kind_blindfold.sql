CREATE TYPE "public"."analysis_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'scheduled', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('post', 'story', 'article');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('twitter', 'instagram', 'linkedin', 'facebook');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('twitter', 'instagram', 'linkedin', 'facebook');--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"genre" text,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" text,
	"text_content" text,
	"analysis_status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"analysis_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"platform" "platform" NOT NULL,
	"content_type" "content_type" NOT NULL,
	"content" text NOT NULL,
	"hashtags" text[],
	"image_url" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"social_post_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"platform" "social_platform" NOT NULL,
	"account_id" text NOT NULL,
	"account_name" text NOT NULL,
	"account_handle" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"post_id" text NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"reach" integer DEFAULT 0,
	"engagement_rate" text,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generated_content" ADD CONSTRAINT "generated_content_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_analytics" ADD CONSTRAINT "post_analytics_content_id_generated_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."generated_content"("id") ON DELETE cascade ON UPDATE no action;