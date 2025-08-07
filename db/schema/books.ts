import {
  boolean,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core"

export const analysisStatus = pgEnum("analysis_status", [
  "pending",
  "processing",
  "completed",
  "failed"
])

export const books = pgTable("books", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  author: text("author"),
  genre: text("genre"),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: text("file_size"),
  textContent: text("text_content"),
  analysisStatus: analysisStatus("analysis_status")
    .default("pending")
    .notNull(),
  analysisData: json("analysis_data"),
  analysisProgress: json("analysis_progress").default('{}'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

export type InsertBook = typeof books.$inferInsert
export type SelectBook = typeof books.$inferSelect
