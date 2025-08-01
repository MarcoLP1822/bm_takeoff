"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Save,
  AlertTriangle,
  CheckCircle,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  Hash,
  Image as ImageIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

// Platform configurations
const PLATFORM_CONFIGS = {
  twitter: {
    maxLength: 280,
    hashtagLimit: 5,
    name: "Twitter/X",
    icon: Twitter,
    color: "bg-blue-500"
  },
  instagram: {
    maxLength: 2200,
    hashtagLimit: 30,
    name: "Instagram",
    icon: Instagram,
    color: "bg-pink-500"
  },
  linkedin: {
    maxLength: 3000,
    hashtagLimit: 10,
    name: "LinkedIn",
    icon: Linkedin,
    color: "bg-blue-600"
  },
  facebook: {
    maxLength: 63206,
    hashtagLimit: 10,
    name: "Facebook",
    icon: Facebook,
    color: "bg-blue-700"
  }
} as const

export type Platform = keyof typeof PLATFORM_CONFIGS

export interface GeneratedPost {
  id: string
  platform: Platform
  content: string
  hashtags: string[]
  imageUrl?: string
  characterCount: number
  isValid: boolean
  validationErrors: string[]
}

interface ContentEditorProps {
  post: GeneratedPost
  onSaveAction: (updatedPost: GeneratedPost) => void
  onAutoSaveAction?: (updatedPost: GeneratedPost) => void
  autoSaveDelay?: number
  className?: string
}

export function ContentEditor({
  post,
  onSaveAction,
  onAutoSaveAction,
  autoSaveDelay = 2000,
  className
}: ContentEditorProps) {
  const [content, setContent] = useState(post.content)
  const [hashtags, setHashtags] = useState(post.hashtags.join(" "))
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const config = PLATFORM_CONFIGS[post.platform]
  const PlatformIcon = config.icon

  // Calculate character count and validation
  const characterCount = content.length
  const hashtagArray = hashtags.split(" ").filter(tag => tag.trim().length > 0)
  const isOverLimit = characterCount > config.maxLength
  const hasExcessHashtags = hashtagArray.length > config.hashtagLimit
  const isValid = !isOverLimit && !hasExcessHashtags

  const validationErrors = useMemo(() => {
    const errors: string[] = []
    if (isOverLimit) {
      errors.push(
        `Content exceeds ${config.maxLength} character limit by ${characterCount - config.maxLength} characters`
      )
    }
    if (hasExcessHashtags) {
      errors.push(
        `Too many hashtags (${hashtagArray.length}/${config.hashtagLimit})`
      )
    }
    return errors
  }, [
    isOverLimit,
    hasExcessHashtags,
    config.maxLength,
    characterCount,
    hashtagArray.length,
    config.hashtagLimit
  ])

  // Auto-save functionality with debouncing
  useEffect(() => {
    if (!hasChanges) return

    const timeoutId = setTimeout(() => {
      const updatedPost: GeneratedPost = {
        ...post,
        content,
        hashtags: hashtagArray,
        characterCount,
        isValid,
        validationErrors
      }

      if (onAutoSaveAction) {
        onAutoSaveAction(updatedPost)
        setLastSaved(new Date())
      }
    }, autoSaveDelay)

    return () => clearTimeout(timeoutId)
  }, [
    content,
    hashtags,
    hasChanges,
    onAutoSaveAction,
    autoSaveDelay,
    post,
    hashtagArray,
    characterCount,
    isValid,
    validationErrors
  ])

  // Update post data when content or hashtags change
  useEffect(() => {
    if (content !== post.content || hashtags !== post.hashtags.join(" ")) {
      setHasChanges(true)
    }
  }, [content, hashtags, post.content, post.hashtags])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updatedPost: GeneratedPost = {
        ...post,
        content,
        hashtags: hashtagArray,
        characterCount,
        isValid,
        validationErrors
      }

      await onSaveAction(updatedPost)
      setHasChanges(false)
      setLastSaved(new Date())
    } catch (error) {
      console.error("Failed to save content:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={cn("space-y-4 rounded-lg border p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("rounded p-1.5 text-white", config.color)}>
            <PlatformIcon className="h-4 w-4" />
          </div>
          <h3 className="font-medium">{config.name}</h3>
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-muted-foreground text-xs">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            size="sm"
            variant={hasChanges ? "default" : "outline"}
          >
            <Save className="mr-1 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Content Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Content</label>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-mono text-xs",
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {characterCount}/{config.maxLength}
            </span>
            {isValid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="text-destructive h-4 w-4" />
            )}
          </div>
        </div>

        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={`Write your ${config.name} post...`}
          className={cn(
            "min-h-32 resize-none",
            isOverLimit && "border-destructive focus-visible:border-destructive"
          )}
        />
      </div>

      {/* Hashtags Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1 text-sm font-medium">
            <Hash className="h-4 w-4" />
            Hashtags
          </label>
          <span
            className={cn(
              "font-mono text-xs",
              hasExcessHashtags ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {hashtagArray.length}/{config.hashtagLimit}
          </span>
        </div>

        <Textarea
          value={hashtags}
          onChange={e => setHashtags(e.target.value)}
          placeholder="Enter hashtags separated by spaces..."
          className={cn(
            "min-h-20 resize-none",
            hasExcessHashtags &&
              "border-destructive focus-visible:border-destructive"
          )}
        />

        {hashtagArray.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hashtagArray.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag.startsWith("#") ? tag : `#${tag}`}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Image URL */}
      {post.imageUrl && (
        <div className="space-y-2">
          <label className="flex items-center gap-1 text-sm font-medium">
            <ImageIcon className="h-4 w-4" />
            Suggested Image
          </label>
          <div className="text-muted-foreground bg-muted rounded p-2 font-mono text-xs">
            {post.imageUrl}
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-inside list-disc space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">
                  {error}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Platform Preview */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Preview</label>
        <div className="bg-muted/30 rounded-lg border p-3">
          <PlatformPreview
            platform={post.platform}
            content={content}
            hashtags={hashtagArray}
            imageUrl={post.imageUrl}
          />
        </div>
      </div>
    </div>
  )
}

