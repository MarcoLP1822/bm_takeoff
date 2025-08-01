import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { generatedContent } from "./generated-content"

export const postAnalytics = pgTable("post_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentId: uuid("content_id")
    .references(() => generatedContent.id, { onDelete: "cascade" })
    .notNull(),
  platform: text("platform").notNull(),
  postId: text("post_id").notNull(), // Social media platform's post ID
  impressions: integer("impressions").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  shares: integer("shares").default(0).notNull(),
  comments: integer("comments").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  reach: integer("reach").default(0), // Unique users who saw the post
  engagementRate: text("engagement_rate"), // Calculated engagement percentage
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertPostAnalytics = typeof postAnalytics.$inferInsert
export type SelectPostAnalytics = typeof postAnalytics.$inferSelect
