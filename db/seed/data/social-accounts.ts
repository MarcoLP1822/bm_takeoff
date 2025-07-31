import { InsertSocialAccount } from "../../schema/social-accounts"

export const socialAccountsData: InsertSocialAccount[] = [
  {
    userId: "user_test_1",
    platform: "twitter",
    accountId: "twitter_123456789",
    accountName: "John Doe",
    accountHandle: "@johndoe",
    accessToken: "twitter_access_token_example",
    refreshToken: "twitter_refresh_token_example",
    tokenExpiresAt: new Date("2024-12-31T23:59:59Z"),
    isActive: true
  },
  {
    userId: "user_test_1",
    platform: "linkedin",
    accountId: "linkedin_987654321",
    accountName: "John Doe",
    accountHandle: "john-doe-professional",
    accessToken: "linkedin_access_token_example",
    refreshToken: "linkedin_refresh_token_example",
    tokenExpiresAt: new Date("2024-12-31T23:59:59Z"),
    isActive: true
  },
  {
    userId: "user_test_1",
    platform: "instagram",
    accountId: "instagram_456789123",
    accountName: "John Doe",
    accountHandle: "@johndoe_reads",
    accessToken: "instagram_access_token_example",
    tokenExpiresAt: new Date("2024-06-30T23:59:59Z"),
    isActive: true
  },
  {
    userId: "user_test_2",
    platform: "facebook",
    accountId: "facebook_789123456",
    accountName: "Jane Smith",
    accountHandle: "jane.smith.author",
    accessToken: "facebook_access_token_example",
    refreshToken: "facebook_refresh_token_example",
    tokenExpiresAt: new Date("2024-12-31T23:59:59Z"),
    isActive: true
  },
  {
    userId: "user_test_2",
    platform: "twitter",
    accountId: "twitter_321654987",
    accountName: "Jane Smith",
    accountHandle: "@janesmith_writes",
    accessToken: "twitter_access_token_example_2",
    refreshToken: "twitter_refresh_token_example_2",
    tokenExpiresAt: new Date("2024-12-31T23:59:59Z"),
    isActive: false // Inactive account for testing
  }
]