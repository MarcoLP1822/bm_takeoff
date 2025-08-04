/**
 * Custom hook for managing dashboard notifications and long-running operations
 * Extracted from DashboardOverview to improve modularity
 */
"use client"

import { useState, useCallback } from "react"

export interface Notification {
  id: string
  type: "success" | "error" | "info"
  message: string
  timestamp: Date
}

export interface LongRunningOperation {
  id: string
  type: "book_analysis" | "content_generation" | "publishing"
  title: string
  progress: number
  status: "running" | "completed" | "error"
}

interface UseDashboardNotificationsReturn {
  notifications: Notification[]
  longRunningOperations: LongRunningOperation[]
  addNotification: (type: "success" | "error" | "info", message: string) => void
  simulateLongRunningOperation: (
    type: "book_analysis" | "content_generation" | "publishing",
    title: string
  ) => void
  formatTimeAgo: (date: Date) => string
}

export function useDashboardNotifications(): UseDashboardNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [longRunningOperations, setLongRunningOperations] = useState<LongRunningOperation[]>([])

  const addNotification = useCallback((
    type: "success" | "error" | "info",
    message: string
  ) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    }
    setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep only 5 notifications

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 5000)
  }, [])

  const simulateLongRunningOperation = useCallback((
    type: "book_analysis" | "content_generation" | "publishing",
    title: string
  ) => {
    const operation: LongRunningOperation = {
      id: Date.now().toString(),
      type,
      title,
      progress: 0,
      status: "running"
    }

    setLongRunningOperations(prev => [...prev, operation])

    // Simulate progress
    const interval = setInterval(() => {
      setLongRunningOperations(prev =>
        prev.map(op => {
          if (op.id === operation.id) {
            const newProgress = Math.min(op.progress + Math.random() * 20, 100)
            if (newProgress >= 100) {
              clearInterval(interval)
              setTimeout(() => {
                setLongRunningOperations(prev =>
                  prev.filter(o => o.id !== operation.id)
                )
                addNotification("success", `${title} completed successfully!`)
              }, 1000)
              return { ...op, progress: 100, status: "completed" as const }
            }
            return { ...op, progress: newProgress }
          }
          return op
        })
      )
    }, 500)
  }, [addNotification])

  const formatTimeAgo = useCallback((date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    )

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }, [])

  return {
    notifications,
    longRunningOperations,
    addNotification,
    simulateLongRunningOperation,
    formatTimeAgo
  }
}
