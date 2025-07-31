import { relations } from "drizzle-orm"
import { books } from "./books"
import { generatedContent } from "./generated-content"
import { postAnalytics } from "./post-analytics"

// Book relations
export const booksRelations = relations(books, ({ many }) => ({
  generatedContent: many(generatedContent)
}))

// Generated content relations
export const generatedContentRelations = relations(generatedContent, ({ one, many }) => ({
  book: one(books, {
    fields: [generatedContent.bookId],
    references: [books.id]
  }),
  analytics: many(postAnalytics)
}))

// Post analytics relations
export const postAnalyticsRelations = relations(postAnalytics, ({ one }) => ({
  content: one(generatedContent, {
    fields: [postAnalytics.contentId],
    references: [generatedContent.id]
  })
}))