"use client"

import React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import * as LucideIcons from "lucide-react"

interface PageHeaderProps {
  /**
   * L'icona da mostrare nell'header (nome dell'icona o componente)
   */
  icon: LucideIcon | string
  /**
   * Il titolo principale della pagina
   */
  title: string
  /**
   * La descrizione della pagina
   */
  description: string
  /**
   * Pulsante di azione principale opzionale
   */
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  }
  /**
   * Pulsanti di azione secondari opzionali
   */
  secondaryActions?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
    disabled?: boolean
  }[]
  /**
   * Statistiche da mostrare nell'header (come "50 of 50 variations")
   */
  stats?: {
    label: string
    value: string | number
    description?: string
  }
  /**
   * Classe CSS aggiuntiva
   */
  className?: string
}

export function PageHeader({
  icon,
  title,
  description,
  action,
  secondaryActions = [],
  stats,
  className
}: PageHeaderProps) {
  // Handle both icon components and icon names
  let IconComponent: LucideIcon
  
  if (typeof icon === 'string') {
    // Dynamically import the icon by name
    const iconKey = icon as keyof typeof LucideIcons
    IconComponent = (LucideIcons[iconKey] as LucideIcon) || LucideIcons.HelpCircle
  } else {
    IconComponent = icon
  }

  return (
    <div className={cn("space-y-4 mb-8", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-brand-primary-foreground">
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              <p className="text-muted-foreground text-lg">{description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">{stats.value}</span>
                <span className="font-medium">{stats.label}</span>
              </div>
            </div>
          )}

          {/* Secondary Actions */}
          {secondaryActions.map((secondaryAction, index) => {
            const SecondaryIcon = secondaryAction.icon
            return (
              <Button
                key={index}
                variant={secondaryAction.variant || "outline"}
                size="sm"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
              >
                {SecondaryIcon && <SecondaryIcon className="mr-2 h-4 w-4" />}
                {secondaryAction.label}
              </Button>
            )
          })}

          {/* Primary Action */}
          {action && (
            <Button
              variant={action.variant || "default"}
              onClick={action.onClick}
            >
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
