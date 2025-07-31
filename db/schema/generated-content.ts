import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { books } from "./books"

export const platform = pgEnum("platform", ["twitter", "instagram", "linkedin", "facebook"])
export const contentType = pgEnum("content_type", ["post", "story", "article"])
export const contentStatus = pgEnum("content_status", ["draft", "scheduled", "published", "failed"])

export const generatedContent = pgTable("generated_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookId: uuid("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").notNull(),
  platform: platform("platform").notNull(),
  contentType: contentType("content_type").notNull(),
  content: text("content").notNull(),
  hashtags: text("hashtags").array(),
  imageUrl: text("image_url"),
  status: contentStatus("status").default("draft").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  socialPostId: text("social_post_id"), // ID from the social media platform after publishing
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

export type InsertGeneratedContent = typeof generatedContent.$inferInsert
export type SelectGeneratedContent = typeof generatedContent.$inferSelect