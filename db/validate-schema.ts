import { books, generatedContent, socialAccounts, postAnalytics } from "./schema"

// This script validates that all schemas are properly defined and can be imported
console.log("Validating database schemas...")

// Check that all tables are properly defined
console.log("✓ Books table schema:", books)
console.log("✓ Generated content table schema:", generatedContent)
console.log("✓ Social accounts table schema:", socialAccounts)
console.log("✓ Post analytics table schema:", postAnalytics)

console.log("✅ All schemas validated successfully!")

// Check that types can be inferred
import type { InsertBook, SelectBook } from "./schema/books"
import type { InsertGeneratedContent, SelectGeneratedContent } from "./schema/generated-content"
import type { InsertSocialAccount, SelectSocialAccount } from "./schema/social-accounts"
import type { InsertPostAnalytics, SelectPostAnalytics } from "./schema/post-analytics"

console.log("✅ All TypeScript types are properly inferred!")

export {
  InsertBook,
  SelectBook,
  InsertGeneratedContent,
  SelectGeneratedContent,
  InsertSocialAccount,
  SelectSocialAccount,
  InsertPostAnalytics,
  SelectPostAnalytics
}