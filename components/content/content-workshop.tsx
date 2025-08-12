"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  RefreshCw,
  Sparkles,
  Quote,
  Lightbulb,
  Tag,
  Loader2,
  Copy,
  Check,
  Edit3
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ContentEditor, GeneratedPost, Platform } from "./content-editor"

// Platform configurations
const PLATFORM_CONFIGS = {
  twitter: {
    name: "Twitter/X",
    icon: Twitter,
    color: "bg-blue-500",
    textColor: "text-blue-700",
    hoverColor: "hover:bg-blue-50"
  },
  instagram: {
    name: "Instagram", 
    icon: Instagram,
    color: "bg-pink-500",
    textColor: "text-pink-700",
    hoverColor: "hover:bg-pink-50"
  },
  linkedin: {
    name: "LinkedIn",
    icon: Linkedin,
    color: "bg-blue-600",
    textColor: "text-blue-700",
    hoverColor: "hover:bg-blue-50"
  },
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "bg-blue-700",
    textColor: "text-blue-700",
    hoverColor: "hover:bg-blue-50"
  }
} as const

// Source type configurations
const SOURCE_TYPE_CONFIGS = {
  theme: {
    name: "Theme",
    icon: Tag,
    color: "bg-purple-500",
    description: "Generate content based on a book theme"
  },
  quote: {
    name: "Quote",
    icon: Quote,
    color: "bg-green-500", 
    description: "Generate content from a powerful quote"
  },
  insight: {
    name: "Insight",
    icon: Lightbulb,
    color: "bg-orange-500",
    description: "Generate content from a key insight"
  }
} as const

export interface ContentWorkshopProps {
  bookId: string
  bookTitle: string
  author?: string
  sourceType: 'theme' | 'quote' | 'insight'
  sourceContent: string
  onClose?: () => void
  className?: string
}

interface GeneratedVariation {
  id: string
  posts: GeneratedPost[]
  platform: Platform
  sourceType: 'theme' | 'quote' | 'insight'
  sourceContent: string
  variationGroupId: string
  generatedAt: string
}

interface WorkshopState {
  selectedPlatform: Platform
  variations: Record<Platform, GeneratedVariation[]>
  isGenerating: Record<Platform, boolean>
  hasGenerated: Record<Platform, boolean>
  successMessage: string | null
}

