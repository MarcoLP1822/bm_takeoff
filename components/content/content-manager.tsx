"use client"

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Filter,
  BookOpen,
  Calendar,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Star
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ContentEditor, GeneratedPost, Platform } from "./content-editor"
import { getEngagementExplanation } from "@/lib/content-optimization"
import {
  LazyLoadingList,
  ContentSkeleton
} from "@/components/utility/lazy-loading"

// Platform configurations
const PLATFORM_CONFIGS = {
  twitter: {
    name: "Twitter/X",
    icon: Twitter,
    color: "bg-blue-500"
  },
  instagram: {
    name: "Instagram",
    icon: Instagram,
    color: "bg-pink-500"
  },
  linkedin: {
    name: "LinkedIn",
    icon: Linkedin,
    color: "bg-blue-600"
  },
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "bg-blue-700"
  }
} as const

export interface ContentVariation {
  id: string
  posts: GeneratedPost[]
  theme: string
  sourceType: "quote" | "insight" | "theme" | "summary" | "discussion"
  sourceContent: string
  bookId: string
  bookTitle: string
  author?: string
  createdAt: string
  updatedAt: string
}

interface ContentManagerProps {
  contentVariations: ContentVariation[]
  onSaveContentAction: (
    variationId: string,
    post: GeneratedPost
  ) => Promise<void>
  onDeleteVariationAction: (variationId: string) => Promise<void>
  onAutoSaveAction?: (variationId: string, post: GeneratedPost) => Promise<void>
  className?: string
}

type FilterBy = "all" | "book" | "platform" | "theme" | "status"
type SortBy = "newest" | "oldest" | "book" | "theme"

// Helper function to render engagement stars
const renderEngagementStars = (score: number, explanation: string) => {
  return (
    <div className="flex items-center space-x-1" title={explanation}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= score
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {score}/5
      </span>
    </div>
  )
}

