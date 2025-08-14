// Types and interfaces for content generation that can be safely imported on client side
export type Platform = "twitter" | "instagram" | "linkedin" | "facebook"

export interface GeneratedPost {
  id?: string // Optional for backward compatibility
  platform: Platform
  content: string
  hashtags: string[]
  themes?: string[] // Optional for backward compatibility
  engagement_potential?: number // Optional for backward compatibility
  character_count?: number // Optional for backward compatibility
  created_at?: string // Optional for backward compatibility
  image_suggestions?: ImageSuggestion[]
  imageUrl?: string
  characterCount: number  // Required for existing code
  isValid: boolean
  validationErrors: string[]
  engagementPotential?: number  // Optional for backward compatibility
}

export interface ImageSuggestion {
  type: "book_cover" | "quote" | "infographic" | "scene"
  description: string
  prompt: string
  priority: number
}

export interface ContentVariation {
  id: string
  platform?: Platform // Optional when it's a collection
  content?: string // Optional when it's a collection
  hashtags?: string[] // Optional when it's a collection
  themes?: string[] // Optional when it's a collection
  engagement_potential?: number // Optional when it's a collection
  character_count?: number // Optional when it's a collection
  image_suggestions?: ImageSuggestion[]
  posts?: GeneratedPost[]  // For collections of posts
  theme?: string // Legacy field
  sourceType?: "quote" | "insight" | "theme" | "summary" | "discussion"
  sourceContent?: string
}

export interface ContentGenerationOptions {
  platforms?: Platform[]
  variationsPerTheme?: number
  includeImages?: boolean
  tone?: "professional" | "casual" | "inspirational" | "educational"
  maxRetries?: number
  locale?: string
}

export interface GenerationProgress {
  currentStep: string
  totalSteps: number
  currentStepIndex: number
  details?: string
}

export interface ContentGenerationResult {
  success: boolean
  content?: ContentVariation[]
  error?: string
  progress?: GenerationProgress
}

// Platform-specific configuration
export const PLATFORM_CONFIGS = {
  twitter: {
    maxLength: 280,
    hashtagLimit: 5,
    imageSupported: true,
    name: "Twitter/X"
  },
  instagram: {
    maxLength: 2200,
    hashtagLimit: 30,
    imageSupported: true,
    name: "Instagram"
  },
  linkedin: {
    maxLength: 3000,
    hashtagLimit: 5,
    imageSupported: true,
    name: "LinkedIn"
  },
  facebook: {
    maxLength: 63206,
    hashtagLimit: 5,
    imageSupported: true,
    name: "Facebook"
  }
} as const