export function ContentWorkshop({
  bookId,
  bookTitle, 
  author,
  sourceType,
  sourceContent,
  onClose,
  className
}: ContentWorkshopProps) {
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)

  // Workshop state
  const [state, setState] = useState<WorkshopState>({
    selectedPlatform: 'twitter',
    variations: {
      twitter: [],
      instagram: [],
      linkedin: [],
      facebook: []
    },
    isGenerating: {
      twitter: false,
      instagram: false,
      linkedin: false,
      facebook: false
    },
    hasGenerated: {
      twitter: false,
      instagram: false,
      linkedin: false,
      facebook: false
    },
    successMessage: null
  })

  // Generate content for specific platform
  const generateContent = useCallback(async (platform: Platform, isRegeneration = false) => {
    setState(prev => ({
      ...prev,
      isGenerating: { ...prev.isGenerating, [platform]: true }
    }))

    try {
      const response = await fetch('/api/content/generate-targeted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          sourceType,
          sourceContent,
          platform,
          variationsCount: 3,
          tone: 'professional',
          includeImages: true,
          locale: 'en'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to generate content')
      }

      const result = await response.json()
      const { contentVariations, metadata } = result.data

      // Transform API response to component format
      const newVariations: GeneratedVariation[] = contentVariations.map((variation: { posts: GeneratedPost[] }, index: number) => ({
        id: `${metadata.variationGroupId}-${index}`,
        posts: variation.posts,
        platform,
        sourceType,
        sourceContent,
        variationGroupId: metadata.variationGroupId,
        generatedAt: metadata.generatedAt
      }))

      setState(prev => ({
        ...prev,
        variations: {
          ...prev.variations,
          [platform]: isRegeneration 
            ? [...prev.variations[platform], ...newVariations]
            : newVariations
        },
        hasGenerated: { ...prev.hasGenerated, [platform]: true },
        isGenerating: { ...prev.isGenerating, [platform]: false },
        successMessage: `✅ Generated and saved ${newVariations.length} ${PLATFORM_CONFIGS[platform].name} posts! Check Content Management to review.`
      }))

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, successMessage: null }))
      }, 5000)

    } catch (error) {
      setState(prev => ({
        ...prev,
        isGenerating: { ...prev.isGenerating, [platform]: false }
      }))

      console.error("❌ Generation Failed:", error instanceof Error ? error.message : "Unknown error occurred")
    }
  }, [bookId, sourceType, sourceContent])

  // Copy post content to clipboard
  const copyToClipboard = useCallback(async (post: GeneratedPost) => {
    try {
      const contentToCopy = `${post.content}\\n\\n${post.hashtags.join(' ')}`
      await navigator.clipboard.writeText(contentToCopy)
      setCopiedPostId(post.platform)
      
      console.log("📋 Content copied to clipboard")

      setTimeout(() => setCopiedPostId(null), 2000)
    } catch (error) {
      console.error("❌ Copy Failed: Could not copy to clipboard")
    }
  }, [])

  // Auto-generate content for selected platform on first load
  useEffect(() => {
    if (!state.hasGenerated[state.selectedPlatform] && !state.isGenerating[state.selectedPlatform]) {
      generateContent(state.selectedPlatform)
    }
  }, [state.selectedPlatform, state.hasGenerated, state.isGenerating, generateContent])

  const sourceConfig = SOURCE_TYPE_CONFIGS[sourceType]
  const SourceIcon = sourceConfig.icon

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-lg", sourceConfig.color)}>
              <SourceIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Content Workshop</h2>
              <p className="text-muted-foreground">{sourceConfig.description}</p>
            </div>
          </div>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close Workshop
            </Button>
          )}
        </div>

        {/* Source Content Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SourceIcon className="h-4 w-4" />
              <span>Source {sourceConfig.name}</span>
              <Badge variant="secondary">{bookTitle}</Badge>
              {author && <Badge variant="outline">by {author}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed bg-muted p-4 rounded-lg">
              "{sourceContent}"
            </p>
          </CardContent>
        </Card>

        {/* Success Message */}
        {state.successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-600" />
              <p className="text-green-800 font-medium">{state.successMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Platform Tabs */}
      <Tabs
        value={state.selectedPlatform}
        onValueChange={(value) => 
          setState(prev => ({ ...prev, selectedPlatform: value as Platform }))
        }
      >
        <TabsList className="grid w-full grid-cols-4">
          {Object.entries(PLATFORM_CONFIGS).map(([platform, config]) => {
            const Icon = config.icon
            const hasContent = state.variations[platform as Platform].length > 0
            const isGenerating = state.isGenerating[platform as Platform]
            
            return (
              <TabsTrigger 
                key={platform} 
                value={platform}
                className="flex items-center space-x-2"
              >
                <Icon className="h-4 w-4" />
                <span>{config.name}</span>
                {hasContent && (
                  <Badge variant="secondary" className="ml-1">
                    {state.variations[platform as Platform].length}
                  </Badge>
                )}
                {isGenerating && (
                  <Loader2 className="h-3 w-3 animate-spin ml-1" />
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* Platform Content */}
        {Object.entries(PLATFORM_CONFIGS).map(([platform, config]) => (
          <TabsContent key={platform} value={platform} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {config.name} Content Variations
              </h3>
              <div className="space-x-2">
                <Button
                  onClick={() => generateContent(platform as Platform)}
                  disabled={state.isGenerating[platform as Platform]}
                  size="sm"
                >
                  {state.isGenerating[platform as Platform] ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate New
                </Button>
                {state.variations[platform as Platform].length > 0 && (
                  <Button
                    onClick={() => generateContent(platform as Platform, true)}
                    disabled={state.isGenerating[platform as Platform]}
                    variant="outline"
                    size="sm"
                  >
                    {state.isGenerating[platform as Platform] ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Generate More
                  </Button>
                )}
              </div>
            </div>

            {/* Content Variations */}
            {state.isGenerating[platform as Platform] && state.variations[platform as Platform].length === 0 ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Generating content variations...
              </div>
            ) : state.variations[platform as Platform].length > 0 ? (
              <div className="grid gap-4">
                {state.variations[platform as Platform].map((variation) =>
                  variation.posts.map((post) => (
                    <Card key={`${variation.id}-${post.platform}`}>
                      <CardContent className="p-4 space-y-3">
                        {/* Post Content */}
                        <div className="space-y-2">
                          <p className="text-sm leading-relaxed">{post.content}</p>
                          {post.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {post.hashtags.map((hashtag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {hashtag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Post Actions */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{post.characterCount} characters</span>
                            {post.isValid ? (
                              <Badge variant="secondary" className="text-xs">Valid</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Too long
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(post)}
                            >
                              {copiedPostId === post.platform ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPostId(
                                editingPostId === `${variation.id}-${post.platform}` 
                                  ? null 
                                  : `${variation.id}-${post.platform}`
                              )}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Edit Mode - Simplified for now */}
                        {editingPostId === `${variation.id}-${post.platform}` && (
                          <div className="pt-3 border-t">
                            <p className="text-sm text-muted-foreground">
                              Advanced editing coming soon! For now, copy the content and edit in your preferred editor.
                            </p>
                            <Button
                              size="sm"
                              onClick={() => {
                                setEditingPostId(null)
                                console.log("ℹ️ Edit Mode Closed - Content editing will be enhanced in future updates")
                              }}
                            >
                              Close Edit
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No content generated yet for {config.name}</p>
                <p className="text-sm">Click "Generate New" to create content variations</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
