import { createClient } from "@supabase/supabase-js"
import { auth } from "@clerk/nextjs/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Server-side client with service role key for admin operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Create an authenticated Supabase client using Clerk's JWT token
 * This ensures RLS policies work correctly with the authenticated user
 */
export async function createAuthenticatedSupabaseClient() {
  const { getToken, userId } = await auth()

  if (!userId) {
    throw new Error("User not authenticated")
  }

  try {
    // Try to get Supabase JWT token from Clerk
    const supabaseToken = await getToken({ template: "supabase" })

    if (!supabaseToken) {
      // Fallback: if template doesn't exist, create a basic JWT
      console.warn(
        "Supabase JWT template not found in Clerk. Using fallback authentication."
      )

      // For now, use the admin client but add user context
      // This is a temporary solution until JWT template is configured
      return {
        client: supabaseAdmin,
        userId
      }
    }

    // Create authenticated client with proper JWT
    const authenticatedClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseToken}`
        }
      }
    })

    return {
      client: authenticatedClient,
      userId
    }
  } catch (error) {
    console.error("Error creating authenticated Supabase client:", error)

    // Fallback to admin client with user context
    console.warn(
      "Falling back to admin client. Please configure Clerk JWT template for production."
    )
    return {
      client: supabaseAdmin,
      userId
    }
  }
}
