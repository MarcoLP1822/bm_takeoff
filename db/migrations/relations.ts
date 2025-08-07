import { relations } from "drizzle-orm/relations";
import { books, generatedContent, postAnalytics } from "./schema";

export const generatedContentRelations = relations(generatedContent, ({one, many}) => ({
	book: one(books, {
		fields: [generatedContent.bookId],
		references: [books.id]
	}),
	postAnalytics: many(postAnalytics),
}));

export const booksRelations = relations(books, ({many}) => ({
	generatedContents: many(generatedContent),
}));

export const postAnalyticsRelations = relations(postAnalytics, ({one}) => ({
	generatedContent: one(generatedContent, {
		fields: [postAnalytics.contentId],
		references: [generatedContent.id]
	}),
}));