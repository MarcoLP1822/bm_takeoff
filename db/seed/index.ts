"use server"

import process from "process"
import { db } from "../index"
import { customers } from "../schema/customers"
import { books } from "../schema/books"
import { generatedContent } from "../schema/generated-content"
import { socialAccounts } from "../schema/social-accounts"
import { postAnalytics } from "../schema/post-analytics"
import { customersData } from "./data/customers"
import { booksData } from "./data/books"
import { generatedContentData } from "./data/generated-content"
import { socialAccountsData } from "./data/social-accounts"
import { postAnalyticsData } from "./data/post-analytics"

async function seed() {
  console.warn("Seeding database...")

  // Reset all tables in reverse order of dependencies
  console.warn("Resetting tables...")
  await db.execute("TRUNCATE TABLE post_analytics CASCADE")
  await db.execute("TRUNCATE TABLE generated_content CASCADE")
  await db.execute("TRUNCATE TABLE social_accounts CASCADE")
  await db.execute("TRUNCATE TABLE books CASCADE")
  await db.execute("TRUNCATE TABLE customers CASCADE")
  console.warn("Finished resetting tables")

  // Seed customers
  console.warn("Seeding customers...")
  await db.insert(customers).values(customersData)

  // Seed books
  console.warn("Seeding books...")
  const insertedBooks = await db.insert(books).values(booksData).returning()

  // Seed social accounts
  console.warn("Seeding social accounts...")
  await db.insert(socialAccounts).values(socialAccountsData)

  // Seed generated content with actual book IDs
  console.warn("Seeding generated content...")
  const contentDataWithBookIds = generatedContentData.map((content, index) => ({
    ...content,
    bookId: insertedBooks[index < 2 ? 0 : index < 4 ? 1 : 2].id // Map to actual book IDs
  }))
  const insertedContent = await db.insert(generatedContent).values(contentDataWithBookIds).returning()

  // Seed post analytics with actual content IDs
  console.warn("Seeding post analytics...")
  const analyticsDataWithContentIds = postAnalyticsData.map((analytics, index) => ({
    ...analytics,
    contentId: insertedContent[index].id // Map to actual content IDs
  }))
  await db.insert(postAnalytics).values(analyticsDataWithContentIds)

  console.warn("Seeding complete!")
  db.$client.end()
}

seed().catch(error => {
  console.error("Error seeding database:", error)
  process.exit(1)
})
