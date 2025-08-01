import { config } from "dotenv"
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import {
  customers,
  books,
  generatedContent,
  socialAccounts,
  postAnalytics,
  booksRelations,
  generatedContentRelations,
  postAnalyticsRelations
} from "./schema"

// Re-export drizzle-orm operators for convenience
export {
  eq,
  and,
  or,
  gte,
  lte,
  gt,
  lt,
  desc,
  asc,
  sql,
  count,
  sum,
  avg
} from "drizzle-orm"

config({ path: ".env.local" })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set")
}

const dbSchema = {
  // tables
  customers,
  books,
  generatedContent,
  socialAccounts,
  postAnalytics,
  // relations
  booksRelations,
  generatedContentRelations,
  postAnalyticsRelations
}

function initializeDb(url: string) {
  const client = postgres(url, { prepare: false })
  return drizzlePostgres(client, { schema: dbSchema })
}

export const db = initializeDb(databaseUrl)
