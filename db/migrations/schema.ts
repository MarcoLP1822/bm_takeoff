import { pgTable, uuid, text, json, timestamp, unique, boolean, foreignKey, integer, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const analysisStatus = pgEnum("analysis_status", ['pending', 'processing', 'completed', 'failed'])
export const contentStatus = pgEnum("content_status", ['draft', 'scheduled', 'published', 'failed'])
export const contentType = pgEnum("content_type", ['post', 'story', 'article'])
export const membership = pgEnum("membership", ['free', 'pro'])
export const platform = pgEnum("platform", ['twitter', 'instagram', 'linkedin', 'facebook'])
export const socialPlatform = pgEnum("social_platform", ['twitter', 'instagram', 'linkedin', 'facebook'])


export const books = pgTable("books", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	author: text(),
	genre: text(),
	fileUrl: text("file_url").notNull(),
	fileName: text("file_name").notNull(),
	fileSize: text("file_size"),
	textContent: text("text_content"),
	analysisStatus: analysisStatus("analysis_status").default('pending').notNull(),
	analysisData: json("analysis_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const customers = pgTable("customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	membership: membership().default('free').notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("customers_user_id_unique").on(table.userId),
	unique("customers_stripe_customer_id_unique").on(table.stripeCustomerId),
	unique("customers_stripe_subscription_id_unique").on(table.stripeSubscriptionId),
]);

export const socialAccounts = pgTable("social_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	platform: socialPlatform().notNull(),
	accountId: text("account_id").notNull(),
	accountName: text("account_name").notNull(),
	accountHandle: text("account_handle"),
	accessToken: text("access_token").notNull(),
	refreshToken: text("refresh_token"),
	tokenExpiresAt: timestamp("token_expires_at", { mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const generatedContent = pgTable("generated_content", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	bookId: uuid("book_id").notNull(),
	userId: text("user_id").notNull(),
	platform: platform().notNull(),
	contentType: contentType("content_type").notNull(),
	content: text().notNull(),
	hashtags: text().array(),
	imageUrl: text("image_url"),
	status: contentStatus().default('draft').notNull(),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	socialPostId: text("social_post_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bookId],
			foreignColumns: [books.id],
			name: "generated_content_book_id_books_id_fk"
		}).onDelete("cascade"),
]);

export const postAnalytics = pgTable("post_analytics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contentId: uuid("content_id").notNull(),
	platform: text().notNull(),
	postId: text("post_id").notNull(),
	impressions: integer().default(0).notNull(),
	likes: integer().default(0).notNull(),
	shares: integer().default(0).notNull(),
	comments: integer().default(0).notNull(),
	clicks: integer().default(0).notNull(),
	reach: integer().default(0),
	engagementRate: text("engagement_rate"),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.contentId],
			foreignColumns: [generatedContent.id],
			name: "post_analytics_content_id_generated_content_id_fk"
		}).onDelete("cascade"),
]);
