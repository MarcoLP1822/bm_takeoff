import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import createIntlMiddleware from 'next-intl/middleware'
import { NextRequest } from "next/server"
import { locales, defaultLocale } from './i18n'

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/(it|en)/dashboard(.*)"]) 

// Create the intl middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always' // Always use locale prefix for clarity
})

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId } = await auth()

  // Skip internationalization for API routes
  if (req.nextUrl.pathname.startsWith('/api')) {
    // Only apply Clerk auth for protected API routes
    if (isProtectedRoute(req) && !userId) {
      return new Response('Unauthorized', { status: 401 })
    }
    return
  }

  // Handle internationalization for non-API routes
  const intlResponse = intlMiddleware(req)
  
  // Check if the route is protected and user is not authenticated
  if (!userId && isProtectedRoute(req)) {
    return intlResponse // Let intl middleware handle the redirect with proper locale
  }

  return intlResponse
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)"
  ]
}
