"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Clock,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface ScheduledPost {
  id: string
  contentId: string
  accountId: string
  platform: string
  content: string
  scheduledAt: Date
  status: "scheduled" | "publishing" | "published" | "failed"
  retryCount: number
  lastError?: string
}

interface ScheduledPostResponse {
  id: string
  contentId: string
  accountId: string
  platform: string
  content: string
  scheduledAt: string // API returns ISO string, we convert to Date
  status: "scheduled" | "publishing" | "published" | "failed"
  retryCount: number
  lastError?: string
}

interface ScheduledPostsManagerProps {
  onPostUpdated?: () => void
}

export function ScheduledPostsManager({
  onPostUpdated
}: ScheduledPostsManagerProps) {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")

  useEffect(() => {
    fetchScheduledPosts()
  }, [])

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch("/api/social/schedule")
      const data = await response.json()

      if (data.success) {
        // Convert string dates back to Date objects
        const posts = data.scheduledPosts.map(
          (post: ScheduledPostResponse) => ({
            ...post,
            scheduledAt: new Date(post.scheduledAt)
          })
        )
        setScheduledPosts(posts)
      } else {
        toast.error("Failed to load scheduled posts")
      }
    } catch (error) {
      console.error("Fetch scheduled posts error:", error)
      toast.error("Failed to load scheduled posts")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelPost = async (postId: string) => {
    try {
      const response = await fetch(`/api/social/schedule/${postId}`, {
        method: "DELETE"
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Scheduled post cancelled")
        setScheduledPosts(prev => prev.filter(post => post.id !== postId))
        onPostUpdated?.()
      } else {
        toast.error(data.error || "Failed to cancel post")
      }
    } catch (error) {
      console.error("Cancel post error:", error)
      toast.error("Failed to cancel post")
    }
  }

  const handleStartEdit = (post: ScheduledPost) => {
    setEditingPost(post.id)
    const scheduledDate = post.scheduledAt
    setEditDate(format(scheduledDate, "yyyy-MM-dd"))
    setEditTime(format(scheduledDate, "HH:mm"))
  }

  const handleSaveEdit = async (postId: string) => {
    if (!editDate || !editTime) {
      toast.error("Please select date and time")
      return
    }

    const newScheduledAt = new Date(`${editDate}T${editTime}`)

    if (newScheduledAt <= new Date()) {
      toast.error("Scheduled time must be in the future")
      return
    }

    try {
      const response = await fetch(`/api/social/schedule/${postId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          scheduledAt: newScheduledAt.toISOString()
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Post rescheduled successfully")

        // Update local state
        setScheduledPosts(prev =>
          prev.map(post =>
            post.id === postId ? { ...post, scheduledAt: newScheduledAt } : post
          )
        )

        setEditingPost(null)
        onPostUpdated?.()
      } else {
        toast.error(data.error || "Failed to reschedule post")
      }
    } catch (error) {
      console.error("Reschedule error:", error)
      toast.error("Failed to reschedule post")
    }
  }

  const handleCancelEdit = () => {
    setEditingPost(null)
    setEditDate("")
    setEditTime("")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "publishing":
        return "bg-yellow-100 text-yellow-800"
      case "published":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "twitter":
        return "bg-blue-100 text-blue-800"
      case "instagram":
        return "bg-pink-100 text-pink-800"
      case "linkedin":
        return "bg-blue-100 text-blue-800"
      case "facebook":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (scheduledPosts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-8 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No scheduled posts</p>
            <p className="text-sm">Schedule posts to see them here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Posts ({scheduledPosts.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchScheduledPosts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {scheduledPosts
            .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
            .map(post => (
              <div key={post.id} className="space-y-3 rounded-lg border p-4">
                {/* Post Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getPlatformColor(post.platform)}>
                      {post.platform}
                    </Badge>
                    <Badge className={getStatusColor(post.status)}>
                      {post.status}
                    </Badge>
                    {post.retryCount > 0 && (
                      <Badge variant="outline">Retry {post.retryCount}</Badge>
                    )}
                  </div>

                  {post.status === "scheduled" && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartEdit(post)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelPost(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Post Content */}
                <div className="text-muted-foreground text-sm">
                  {post.content.length > 100
                    ? `${post.content.substring(0, 100)}...`
                    : post.content}
                </div>

                {/* Scheduling Info */}
                {editingPost === post.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Date
                        </label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={e => setEditDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Time
                        </label>
                        <input
                          type="time"
                          value={editTime}
                          onChange={e => setEditTime(e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(post.id)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(post.scheduledAt, "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(post.scheduledAt, "h:mm a")}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {post.lastError && (
                  <div className="flex items-start gap-2 rounded-md bg-red-50 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
                    <div className="text-sm text-red-700">
                      <div className="font-medium">Last Error:</div>
                      <div>{post.lastError}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}