export function ContentManager({
  contentVariations,
  onSaveContentAction,
  onDeleteVariationAction,
  onAutoSaveAction,
  className
}: ContentManagerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBy, setFilterBy] = useState<FilterBy>("all")
  const [sortBy, setSortBy] = useState<SortBy>("newest")
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [selectedBooks, setSelectedBooks] = useState<string[]>([])
  const [expandedVariations, setExpandedVariations] = useState<Set<string>>(
    new Set()
  )
  const [editingPosts, setEditingPosts] = useState<Set<string>>(new Set())
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Extract unique books and platforms for filtering
  const uniqueBooks = useMemo(() => {
    const books = new Map<
      string,
      { id: string; title: string; author?: string }
    >()
    contentVariations.forEach(variation => {
      if (!books.has(variation.bookId)) {
        books.set(variation.bookId, {
          id: variation.bookId,
          title: variation.bookTitle,
          author: variation.author
        })
      }
    })
    return Array.from(books.values())
  }, [contentVariations])

  const allPlatforms: Platform[] = [
    "twitter",
    "instagram",
    "linkedin",
    "facebook"
  ]

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Filter and sort content variations
  const filteredAndSortedVariations = useMemo(() => {
    let filtered = contentVariations

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        variation =>
          variation.bookTitle.toLowerCase().includes(query) ||
          variation.author?.toLowerCase().includes(query) ||
          variation.theme.toLowerCase().includes(query) ||
          variation.sourceContent.toLowerCase().includes(query) ||
          variation.posts.some(post =>
            post.content.toLowerCase().includes(query)
          )
      )
    }

    // Apply platform filter
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter(variation =>
        variation.posts.some(post => selectedPlatforms.includes(post.platform))
      )
    }

    // Apply book filter
    if (selectedBooks.length > 0) {
      filtered = filtered.filter(variation =>
        selectedBooks.includes(variation.bookId)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
        case "oldest":
          return (
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          )
        case "book":
          return a.bookTitle.localeCompare(b.bookTitle)
        case "theme":
          return a.theme.localeCompare(b.theme)
        default:
          return 0
      }
    })

    return filtered
  }, [contentVariations, searchQuery, selectedPlatforms, selectedBooks, sortBy])

  const toggleVariationExpansion = (variationId: string) => {
    const newExpanded = new Set(expandedVariations)
    if (newExpanded.has(variationId)) {
      newExpanded.delete(variationId)
    } else {
      newExpanded.add(variationId)
    }
    setExpandedVariations(newExpanded)
  }

  const togglePostEditing = (postId: string) => {
    const newEditing = new Set(editingPosts)
    if (newEditing.has(postId)) {
      newEditing.delete(postId)
    } else {
      newEditing.add(postId)
    }
    setEditingPosts(newEditing)
  }

  const handleSaveContent = async (
    variationId: string,
    post: GeneratedPost
  ) => {
    await onSaveContentAction(variationId, post)
    setEditingPosts(prev => {
      const newSet = new Set(prev)
      newSet.delete(post.id)
      return newSet
    })
  }

  const togglePlatformFilter = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const toggleBookFilter = (bookId: string) => {
    setSelectedBooks(prev =>
      prev.includes(bookId)
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Manager</h2>
          <p className="text-muted-foreground">
            Review and edit your generated social media content
          </p>
        </div>
        <div className="text-muted-foreground text-sm">
          {filteredAndSortedVariations.length} of {contentVariations.length}{" "}
          variations
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            placeholder="Search content, books, themes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Platform Filters */}
          <div className="flex items-center gap-2">
            <Filter className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">Platforms:</span>
            {allPlatforms.map(platform => {
              const config = PLATFORM_CONFIGS[platform]
              const PlatformIcon = config.icon
              const isSelected = selectedPlatforms.includes(platform)

              return (
                <Button
                  key={platform}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePlatformFilter(platform)}
                  className="h-8"
                >
                  <PlatformIcon className="mr-1 h-3 w-3" />
                  {config.name}
                </Button>
              )
            })}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Book Filters */}
          <div className="flex items-center gap-2">
            <BookOpen className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">Books:</span>
            {uniqueBooks.slice(0, 3).map(book => {
              const isSelected = selectedBooks.includes(book.id)

              return (
                <Button
                  key={book.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleBookFilter(book.id)}
                  className="h-8"
                >
                  {book.title}
                </Button>
              )
            })}
            {uniqueBooks.length > 3 && (
              <span className="text-muted-foreground text-sm">
                +{uniqueBooks.length - 3} more
              </span>
            )}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="book">By Book</option>
              <option value="theme">By Theme</option>
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(selectedPlatforms.length > 0 ||
          selectedBooks.length > 0 ||
          searchQuery.trim()) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">
              Active filters:
            </span>

            {searchQuery.trim() && (
              <Badge variant="secondary" className="gap-1">
                Search: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery("")}
                  className="hover:bg-muted-foreground/20 ml-1 rounded"
                >
                  ×
                </button>
              </Badge>
            )}

            {selectedPlatforms.map(platform => (
              <Badge key={platform} variant="secondary" className="gap-1">
                {PLATFORM_CONFIGS[platform].name}
                <button
                  onClick={() => togglePlatformFilter(platform)}
                  className="hover:bg-muted-foreground/20 ml-1 rounded"
                >
                  ×
                </button>
              </Badge>
            ))}

            {selectedBooks.map(bookId => {
              const book = uniqueBooks.find(b => b.id === bookId)
              return book ? (
                <Badge key={bookId} variant="secondary" className="gap-1">
                  {book.title}
                  <button
                    onClick={() => toggleBookFilter(bookId)}
                    className="hover:bg-muted-foreground/20 ml-1 rounded"
                  >
                    ×
                  </button>
                </Badge>
              ) : null
            })}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setSelectedPlatforms([])
                setSelectedBooks([])
              }}
              className="h-6 px-2 text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Content Variations */}
      <div className="space-y-4">
        {filteredAndSortedVariations.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No content variations found matching your filters.</p>
            <p className="text-sm">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          filteredAndSortedVariations.map(variation => {
            const isExpanded = expandedVariations.has(variation.id)

            return (
              <div
                key={variation.id}
                className="overflow-hidden rounded-lg border"
              >
                {/* Variation Header */}
                <div className="bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{variation.theme}</h3>
                        <Badge variant="outline" className="text-xs">
                          {variation.sourceType}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4" />
                        <span>{variation.bookTitle}</span>
                        {variation.author && (
                          <>
                            <span>by</span>
                            <span>{variation.author}</span>
                          </>
                        )}
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {variation.sourceContent}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Platform indicators */}
                      <div className="flex gap-1">
                        {variation.posts.map(post => {
                          const config = PLATFORM_CONFIGS[post.platform]
                          const PlatformIcon = config.icon
                          return (
                            <div
                              key={post.id}
                              className={cn(
                                "rounded p-1 text-white",
                                config.color
                              )}
                              title={config.name}
                            >
                              <PlatformIcon className="h-3 w-3" />
                            </div>
                          )
                        })}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleVariationExpansion(variation.id)}
                      >
                        {isExpanded ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        {isExpanded ? "Collapse" : "Expand"}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteVariationAction(variation.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Posts */}
                {isExpanded && (
                  <div className="space-y-4 p-4">
                    {variation.posts.map(post => {
                      const isEditing = editingPosts.has(post.id)

                      return (
                        <div key={post.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "rounded p-1 text-white",
                                  PLATFORM_CONFIGS[post.platform].color
                                )}
                              >
                                {React.createElement(
                                  PLATFORM_CONFIGS[post.platform].icon,
                                  { className: "h-3 w-3" }
                                )}
                              </div>
                              <span className="text-sm font-medium">
                                {PLATFORM_CONFIGS[post.platform].name}
                              </span>
                              {!post.isValid && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Invalid
                                </Badge>
                              )}
                              {post.engagementPotential && (
                                <div className="flex items-center gap-2">
                                  {renderEngagementStars(
                                    post.engagementPotential,
                                    getEngagementExplanation(post)
                                  )}
                                  <Badge 
                                    variant={post.engagementPotential >= 4 ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {post.engagementPotential >= 4 ? "Alto potenziale" : 
                                     post.engagementPotential >= 3 ? "Potenziale medio" : "Da migliorare"}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePostEditing(post.id)}
                            >
                              <Edit3 className="h-4 w-4" />
                              {isEditing ? "Cancel" : "Edit"}
                            </Button>
                          </div>

                          {isEditing ? (
                            <ContentEditor
                              post={post}
                              onSaveAction={(updatedPost: GeneratedPost) =>
                                handleSaveContent(variation.id, updatedPost)
                              }
                              onAutoSaveAction={
                                onAutoSaveAction
                                  ? (updatedPost: GeneratedPost) =>
                                      onAutoSaveAction(
                                        variation.id,
                                        updatedPost
                                      )
                                  : undefined
                              }
                            />
                          ) : (
                            <div className="bg-background rounded border p-3">
                              <div className="mb-2 text-sm whitespace-pre-wrap">
                                {post.content}
                              </div>
                              {post.hashtags.length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-1">
                                  {post.hashtags.map((tag, index) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {tag.startsWith("#") ? tag : `#${tag}`}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <div className="text-muted-foreground text-xs">
                                {post.characterCount} characters
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Azioni di gruppo basate sui punteggi */}
      {filteredAndSortedVariations.length > 0 && (
        <div className="border-t pt-6 mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Azioni di Gruppo</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= 5 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <Badge variant="default" className="text-xs">
                    Alto Potenziale
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {filteredAndSortedVariations.filter(v => 
                    v.posts.some(p => p.engagementPotential && p.engagementPotential >= 4)
                  ).length} contenuti con punteggio 4-5 stelle
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Programma tutti gli high performer
                </Button>
              </div>

              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1, 2, 3].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= 3 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Potenziale Medio
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {filteredAndSortedVariations.filter(v => 
                    v.posts.some(p => p.engagementPotential && p.engagementPotential === 3)
                  ).length} contenuti con punteggio 3 stelle
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Migliora contenuti medi
                </Button>
              </div>

              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1, 2].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= 2 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    Da Migliorare
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {filteredAndSortedVariations.filter(v => 
                    v.posts.some(p => p.engagementPotential && p.engagementPotential <= 2)
                  ).length} contenuti con punteggio 1-2 stelle
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina contenuti poco performanti
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Crea piano editoriale smart
              </Button>
              <Button variant="outline" size="sm">
                <Edit3 className="h-4 w-4 mr-2" />
                Rigenera contenuti sotto soglia
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
