import OpenAI from "openai"

/**
 * Check if we're running in a browser environment
 */
export const isBrowser = typeof window !== "undefined"

/**
 * Safely initialize OpenAI client
 * In production, this should only be used on the server side
 */
export function createOpenAIClient(): OpenAI | null {
  // In browser environments, return null to force API route usage
  if (isBrowser && process.env.NODE_ENV === "production") {
    console.warn("OpenAI client should not be used in browser in production. Use API routes instead.")
    return null
  }

  // For development/test environments, allow browser usage with warning
  if (isBrowser) {
    console.warn("OpenAI client running in browser environment. This should only be used for development.")
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "test-key",
    dangerouslyAllowBrowser: isBrowser && process.env.NODE_ENV !== "production",
    timeout: 120000 // 120 seconds timeout
  })
}

/**
 * Get OpenAI client or throw error if not available
 */
export function getOpenAIClient(): OpenAI {
  const client = createOpenAIClient()
  if (!client) {
    throw new Error("OpenAI client not available in browser. Use API routes instead.")
  }
  return client
}
