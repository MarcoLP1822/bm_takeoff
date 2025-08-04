/**
 * NotificationsPanel Component
 * Displays notifications and long-running operations
 */
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertCircle, Eye, Loader2 } from "lucide-react"
import type { Notification, LongRunningOperation } from "@/hooks/use-dashboard-notifications"

interface NotificationsPanelProps {
  notifications: Notification[]
  longRunningOperations: LongRunningOperation[]
  formatTimeAgo: (date: Date) => string
}

export default function NotificationsPanel({ 
  notifications, 
  longRunningOperations, 
  formatTimeAgo 
}: NotificationsPanelProps) {
  if (notifications.length === 0 && longRunningOperations.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                notification.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-200"
                  : notification.type === "error"
                    ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-200"
                    : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-200"
              }`}
            >
              <div className="flex items-center space-x-2">
                {notification.type === "success" && (
                  <CheckCircle className="h-4 w-4" />
                )}
                {notification.type === "error" && (
                  <AlertCircle className="h-4 w-4" />
                )}
                {notification.type === "info" && <Eye className="h-4 w-4" />}
                <span className="text-sm font-medium">
                  {notification.message}
                </span>
              </div>
              <span className="text-xs opacity-70">
                {formatTimeAgo(notification.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Long Running Operations */}
      {longRunningOperations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-muted-foreground text-sm font-medium">
            Active Operations
          </h3>
          {longRunningOperations.map(operation => (
            <Card key={operation.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {operation.status === "running" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {operation.status === "completed" && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {operation.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">{operation.title}</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {Math.round(operation.progress)}%
                </span>
              </div>
              <Progress value={operation.progress} className="h-2" />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
