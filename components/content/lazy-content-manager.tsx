"use client"

import React, { useState, useCallback } from "react"
import { ContentManager, ContentVariation } from "./content-manager"
import { GeneratedPost, Platform } from "./content-editor"
import {
  LazyLoadingList,
  ContentSkeleton
} from "@/components/utility/lazy-loading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, Search } from "lucide-react"

interface ContentItem {
  id: string
  bookId: string
  bookTitle: string
  bookAuthor?: string
  bookGenre?: string
  platform: Platform
  content: string
  hashtags?: string[]
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

interface LazyContentManagerProps {
  onSaveContentAction?: (
    variationId: string,
    post: GeneratedPost
  ) => Promise<void>
  onDeleteVariationAction?: (variationId: string) => Promise<void>
  onAutoSaveAction?: (variationId: string, post: GeneratedPost) => Promise<void>
  className?: string
}

export function LazyContentManager({
  onSaveContentAction,
  onDeleteVariationAction,
  onAutoSaveAction,
  className
}: LazyContentManagerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [selectedBook, setSelectedBook] = useState<string>("")

  // Load content data function for lazy loading
  const loadContent = useCallback(
    async (offset: number, limit: number) => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        sortBy: "createdAt",
        sortOrder: "desc"
      })

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim())
      }

      if (selectedPlatform) {
        params.append("platform", selectedPlatform)
      }

      if (selectedStatus) {
        params.append("status", selectedStatus)
      }

      if (selectedBook) {
        params.append("bookId", selectedBook)
      }

      const response = await fetch(`/api/content?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch content")
      }

      const data = await response.json()

      return {
        items: data.data?.content || [],
        hasMore: data.data?.pagination?.hasMore || false,
        total: data.data?.pagination?.total || 0
      }
    },
    [searchQuery, selectedPlatform, selectedStatus, selectedBook]
  )

  // Render individual content item
  const renderContentItem = useCallback(
    (content: ContentItem) => {
      // Transform API content to ContentVariation format
      const variation: ContentVariation = {
        id: content.id,
        bookId: content.bookId,
        bookTitle: content.bookTitle,
        author: content.bookAuthor,
        sourceType: "quote", // Default, could be enhanced
        sourceContent: content.content.substring(0, 100) + "...", // Truncated for display
        theme: content.bookGenre || "General",
        posts: [
          {
            id: content.id,
            platform: content.platform,
            content: content.content,
            hashtags: content.hashtags || [],
            imageUrl: content.imageUrl,
            characterCount: content.content.length,
            isValid:
              content.content.length <= getPlatformMaxLength(content.platform),
            validationErrors: []
          }
        ],
        createdAt: content.createdAt,
        updatedAt: content.updatedAt
      }

      return (
        <div
          key={content.id}
          className="rounded-lg border p-4 transition-shadow hover:shadow-md"
        >
          <ContentManager
            contentVariations={[variation]}
            onSaveContentAction={
              onSaveContentAction || (() => Promise.resolve())
            }
            onDeleteVariationAction={
              onDeleteVariationAction || (() => Promise.resolve())
            }
            onAutoSaveAction={onAutoSaveAction}
            className="border-none p-0 shadow-none"
          />
        </div>
      )
    },
    [onSaveContentAction, onDeleteVariationAction, onAutoSaveAction]
  )

  return (
    <div className={className}>
      {/* Search and Filter Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={selectedPlatform}
            onChange={e => setSelectedPlatform(e.target.value)}
            className="rounded-md border px-3 py-2"
          >
            <option value="">All Platforms</option>
            <option value="twitter">Twitter/X</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="facebook">Facebook</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="rounded-md border px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {/* Lazy Loading Content List */}
      <LazyLoadingList
        loadDataAction={loadContent}
        renderItemAction={renderContentItem}
        renderSkeleton={() => <ContentSkeleton />}
        renderEmpty={() => (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              No content found
            </h3>
            <p className="text-gray-500">
              Generate some content from your books to get started
            </p>
          </div>
        )}
        renderError={(error, retry) => (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              Failed to load content
            </h3>
            <p className="mb-4 text-gray-500">{error.message}</p>
            <Button onClick={retry}>Try Again</Button>
          </div>
        )}
        itemsPerPage={10}
        className="space-y-4"
        dependencies={[
          searchQuery,
          selectedPlatform,
          selectedStatus,
          selectedBook
        ]}
      />
    </div>
  )
}

// Helper function to get platform max length
function getPlatformMaxLength(platform: Platform): number {
  const limits: Record<Platform, number> = {
    twitter: 280,
    instagram: 2200,
    linkedin: 3000,
    facebook: 63206
  }
  return limits[platform] || 280
}
