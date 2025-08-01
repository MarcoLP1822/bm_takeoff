import { db } from "@/db"
import { socialAccounts } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

export type SocialPlatform = "twitter" | "instagram" | "linkedin" | "facebook"

export interface SocialAccount {
  id: string
  platform: SocialPlatform
  accountId: string
  accountName: string
  accountHandle?: string
  isActive: boolean
  tokenExpiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scope: string
  authUrl: string
  tokenUrl: string
}

// OAuth configurations for each platform
export const oauthConfigs: Record<SocialPlatform, OAuthConfig> = {
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXTAUTH_URL}/api/social/callback/twitter`,
    scope: "tweet.read tweet.write users.read offline.access",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token"
  },
  instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID!,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXTAUTH_URL}/api/social/callback/instagram`,
    scope: "user_profile,user_media",
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token"
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID!,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXTAUTH_URL}/api/social/callback/linkedin`,
    scope: "r_liteprofile r_emailaddress w_member_social",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken"
  },
  facebook: {
    clientId: process.env.FACEBOOK_APP_ID!,
    clientSecret: process.env.FACEBOOK_APP_SECRET!,
    redirectUri: `${process.env.NEXTAUTH_URL}/api/social/callback/facebook`,
    scope: "pages_manage_posts,pages_read_engagement,publish_to_groups",
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token"
  }
}

export class SocialMediaService {
  /**
   * Generate OAuth authorization URL for a platform
   */
  static generateAuthUrl(platform: SocialPlatform, state?: string): string {
    const config = oauthConfigs[platform]
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      response_type: "code",
      state: state || crypto.randomUUID()
    })

    // Platform-specific parameters
    if (platform === "twitter") {
      params.append("code_challenge", "challenge")
      params.append("code_challenge_method", "plain")
    }

    return `${config.authUrl}?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(
    platform: SocialPlatform,
    code: string,
    state?: string
  ): Promise<{
    accessToken: string
    refreshToken?: string
    expiresAt?: Date
    accountInfo: {
      id: string
      name: string
      handle?: string
    }
  }> {
    const config = oauthConfigs[platform]

    const tokenParams = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri
    })

    // Platform-specific token exchange
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: tokenParams.toString()
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`)
    }

    const tokenData = await response.json()

    // Get user info with the access token
    const accountInfo = await this.getUserInfo(platform, tokenData.access_token)

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined,
      accountInfo
    }
  }

  /**
   * Get user account information from platform
   */
  static async getUserInfo(
    platform: SocialPlatform,
    accessToken: string
  ): Promise<{
    id: string
    name: string
    handle?: string
  }> {
    let userInfoUrl: string
    let headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`
    }

    switch (platform) {
      case "twitter":
        userInfoUrl = "https://api.twitter.com/2/users/me"
        break
      case "instagram":
        userInfoUrl = `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
        headers = {} // Instagram uses access_token in URL
        break
      case "linkedin":
        userInfoUrl =
          "https://api.linkedin.com/v2/people/~:(id,firstName,lastName)"
        break
      case "facebook":
        userInfoUrl = `https://graph.facebook.com/me?fields=id,name&access_token=${accessToken}`
        headers = {} // Facebook uses access_token in URL
        break
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }

    const response = await fetch(userInfoUrl, { headers })

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`)
    }

    const userData = await response.json()

    // Platform-specific data parsing
    switch (platform) {
      case "twitter":
        return {
          id: userData.data.id,
          name: userData.data.name,
          handle: userData.data.username
        }
      case "instagram":
        return {
          id: userData.id,
          name: userData.username,
          handle: userData.username
        }
      case "linkedin":
        return {
          id: userData.id,
          name: `${userData.firstName.localized.en_US} ${userData.lastName.localized.en_US}`
        }
      case "facebook":
        return {
          id: userData.id,
          name: userData.name
        }
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /**
   * Refresh access token if expired
   */
  static async refreshAccessToken(
    platform: SocialPlatform,
    refreshToken: string
  ): Promise<{
    accessToken: string
    refreshToken?: string
    expiresAt?: Date
  }> {
    const config = oauthConfigs[platform]

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: params.toString()
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    const tokenData = await response.json()

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
      expiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined
    }
  }

  /**
   * Get user's connected social accounts
   */
  static async getUserAccounts(userId: string): Promise<SocialAccount[]> {
    const accounts = await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, userId))

    return accounts.map(account => ({
      id: account.id,
      platform: account.platform as SocialPlatform,
      accountId: account.accountId,
      accountName: account.accountName,
      accountHandle: account.accountHandle || undefined,
      isActive: account.isActive,
      tokenExpiresAt: account.tokenExpiresAt || undefined,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    }))
  }

  /**
   * Save or update social account
   */
  static async saveAccount(
    userId: string,
    platform: SocialPlatform,
    accountData: {
      accountId: string
      accountName: string
      accountHandle?: string
      accessToken: string
      refreshToken?: string
      expiresAt?: Date
    }
  ): Promise<void> {
    // Check if account already exists
    const existingAccount = await db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.userId, userId),
          eq(socialAccounts.platform, platform),
          eq(socialAccounts.accountId, accountData.accountId)
        )
      )
      .limit(1)

    if (existingAccount.length > 0) {
      // Update existing account
      await db
        .update(socialAccounts)
        .set({
          accountName: accountData.accountName,
          accountHandle: accountData.accountHandle,
          accessToken: accountData.accessToken,
          refreshToken: accountData.refreshToken,
          tokenExpiresAt: accountData.expiresAt,
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(socialAccounts.id, existingAccount[0].id))
    } else {
      // Insert new account
      await db.insert(socialAccounts).values({
        userId,
        platform,
        accountId: accountData.accountId,
        accountName: accountData.accountName,
        accountHandle: accountData.accountHandle,
        accessToken: accountData.accessToken,
        refreshToken: accountData.refreshToken,
        tokenExpiresAt: accountData.expiresAt,
        isActive: true
      })
    }
  }

  /**
   * Disconnect social account
   */
  static async disconnectAccount(
    userId: string,
    accountId: string
  ): Promise<void> {
    await db
      .update(socialAccounts)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(
        and(eq(socialAccounts.userId, userId), eq(socialAccounts.id, accountId))
      )
  }

  /**
   * Delete social account permanently
   */
  static async deleteAccount(userId: string, accountId: string): Promise<void> {
    await db
      .delete(socialAccounts)
      .where(
        and(eq(socialAccounts.userId, userId), eq(socialAccounts.id, accountId))
      )
  }

  /**
   * Check if token is expired and needs refresh
   */
  static isTokenExpired(expiresAt?: Date): boolean {
    if (!expiresAt) return false
    return new Date() >= expiresAt
  }

  /**
   * Get valid access token (refresh if needed)
   */
  static async getValidAccessToken(
    userId: string,
    accountId: string
  ): Promise<string> {
    const account = await db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.userId, userId),
          eq(socialAccounts.id, accountId),
          eq(socialAccounts.isActive, true)
        )
      )
      .limit(1)

    if (account.length === 0) {
      throw new Error("Account not found or inactive")
    }

    const accountData = account[0]

    // Check if token needs refresh
    if (
      this.isTokenExpired(accountData.tokenExpiresAt || undefined) &&
      accountData.refreshToken
    ) {
      try {
        const refreshedTokens = await this.refreshAccessToken(
          accountData.platform as SocialPlatform,
          accountData.refreshToken
        )

        // Update account with new tokens
        await db
          .update(socialAccounts)
          .set({
            accessToken: refreshedTokens.accessToken,
            refreshToken:
              refreshedTokens.refreshToken || accountData.refreshToken,
            tokenExpiresAt: refreshedTokens.expiresAt,
            updatedAt: new Date()
          })
          .where(eq(socialAccounts.id, accountId))

        return refreshedTokens.accessToken
      } catch (error) {
        // If refresh fails, mark account as inactive
        await db
          .update(socialAccounts)
          .set({
            isActive: false,
            updatedAt: new Date()
          })
          .where(eq(socialAccounts.id, accountId))

        throw new Error("Token refresh failed. Please reconnect your account.")
      }
    }

    return accountData.accessToken
  }
}
