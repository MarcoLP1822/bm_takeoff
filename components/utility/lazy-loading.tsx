"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Loader2 } from "lucide-react"

interface LazyLoadingProps<T> {
  loadDataAction: (
    offset: number,
    limit: number
  ) => Promise<{
    items: T[]
    hasMore: boolean
    total?: number
  }>
  renderItemAction: (item: T, index: number) => React.ReactNode
  renderSkeleton?: () => React.ReactNode
  renderEmpty?: () => React.ReactNode
  renderError?: (error: Error, retry: () => void) => React.ReactNode
  itemsPerPage?: number
  threshold?: number
  className?: string
  containerClassName?: string
  dependencies?: unknown[]
}

export function LazyLoadingList<T>({
  loadDataAction,
  renderItemAction,
  renderSkeleton,
  renderEmpty,
  renderError,
  itemsPerPage = 20,
  threshold = 200,
  className = "",
  containerClassName = "",
  dependencies = []
}: LazyLoadingProps<T>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [total, setTotal] = useState<number | undefined>()

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const isLoadingRef = useRef(false)

  const loadItems = useCallback(
    async (reset = false) => {
      if (isLoadingRef.current) return

      isLoadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        const offset = reset ? 0 : offsetRef.current
        const result = await loadDataAction(offset, itemsPerPage)

        if (reset) {
          setItems(result.items)
          offsetRef.current = result.items.length
        } else {
          setItems(prev => [...prev, ...result.items])
          offsetRef.current += result.items.length
        }

        setHasMore(result.hasMore)
        setTotal(result.total)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load data"))
      } finally {
        isLoadingRef.current = false
        setLoading(false)
        setInitialLoading(false)
      }
    },
    [loadDataAction, itemsPerPage]
  )

  const resetAndReload = useCallback(() => {
    setItems([])
    setHasMore(true)
    setError(null)
    setInitialLoading(true)
    offsetRef.current = 0
    loadItems(true)
  }, [loadItems])

  // Initial load and dependency changes
  useEffect(() => {
    resetAndReload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetAndReload, ...dependencies])

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!hasMore || loading) return

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadItems()
        }
      },
      { rootMargin: `${threshold}px` }
    )

    const currentRef = loadingRef.current
    if (currentRef) {
      observerRef.current.observe(currentRef)
    }

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef)
      }
    }
  }, [hasMore, loading, loadItems, threshold])

  // Cleanup observer
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  if (initialLoading) {
    return (
      <div className={containerClassName}>
        {renderSkeleton ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>{renderSkeleton()}</div>
          ))
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        )}
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className={containerClassName}>
        {renderError ? (
          renderError(error, resetAndReload)
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="mb-4 text-red-600">
              Failed to load data: {error.message}
            </p>
            <button
              onClick={resetAndReload}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={containerClassName}>
        {renderEmpty ? (
          renderEmpty()
        ) : (
          <div className="flex items-center justify-center py-8 text-gray-500">
            No items found
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={containerClassName}>
      <div className={className}>
        {items.map((item, index) => (
          <div key={index}>{renderItemAction(item, index)}</div>
        ))}
      </div>

      {hasMore && (
        <div ref={loadingRef} className="flex items-center justify-center py-4">
          {loading && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2 text-sm text-gray-600">
                Loading more...
              </span>
            </>
          )}
        </div>
      )}

      {total !== undefined && (
        <div className="py-2 text-center text-sm text-gray-500">
          Showing {items.length} of {total} items
        </div>
      )}
    </div>
  )
}

// Skeleton components for common use cases
export function BookSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="rounded-lg bg-gray-200 p-4">
        <div className="mb-2 h-4 w-3/4 rounded bg-gray-300"></div>
        <div className="mb-2 h-3 w-1/2 rounded bg-gray-300"></div>
        <div className="h-3 w-1/4 rounded bg-gray-300"></div>
      </div>
    </div>
  )
}

export function ContentSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="rounded-lg bg-gray-200 p-4">
        <div className="mb-2 flex items-center">
          <div className="mr-2 h-3 w-16 rounded bg-gray-300"></div>
          <div className="h-3 w-20 rounded bg-gray-300"></div>
        </div>
        <div className="mb-2 h-4 w-full rounded bg-gray-300"></div>
        <div className="h-4 w-2/3 rounded bg-gray-300"></div>
      </div>
    </div>
  )
}

// Virtual scrolling for very large lists
interface VirtualScrollProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItemAction: (item: T, index: number) => React.ReactNode
  overscan?: number
}

export function VirtualScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItemAction,
  overscan = 5
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex + 1)
  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  return (
    <div
      style={{ height: containerHeight, overflow: "auto" }}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItemAction(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Hook for managing lazy loading state
export function useLazyLoading<T>(
  loadData: (
    offset: number,
    limit: number
  ) => Promise<{
    items: T[]
    hasMore: boolean
    total?: number
  }>,
  itemsPerPage = 20,
  dependencies: unknown[] = []
) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [total, setTotal] = useState<number | undefined>()

  const offsetRef = useRef(0)
  const isLoadingRef = useRef(false)

  const loadItems = useCallback(
    async (reset = false) => {
      if (isLoadingRef.current) return

      isLoadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        const offset = reset ? 0 : offsetRef.current
        const result = await loadData(offset, itemsPerPage)

        if (reset) {
          setItems(result.items)
          offsetRef.current = result.items.length
        } else {
          setItems(prev => [...prev, ...result.items])
          offsetRef.current += result.items.length
        }

        setHasMore(result.hasMore)
        setTotal(result.total)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load data"))
      } finally {
        isLoadingRef.current = false
        setLoading(false)
        setInitialLoading(false)
      }
    },
    [loadData, itemsPerPage]
  )

  const resetAndReload = useCallback(() => {
    setItems([])
    setHasMore(true)
    setError(null)
    setInitialLoading(true)
    offsetRef.current = 0
    loadItems(true)
  }, [loadItems])

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingRef.current) {
      loadItems()
    }
  }, [hasMore, loadItems])

  useEffect(() => {
    resetAndReload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetAndReload, ...dependencies])

  return {
    items,
    loading,
    initialLoading,
    hasMore,
    error,
    total,
    loadMore,
    resetAndReload
  }
}
