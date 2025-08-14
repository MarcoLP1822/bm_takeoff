"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  ContentManager,
  ContentVariation
} from "@/components/content/content-manager"
import ContentCalendar from "@/components/content/content-calendar"
import SmartScheduler from "@/components/content/smart-scheduler"
import { GeneratedPost } from "@/components/content/content-editor"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, RefreshCw, CheckCircle, Sparkles, Calendar, List, Settings } from "lucide-react"
import { toast } from "sonner"
import { getPresetById } from "@/lib/content-presets"

export default function ContentPage() {
  const searchParams = useSearchParams()
  const [contentVariations, setContentVariations] = useState<
    ContentVariation[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("list")

  // Check for success messages from generation
  const isNewGeneration = searchParams.get('new') === 'true'
  const presetId = searchParams.get('preset')
  const isAdvanced = searchParams.get('advanced') === 'true'
  
  const preset = presetId ? getPresetById(presetId) : null

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

      const result = await response.json()

      if (result.success) {
        setContentVariations(prev =>
          prev.filter(variation => variation.id !== variationId)
        )
        toast.success("Content variation deleted successfully")
      } else {
        throw new Error(result.error || "Failed to delete variation")
      }
    } catch (error) {
      console.error("Error deleting variation:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to delete variation"
      )
    }
  }

  // Handle smart scheduling
  const handleSmartSchedule = async (config: object) => {
    try {
      toast.success("Programmazione avviata! I contenuti saranno pubblicati secondo il piano.")
      setActiveTab("calendar")
      
      // In una vera implementazione, qui chiameresti l'API per la programmazione
      // await fetch('/api/social/schedule', { method: 'POST', body: JSON.stringify(config) })
      
    } catch (error) {
      console.error("Error scheduling content:", error)
      toast.error("Errore nella programmazione dei contenuti")
    }
  }  // Handle refresh
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
      {/* Success Banner for New Generation */}
      {isNewGeneration && (
        <Alert className="border-green-200 bg-green-50 mb-6">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="flex items-center justify-between">
              <div>
                <strong>Contenuti generati con successo!</strong>
                {preset && (
                  <span className="ml-2">
                    Utilizzando il preset "{preset.name}"
                    <Badge className="ml-2 bg-green-100 text-green-800">
                      {preset.icon} {preset.name}
                    </Badge>
                  </span>
                )}
                {isAdvanced && (
                  <Badge className="ml-2 bg-blue-100 text-blue-800">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Configurazione avanzata
                  </Badge>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">
            Review, edit, and manage your generated social media content
          </p>
        </div>

        <div className="flex gap-2">
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
          <Button
            onClick={() => {
              window.location.href = `/dashboard/content/generate`
            }}
          >
            Generate New Content
          </Button>
        </div>
      </div>

      {contentVariations.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Start creating engaging social media content from your books. Upload and analyze a book, then use the Content Workshop to generate platform-specific posts.
          </p>
          <Button
            onClick={() => {
              window.location.href = `/dashboard/books`
            }}
          >
            Go to Books & Create Content
          </Button>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Gestione Contenuti
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendario Editoriale
            </TabsTrigger>
            <TabsTrigger value="scheduler" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Programmazione Smart
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="mt-6">
            <ContentManager
              contentVariations={contentVariations}
              onSaveContentAction={handleSaveContent}
              onDeleteVariationAction={handleDeleteVariation}
              onAutoSaveAction={handleAutoSave}
            />
          </TabsContent>
          
          <TabsContent value="calendar" className="mt-6">
            <ContentCalendar />
          </TabsContent>
          
          <TabsContent value="scheduler" className="mt-6">
            <SmartScheduler onSchedule={handleSmartSchedule} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
