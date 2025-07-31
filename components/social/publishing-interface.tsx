"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Send, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface SocialAccount {
  id: string
  platform: string
  accountName: string
  accountHandle?: string
  isActive: boolean
}

interface PublishingInterfaceProps {
  contentId: string
  content: string
  platform: string
  accounts: SocialAccount[]
  onPublishSuccess?: () => void
  onScheduleSuccess?: () => void
}

interface PublishResult {
  success: boolean
  contentId: string
  accountId: string
  platform: string
  socialPostId?: string
  error?: string
}

export function PublishingInterface({
  contentId,
  content,
  platform,
  accounts,
  onPublishSuccess,
  onScheduleSuccess
}: PublishingInterfaceProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [publishResults, setPublishResults] = useState<PublishResult[]>([])

  // Filter accounts by platform
  const platformAccounts = accounts.filter(
    account => account.platform === platform && account.isActive
  )

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    )
  }

  const handlePublishNow = async () => {
    if (selectedAccounts.length === 0) {
      toast.error("Please select at least one account")
      return
    }

    setIsPublishing(true)
    setPublishResults([])

    try {
      const response = await fetch("/api/social/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contentId,
          accountIds: selectedAccounts
        })
      })

      const data = await response.json()

      if (data.success) {
        setPublishResults(data.results)
        
        const successCount = data.summary.successful
        const failCount = data.summary.failed

        if (successCount > 0) {
          toast.success(`Published to ${successCount} account${successCount > 1 ? 's' : ''}`)
          onPublishSuccess?.()
        }

        if (failCount > 0) {
          toast.error(`Failed to publish to ${failCount} account${failCount > 1 ? 's' : ''}`)
        }
      } else {
        toast.error("Failed to publish content")
      }
    } catch (error) {
      console.error("Publish error:", error)
      toast.error("Failed to publish content")
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSchedulePost = async () => {
    if (selectedAccounts.length === 0) {
      toast.error("Please select at least one account")
      return
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error("Please select date and time")
      return
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)
    
    if (scheduledAt <= new Date()) {
      toast.error("Scheduled time must be in the future")
      return
    }

    setIsScheduling(true)

    try {
      const response = await fetch("/api/social/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contentId,
          accountIds: selectedAccounts,
          scheduledAt: scheduledAt.toISOString()
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Post scheduled successfully")
        onScheduleSuccess?.()
        
        // Reset form
        setSelectedAccounts([])
        setScheduledDate("")
        setScheduledTime("")
      } else {
        toast.error(data.error || "Failed to schedule post")
      }
    } catch (error) {
      console.error("Schedule error:", error)
      toast.error("Failed to schedule post")
    } finally {
      setIsScheduling(false)
    }
  }

  const handleRetryPublication = async (accountId: string) => {
    try {
      const response = await fetch("/api/social/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contentId,
          accountId
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Publication retry successful")
        
        // Update results
        setPublishResults(prev => 
          prev.map(result => 
            result.accountId === accountId 
              ? { ...result, success: true, error: undefined }
              : result
          )
        )
      } else {
        toast.error(data.error || "Retry failed")
      }
    } catch (error) {
      console.error("Retry error:", error)
      toast.error("Failed to retry publication")
    }
  }

  if (platformAccounts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No {platform} accounts connected</p>
            <p className="text-sm">Connect your {platform} account to publish content</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Publish to {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Selection */}
        <div>
          <h4 className="font-medium mb-3">Select Accounts</h4>
          <div className="space-y-2">
            {platformAccounts.map(account => (
              <label
                key={account.id}
                className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selectedAccounts.includes(account.id)}
                  onChange={() => handleAccountToggle(account.id)}
                  className="rounded"
                />
                <div className="flex-1">
                  <div className="font-medium">{account.accountName}</div>
                  {account.accountHandle && (
                    <div className="text-sm text-muted-foreground">
                      @{account.accountHandle}
                    </div>
                  )}
                </div>
                <Badge variant="secondary">{platform}</Badge>
              </label>
            ))}
          </div>
        </div>

        {/* Publishing Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handlePublishNow}
            disabled={isPublishing || selectedAccounts.length === 0}
            className="flex-1"
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Publish Now
          </Button>
        </div>

        {/* Scheduling */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Schedule for Later
          </h4>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <Button
            onClick={handleSchedulePost}
            disabled={isScheduling || selectedAccounts.length === 0}
            variant="outline"
            className="w-full"
          >
            {isScheduling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Schedule Post
          </Button>
        </div>

        {/* Publish Results */}
        {publishResults.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Publication Results</h4>
            <div className="space-y-2">
              {publishResults.map((result, index) => {
                const account = platformAccounts.find(a => a.id === result.accountId)
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <div className="font-medium">{account?.accountName}</div>
                        {result.error && (
                          <div className="text-sm text-red-600">{result.error}</div>
                        )}
                      </div>
                    </div>
                    
                    {!result.success && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetryPublication(result.accountId)}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}