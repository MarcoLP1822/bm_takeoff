"use client"

import React, { useState, useEffect } from "react"
import {
  ContentManager,
  ContentVariation
} from "@/components/content/content-manager"
import { GeneratedPost } from "@/components/content/content-editor"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

export default function ContentPage() {
  const [contentVariations, setContentVariations] = useState<
    ContentVariation[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch content variations
  const fetchContentVariations = async () => {
    try {
      setError(null)
      const response = await fetch("/api/content/variations")

      if (!response.ok) {
        throw new Error("Failed to fetch content variations")
      }

      const result = await response.json()

      if (result.success) {
        setContentVariations(result.data.variations)
      } else {
        throw new Error(result.error || "Failed to fetch content")
      }
    } catch (error) {
      console.error("Error fetching content variations:", error)
      setError(
        error instanceof Error ? error.message : "Failed to fetch content"
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Handle content save
  const handleSaveContent = async (
    variationId: string,
    post: GeneratedPost
  ) => {
    try {
      const response = await fetch(`/api/content/variations/${variationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ post })
      })

      if (!response.ok) {
        throw new Error("Failed to save content")
      }

      const result = await response.json()

      if (result.success) {
        // Update local state
        setContentVariations(prev =>
          prev.map(variation => {
            if (variation.id === variationId) {
              return {
                ...variation,
                posts: variation.posts.map(p => (p.id === post.id ? post : p)),
                updatedAt: new Date().toISOString()
              }
            }
            return variation
          })
        )

        toast.success("Content saved successfully")
      } else {
        throw new Error(result.error || "Failed to save content")
      }
    } catch (error) {
      console.error("Error saving content:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to save content"
      )
      throw error
    }
  }

  // Handle auto-save
  const handleAutoSave = async (variationId: string, post: GeneratedPost) => {
    try {
      const response = await fetch("/api/content/auto-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ variationId, post })
      })

      const result = await response.json()

      if (result.success) {
        // Update local state silently
        setContentVariations(prev =>
          prev.map(variation => {
            if (variation.id === variationId) {
              return {
                ...variation,
                posts: variation.posts.map(p => (p.id === post.id ? post : p)),
                updatedAt: new Date().toISOString()
              }
            }
            return variation
          })
        )
      }
    } catch (error) {
      console.error("Auto-save error:", error)
      // Don't show error toast for auto-save failures
    }
  }

  // Handle variation deletion
  const handleDeleteVariation = async (variationId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this content variation? This action cannot be undone."
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/content/variations/${variationId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Failed to delete content variation")
      }

      const result = await response.json()

      if (result.success) {
        // Remove from local state
        setContentVariations(prev =>
          prev.filter(variation => variation.id !== variationId)
        )

        toast.success("Content variation deleted successfully")
      } else {
        throw new Error(result.error || "Failed to delete content variation")
      }
    } catch (error) {
      console.error("Error deleting content variation:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete content variation"
      )
    }
  }

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchContentVariations()
  }

  // Initial load
  useEffect(() => {
    fetchContentVariations()
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-80" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-6 rounded" />
                  <Skeleton className="h-6 w-6 rounded" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">
            Review, edit, and manage your generated social media content
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <ContentManager
        contentVariations={contentVariations}
        onSaveContentAction={handleSaveContent}
        onDeleteVariationAction={handleDeleteVariation}
        onAutoSaveAction={handleAutoSave}
      />
    </div>
  )
}
