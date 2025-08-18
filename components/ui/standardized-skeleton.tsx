/**
 * StandardizedSkeleton - Consistent loading skeletons
 * 
 * Provides standardized skeleton components with consistent styling
 * to be used across the application for loading states.
 */

import { cn } from "@/lib/utils"
import { PATTERNS, SPACING } from "@/lib/design-tokens"

interface SkeletonProps {
  className?: string
}

export function SkeletonText({ className }: SkeletonProps) {
  return <div className={cn("h-4 w-24", PATTERNS.skeleton, className)} />
}

export function SkeletonTitle({ className }: SkeletonProps) {
  return <div className={cn("h-6 w-32", PATTERNS.skeleton, className)} />
}

export function SkeletonIcon({ className }: SkeletonProps) {
  return <div className={cn("h-4 w-4", PATTERNS.skeleton, className)} />
}

export function SkeletonButton({ className }: SkeletonProps) {
  return <div className={cn("h-9 w-24 rounded-md", PATTERNS.skeleton, className)} />
}

export function SkeletonCard({ className, children }: SkeletonProps & { children?: React.ReactNode }) {
  return (
    <div className={cn("border rounded-lg p-6", className)}>
      {children || (
        <div className={SPACING.component}>
          <SkeletonTitle />
          <SkeletonText />
          <SkeletonText className="w-16" />
        </div>
      )}
    </div>
  )
}

export function SkeletonGrid({ 
  count = 4, 
  columns = "sm:grid-cols-2 lg:grid-cols-4",
  className 
}: {
  count?: number
  columns?: string
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-component", columns, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn(SPACING.component, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-component p-4 border rounded-lg">
          <SkeletonIcon className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonTitle className="w-full" />
            <SkeletonText className="w-3/4" />
          </div>
          <SkeletonButton />
        </div>
      ))}
    </div>
  )
}

// Re-export for convenience
export const Skeleton = {
  Text: SkeletonText,
  Title: SkeletonTitle,
  Icon: SkeletonIcon,
  Button: SkeletonButton,
  Card: SkeletonCard,
  Grid: SkeletonGrid,
  List: SkeletonList,
}