// Platform-specific preview component
function PlatformPreview({
  platform,
  content,
  hashtags,
  imageUrl
}: {
  platform: Platform
  content: string
  hashtags: string[]
  imageUrl?: string
}) {
  const config = PLATFORM_CONFIGS[platform]

  switch (platform) {
    case "twitter":
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-300" />
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold">Your Name</span>
                <span className="text-muted-foreground text-sm">@username</span>
                <span className="text-muted-foreground text-sm">·</span>
                <span className="text-muted-foreground text-sm">now</span>
              </div>
              <div className="text-sm whitespace-pre-wrap">{content}</div>
              {hashtags.length > 0 && (
                <div className="mt-1 text-sm text-blue-500">
                  {hashtags
                    .map(tag => (tag.startsWith("#") ? tag : `#${tag}`))
                    .join(" ")}
                </div>
              )}
            </div>
          </div>
        </div>
      )

    case "instagram":
      return (
        <div className="space-y-2">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gray-300" />
            <span className="text-sm font-semibold">your_username</span>
          </div>
          {imageUrl && (
            <div className="text-muted-foreground flex h-32 w-full items-center justify-center rounded bg-gray-200 text-sm">
              Image Preview
            </div>
          )}
          <div className="text-sm">
            <span className="font-semibold">your_username</span>{" "}
            <span className="whitespace-pre-wrap">{content}</span>
            {hashtags.length > 0 && (
              <div className="mt-1 text-blue-600">
                {hashtags
                  .map(tag => (tag.startsWith("#") ? tag : `#${tag}`))
                  .join(" ")}
              </div>
            )}
          </div>
        </div>
      )

    case "linkedin":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-300" />
            <div>
              <div className="text-sm font-semibold">Your Name</div>
              <div className="text-muted-foreground text-xs">Your Title</div>
            </div>
          </div>
          <div className="text-sm whitespace-pre-wrap">{content}</div>
          {hashtags.length > 0 && (
            <div className="text-sm text-blue-600">
              {hashtags
                .map(tag => (tag.startsWith("#") ? tag : `#${tag}`))
                .join(" ")}
            </div>
          )}
        </div>
      )

    case "facebook":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-300" />
            <div>
              <div className="text-sm font-semibold">Your Name</div>
              <div className="text-muted-foreground text-xs">Just now</div>
            </div>
          </div>
          <div className="text-sm whitespace-pre-wrap">{content}</div>
          {hashtags.length > 0 && (
            <div className="text-sm text-blue-600">
              {hashtags
                .map(tag => (tag.startsWith("#") ? tag : `#${tag}`))
                .join(" ")}
            </div>
          )}
        </div>
      )

    default:
      return <div className="text-sm whitespace-pre-wrap">{content}</div>
  }
}

// Debounce utility function
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}
