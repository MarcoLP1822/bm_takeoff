/**
 * Centralized Data Access Layer
 * Phase 2.3: Centralizzazione Logica Dati
 * 
 * This module exports all centralized data access functions
 * for books and content with built-in authorization and security.
 */

// Book-related queries
export {
  validateBookAccess,
  findBookForUser,
  getUserBooks,
  getCurrentUserId,
  createBookForUser,
  updateBookForUser,
  deleteBookForUser,
  type BookWithContent,
  type BookFilters
} from "./book-queries"

// Content-related queries  
export {
  validateContentAccess,
  findContentForUser,
  getUserContent,
  getUserContentStats,
  createContentForBook,
  updateContentForUser,
  deleteContentForUser,
  getContentByBook,
  getScheduledContent,
  type ContentWithBook,
  type ContentFilters,
  type ContentStats
} from "./content-queries"

// Common utility functions
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export const sanitizeFilters = (filters: Record<string, unknown>): Record<string, unknown> => {
  const sanitized = { ...filters }
  
  // Remove undefined values
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key]
    }
  })
  
  // Ensure limit and offset are positive integers
  if ('limit' in sanitized && sanitized.limit !== undefined) {
    sanitized.limit = Math.max(1, Math.min(100, parseInt(String(sanitized.limit), 10) || 50))
  }
  
  if ('offset' in sanitized && sanitized.offset !== undefined) {
    sanitized.offset = Math.max(0, parseInt(String(sanitized.offset), 10) || 0)
  }
  
  return sanitized
}
