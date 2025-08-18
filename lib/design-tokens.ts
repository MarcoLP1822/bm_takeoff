/**
 * Design Tokens - Standardized design system constants
 * 
 * This file centralizes all design-related constants to ensure consistency
 * across the application. Import these tokens instead of hardcoding values.
 */

// Typography Scale
export const TYPOGRAPHY = {
  // Display sizes for headings and large text
  display: {
    xl: 'text-display-xl',     // 4xl, bold, tight tracking
    lg: 'text-display-lg',     // 3xl, bold, tight tracking  
    md: 'text-display-md',     // 2xl, semibold, tight tracking
    sm: 'text-display-sm',     // xl, semibold
  },
  
  // Body text sizes
  body: {
    lg: 'text-body-lg',        // lg, medium
    md: 'text-body-md',        // base, medium
    sm: 'text-body-sm',        // sm, medium
  },
  
  // Small text and captions
  caption: 'text-caption',     // xs, medium
  
  // Muted text variants
  muted: {
    lg: 'text-muted-lg',       // lg, muted-foreground
    md: 'text-muted-md',       // base, muted-foreground
    sm: 'text-muted-sm',       // sm, muted-foreground
    xs: 'text-muted-xs',       // xs, muted-foreground
  }
} as const

// Icon Sizes
export const ICONS = {
  xs: 'icon-xs',   // h-3 w-3
  sm: 'icon-sm',   // h-4 w-4
  md: 'icon-md',   // h-5 w-5
  lg: 'icon-lg',   // h-6 w-6
  xl: 'icon-xl',   // h-8 w-8
} as const

// Spacing Scale
export const SPACING = {
  // Semantic spacing for layout hierarchy
  section: 'space-section',      // space-y-6 - Between major sections
  component: 'space-component',  // space-y-4 - Between components
  element: 'space-element',      // space-y-2 - Between related elements
  
  // Gap variants for flex/grid layouts
  gap: {
    section: 'gap-section',      // gap-6
    component: 'gap-component',  // gap-4
    element: 'gap-element',      // gap-2
  }
} as const

// Status/Semantic Colors
export const STATUS_COLORS = {
  text: {
    success: 'text-status-success',
    warning: 'text-status-warning', 
    error: 'text-status-error',
    info: 'text-status-info',
  },
  
  background: {
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    error: 'bg-status-error', 
    info: 'bg-status-info',
  }
} as const

// Component Variants
export const VARIANTS = {
  button: {
    primary: 'default',
    secondary: 'secondary', 
    outline: 'outline',
    ghost: 'ghost',
    destructive: 'destructive',
    link: 'link'
  },
  
  badge: {
    default: 'default',
    secondary: 'secondary',
    destructive: 'destructive',
    outline: 'outline'
  }
} as const

// Common Patterns
export const PATTERNS = {
  // Card layouts
  cardGrid: {
    responsive: 'grid grid-cols-1 gap-component sm:grid-cols-2 lg:grid-cols-4',
    twoCol: 'grid grid-cols-1 gap-component md:grid-cols-2',
    threeCol: 'grid grid-cols-1 gap-component md:grid-cols-2 lg:grid-cols-3',
  },
  
  // Flex layouts
  flexBetween: 'flex items-center justify-between',
  flexCenter: 'flex items-center justify-center',
  flexStart: 'flex items-center',
  
  // Loading states
  skeleton: 'bg-muted animate-pulse rounded',
  
  // Interactive states
  interactive: 'transition-all hover:bg-accent hover:text-accent-foreground',
  clickable: 'cursor-pointer transition-all hover:bg-accent/50',
} as const

// Breakpoints (for reference in components)
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const

// Helper functions
export const getIconClass = (size: keyof typeof ICONS) => ICONS[size]

export const getTypographyClass = (
  category: keyof typeof TYPOGRAPHY, 
  size?: string
): string => {
  const categoryValue = TYPOGRAPHY[category]
  if (typeof categoryValue === 'string') {
    return categoryValue
  }
  // Handle nested objects like display, body, muted
  const nestedValue = categoryValue as Record<string, string>
  return nestedValue[size || 'md'] || nestedValue.md || ''
}

export const getSpacingClass = (type: keyof typeof SPACING) => SPACING[type]

export const getStatusColor = (
  type: 'text' | 'background', 
  status: 'success' | 'warning' | 'error' | 'info'
) => {
  return STATUS_COLORS[type][status]
}
