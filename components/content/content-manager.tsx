"use client"

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
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
  Star,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ContentEditor, GeneratedPost } from "./content-editor"
import { Platform } from "@/lib/content-types"
import { getEngagementExplanation } from "@/lib/content-optimization"
import { toast } from "sonner"
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

// Helper function to render engagement stars with improved styling
const renderEngagementStars = (score: number, explanation: string) => {
  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600"
    if (score >= 3) return "text-yellow-600" 
    return "text-red-600"
  }

  const getScoreBadge = (score: number) => {
    if (score >= 4) return { variant: "default" as const, text: "High", bg: "bg-green-100 text-green-800 border-green-200" }
    if (score >= 3) return { variant: "secondary" as const, text: "Medium", bg: "bg-yellow-100 text-yellow-800 border-yellow-200" }
    return { variant: "destructive" as const, text: "Low", bg: "bg-red-100 text-red-800 border-red-200" }
  }

  const scoreBadge = getScoreBadge(score)

  return (
    <div className="flex items-center gap-3" title={explanation}>
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "h-4 w-4 transition-colors",
                star <= score
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/30"
              )}
            />
          ))}
        </div>
        <span className={cn("text-sm font-medium", getScoreColor(score))}>
          {score}/5
        </span>
      </div>
      <Badge className={scoreBadge.bg}>
        {scoreBadge.text} Potential
      </Badge>
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
  const [selectedVariations, setSelectedVariations] = useState<Set<string>>(new Set())
  const [bulkActionMode, setBulkActionMode] = useState(false)
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
      
      // Bulk selection shortcuts (only when in bulk mode)
      if (bulkActionMode) {
        if ((e.ctrlKey || e.metaKey) && e.key === "a") {
          e.preventDefault()
          const allIds = new Set(filteredAndSortedVariations.map(v => v.id))
          setSelectedVariations(allIds)
        }
        
        if (e.key === "Escape") {
          e.preventDefault()
          setSelectedVariations(new Set())
          setBulkActionMode(false)
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault()
        setBulkActionMode(prev => {
          if (prev) {
            setSelectedVariations(new Set())
          }
          return !prev
        })
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Bulk selection functions
  const toggleVariationSelection = (variationId: string) => {
    const newSelected = new Set(selectedVariations)
    if (newSelected.has(variationId)) {
      newSelected.delete(variationId)
    } else {
      newSelected.add(variationId)
    }
    setSelectedVariations(newSelected)
  }

  const selectAllVariations = useCallback(() => {
    const allIds = new Set(filteredAndSortedVariations.map(v => v.id))
    setSelectedVariations(allIds)
  }, [filteredAndSortedVariations])

  const clearSelection = useCallback(() => {
    setSelectedVariations(new Set())
    setBulkActionMode(false)
  }, [])

  const toggleBulkMode = useCallback(() => {
    setBulkActionMode(!bulkActionMode)
    if (!bulkActionMode) {
      setSelectedVariations(new Set())
    }
  }, [bulkActionMode])

  // Bulk action implementations
  const handleScheduleSelected = () => {
    if (selectedVariations.size === 0) return;
    
    // Get selected variation objects
    const selectedVariationObjects = contentVariations.filter(variation => 
      selectedVariations.has(variation.id)
    );
    
    // TODO: Integrate with scheduling service
    console.log('Scheduling variations:', selectedVariationObjects);
    toast.success(`Scheduled ${selectedVariations.size} content variations for publishing`);
    
    // Clear selection after action
    clearSelection();
  };

  const handleBulkEdit = () => {
    if (selectedVariations.size === 0) return;
    
    // Get selected variation objects
    const selectedVariationObjects = contentVariations.filter(variation => 
      selectedVariations.has(variation.id)
    );
    
    // TODO: Open bulk edit modal or navigate to bulk edit page
    console.log('Bulk editing variations:', selectedVariationObjects);
    toast.info(`Opening bulk editor for ${selectedVariations.size} content variations`);
  };

  const handleDeleteSelected = () => {
    if (selectedVariations.size === 0) return;
    
    // TODO: Show confirmation dialog before deletion
    if (confirm(`Are you sure you want to delete ${selectedVariations.size} content variations? This action cannot be undone.`)) {
      // TODO: Integrate with deletion service
      console.log('Deleting variations:', Array.from(selectedVariations));
      toast.success(`Deleted ${selectedVariations.size} content variations`);
      
      // Clear selection after action
      clearSelection();
    }
  };

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
    <div className={cn("space-y-8", className)}>
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-brand-primary-foreground">
                <Edit3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Content Manager</h1>
                <p className="text-muted-foreground text-lg">
                  Review and edit your generated social media content
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold">
                {filteredAndSortedVariations.length}
              </div>
              <p className="text-muted-foreground text-sm">
                of {contentVariations.length} variations
              </p>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">High Performance</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {filteredAndSortedVariations.filter(v => 
                v.posts.some(p => p.engagementPotential && p.engagementPotential >= 4)
              ).length}
            </div>
            <p className="text-muted-foreground text-xs">4+ star content</p>
          </div>
          
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span className="text-sm font-medium">Needs Review</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {filteredAndSortedVariations.filter(v => 
                v.posts.some(p => p.engagementPotential && p.engagementPotential <= 2)
              ).length}
            </div>
            <p className="text-muted-foreground text-xs">Below 3 stars</p>
          </div>
          
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium">Platforms</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {allPlatforms.length}
            </div>
            <p className="text-muted-foreground text-xs">Active platforms</p>
          </div>
          
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span className="text-sm font-medium">Books</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {uniqueBooks.length}
            </div>
            <p className="text-muted-foreground text-xs">Source books</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-6">
        {/* Enhanced Search Bar */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            placeholder="Search content, books, themes, or hashtags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 h-12 text-base"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            >
              ×
            </Button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Quick filters:</span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedPlatforms.length === 0 && selectedBooks.length === 0 ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedPlatforms([])
                setSelectedBooks([])
              }}
              className="h-8"
            >
              All Content
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Filter for high engagement content
                const highEngagementFilter = filteredAndSortedVariations.filter(v => 
                  v.posts.some(p => p.engagementPotential && p.engagementPotential >= 4)
                )
                // This is just visual feedback - the actual filtering happens in useMemo
              }}
              className="h-8 border-green-200 text-green-700 hover:bg-green-50"
            >
              ⭐ High Performers
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-yellow-200 text-yellow-700 hover:bg-yellow-50"
            >
              📝 Needs Review
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              📅 Recent
            </Button>
          </div>
        </div>

        {/* Advanced Filters Card */}
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Platform Filters */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Filter className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">Platforms</span>
                  {selectedPlatforms.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedPlatforms.length} selected
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {allPlatforms.map(platform => {
                    const config = PLATFORM_CONFIGS[platform]
                    const PlatformIcon = config.icon
                    const isSelected = selectedPlatforms.includes(platform)
                    const platformCount = contentVariations.filter(v => 
                      v.posts.some(p => p.platform === platform)
                    ).length

                    return (
                      <Button
                        key={platform}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => togglePlatformFilter(platform)}
                        className="h-9 text-xs"
                      >
                        <PlatformIcon className="mr-2 h-3 w-3" />
                        {config.name}
                        <Badge variant="secondary" className="ml-2 text-xs bg-muted">
                          {platformCount}
                        </Badge>
                      </Button>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Book Filters */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">Source Books</span>
                  {selectedBooks.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedBooks.length} selected
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {uniqueBooks.map(book => {
                    const isSelected = selectedBooks.includes(book.id)
                    const bookContentCount = contentVariations.filter(v => v.bookId === book.id).length

                    return (
                      <Button
                        key={book.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleBookFilter(book.id)}
                        className="h-9 text-xs max-w-xs"
                      >
                        <span className="truncate">{book.title}</span>
                        <Badge variant="secondary" className="ml-2 text-xs bg-muted">
                          {bookContentCount}
                        </Badge>
                      </Button>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Sort Options */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">Sort by</span>
                </div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortBy)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="book">By Book</option>
                  <option value="theme">By Theme</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={bulkActionMode ? "default" : "outline"}
              size="sm"
              onClick={toggleBulkMode}
            >
              {bulkActionMode ? "Exit Selection" : "Select Multiple"}
            </Button>
            
            {bulkActionMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllVariations}
                  disabled={filteredAndSortedVariations.length === 0}
                >
                  Select All ({filteredAndSortedVariations.length})
                </Button>
                
                {selectedVariations.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Clear ({selectedVariations.size})
                  </Button>
                )}
              </>
            )}
          </div>
          
          {selectedVariations.size > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedVariations.size} item{selectedVariations.size !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedVariations.size > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleScheduleSelected}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Selected
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkEdit}>
              <Edit3 className="h-4 w-4 mr-2" />
              Bulk Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
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
                className={cn(
                  "content-manager-card group overflow-hidden rounded-lg border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80",
                  variation.posts.some(p => p.engagementPotential && p.engagementPotential >= 4) && "high-performance-card"
                )}
              >
                {/* Variation Header */}
                <div className="border-b bg-muted/30 p-6">
                  <div className="flex items-start justify-between">
                    {/* Left side with optional checkbox */}
                    <div className="flex items-start gap-4 flex-1">
                      {bulkActionMode && (
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={selectedVariations.has(variation.id)}
                            onChange={() => toggleVariationSelection(variation.id)}
                            className="w-4 h-4 rounded border-border focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold leading-none">{variation.theme}</h3>
                          <Badge variant="secondary" className="font-medium">
                            {variation.sourceType}
                          </Badge>
                          {/* Overall performance indicator */}
                          {variation.posts.some(p => p.engagementPotential && p.engagementPotential >= 4) && (
                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                              ⭐ High Performer
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-muted-foreground text-sm">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span className="font-medium">{variation.bookTitle}</span>
                          </div>
                          {variation.author && (
                            <>
                              <span>•</span>
                              <span>by {variation.author}</span>
                            </>
                          )}
                        </div>
                        
                        <p className="text-muted-foreground text-sm line-clamp-2 max-w-2xl">
                          {variation.sourceContent}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                      {/* Enhanced Platform indicators */}
                      <div className="flex gap-2">
                        {variation.posts.map(post => {
                          const config = PLATFORM_CONFIGS[post.platform]
                          const PlatformIcon = config.icon
                          const hasHighEngagement = post.engagementPotential && post.engagementPotential >= 4
                          
                          return (
                            <div
                              key={post.id}
                              className={cn(
                                "platform-indicator-hover relative flex items-center justify-center w-8 h-8 rounded-md text-white transition-transform group-hover:scale-110",
                                config.color,
                                hasHighEngagement && "ring-2 ring-yellow-400 ring-offset-1"
                              )}
                              title={`${config.name}${hasHighEngagement ? ' - High engagement potential' : ''}`}
                            >
                              <PlatformIcon className="h-4 w-4" />
                              {hasHighEngagement && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                                  <Star className="h-2 w-2 text-yellow-800 fill-current" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      <Separator orientation="vertical" className="h-8" />

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleVariationExpansion(variation.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Collapse
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </>
                        )}
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
                  <div className="space-y-6 p-6 bg-muted/20">
                    {variation.posts.map(post => {
                      const isEditing = editingPosts.has(post.id)
                      const config = PLATFORM_CONFIGS[post.platform]

                      return (
                        <div key={post.id} className="rounded-lg border bg-card p-4 shadow-sm">
                          {/* Post Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex items-center justify-center w-8 h-8 rounded-md text-white",
                                  config.color
                                )}
                              >
                                {React.createElement(config.icon, { className: "h-4 w-4" })}
                              </div>
                              <div>
                                <span className="font-medium">{config.name}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  {!post.isValid && (
                                    <Badge variant="destructive" className="text-xs">
                                      ⚠️ Invalid
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {post.characterCount} chars
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {post.engagementPotential && (
                                <div className="text-right">
                                  {renderEngagementStars(
                                    post.engagementPotential,
                                    getEngagementExplanation(post)
                                  )}
                                </div>
                              )}
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => togglePostEditing(post.id)}
                                className="shrink-0"
                              >
                                <Edit3 className="h-4 w-4 mr-2" />
                                {isEditing ? "Cancel" : "Edit"}
                              </Button>
                            </div>
                          </div>

                          {/* Post Content */}
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
                            <div className="rounded-lg border bg-muted/30 p-4">
                              <div className="mb-3 text-sm whitespace-pre-wrap leading-relaxed">
                                {post.content}
                              </div>
                              {post.hashtags.length > 0 && (
                                <div className="mb-3 flex flex-wrap gap-2">
                                  {post.hashtags.map((tag, index) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="text-xs font-medium"
                                    >
                                      {tag.startsWith("#") ? tag : `#${tag}`}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{post.characterCount} characters</span>
                                {post.isValid ? (
                                  <Badge variant="outline" className="text-green-600 border-green-200">
                                    ✓ Valid
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    Needs review
                                  </Badge>
                                )}
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
