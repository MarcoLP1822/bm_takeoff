"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  Clock,
  Bug,
  CheckCircle,
  XCircle,
  Info
} from "lucide-react"
import { useErrorHandler } from "@/hooks/use-error-handler"
import { ToastService } from "@/lib/toast-service"

interface ErrorStats {
  timeframe: string
  summary: {
    totalErrors: number
    errorRate: number
    criticalErrors: number
    highSeverityErrors: number
    retryableErrors: number
    healthScore: number
  }
  breakdown: {
    byType: Record<string, number>
    bySeverity: Record<string, number>
    topPatterns: Array<{ pattern: string; count: number }>
  }
  recentErrors: Array<{
    timestamp: string
    type: string
    severity: string
    message: string
    retryable: boolean
    context?: Record<string, unknown>
  }>
  trends: {
    lastHour: number
    last24Hours: number
  }
}

export function ErrorDashboard() {
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState("1h")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const { fetchWithErrorHandling } = useErrorHandler()

  const fetchStats = useCallback(async () => {
    setLoading(true)

    const response = await fetchWithErrorHandling(
      `/api/monitoring/errors?timeframe=${timeframe}`,
      {
        context: "Error Dashboard",
        showToast: false
      }
    )

    if (response) {
      const data = await response.json()
      setStats(data.data)
    }

    setLoading(false)
  }, [timeframe, fetchWithErrorHandling])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh, fetchStats])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200"
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "LOW":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    if (score >= 50) return "text-orange-600"
    return "text-red-600"
  }

  const getHealthScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (score >= 70) return <Info className="h-5 w-5 text-yellow-600" />
    if (score >= 50)
      return <AlertTriangle className="h-5 w-5 text-orange-600" />
    return <XCircle className="h-5 w-5 text-red-600" />
  }

  const clearErrorStats = async () => {
    const response = await fetchWithErrorHandling("/api/monitoring/errors", {
      method: "DELETE",
      context: "Clear Error Stats"
    })

    if (response) {
      ToastService.success("Error statistics cleared")
      fetchStats()
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
        Loading error statistics...
      </div>
    )
  }

  if (!stats) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load error statistics. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Error Monitoring Dashboard</h2>
          <p className="text-gray-600">
            System health and error tracking for the last {timeframe}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity
              className={`mr-2 h-4 w-4 ${autoRefresh ? "text-green-600" : "text-gray-400"}`}
            />
            Auto Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {getHealthScoreIcon(stats.summary.healthScore)}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getHealthScoreColor(stats.summary.healthScore)}`}
            >
              {stats.summary.healthScore}%
            </div>
            <p className="text-xs text-gray-600">Overall system health score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <Bug className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.summary.totalErrors}
            </div>
            <p className="text-xs text-gray-600">
              {stats.summary.errorRate.toFixed(2)} errors/hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Errors
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.summary.criticalErrors}
            </div>
            <p className="text-xs text-gray-600">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Retryable Errors
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.summary.retryableErrors}
            </div>
            <p className="text-xs text-gray-600">
              Can be automatically retried
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="breakdown">Error Breakdown</TabsTrigger>
          <TabsTrigger value="recent">Recent Errors</TabsTrigger>
          <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* By Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Errors by Type</CardTitle>
                <CardDescription>
                  Distribution of errors by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.breakdown.byType).map(
                    ([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium">{type}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    )
                  )}
                  {Object.keys(stats.breakdown.byType).length === 0 && (
                    <p className="text-sm text-gray-500">
                      No errors in this timeframe
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* By Severity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Errors by Severity</CardTitle>
                <CardDescription>
                  Distribution of errors by severity level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.breakdown.bySeverity).map(
                    ([severity, count]) => (
                      <div
                        key={severity}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium">{severity}</span>
                        <Badge className={getSeverityColor(severity)}>
                          {count}
                        </Badge>
                      </div>
                    )
                  )}
                  {Object.keys(stats.breakdown.bySeverity).length === 0 && (
                    <p className="text-sm text-gray-500">
                      No errors in this timeframe
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Errors</CardTitle>
              <CardDescription>
                Latest {stats.recentErrors.length} errors in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentErrors.map((error, index) => (
                  <div key={index} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(error.severity)}>
                          {error.severity}
                        </Badge>
                        <Badge variant="outline">{error.type}</Badge>
                        {error.retryable && (
                          <Badge variant="outline" className="text-blue-600">
                            Retryable
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(error.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{error.message}</p>
                    {error.context && (
                      <p className="text-xs text-gray-500">
                        Context: {JSON.stringify(error.context)}
                      </p>
                    )}
                  </div>
                ))}
                {stats.recentErrors.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-500">
                    No recent errors found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Error Patterns</CardTitle>
              <CardDescription>
                Most frequent error patterns that may need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.breakdown.topPatterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{pattern.pattern}</p>
                      <p className="text-xs text-gray-500">
                        Occurred {pattern.count} times
                      </p>
                    </div>
                    <Badge variant="outline">{pattern.count}</Badge>
                  </div>
                ))}
                {stats.breakdown.topPatterns.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-500">
                    No error patterns detected
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
          <CardDescription>
            Administrative actions for error management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="outline" onClick={clearErrorStats}>
              Clear Statistics
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("/api/monitoring/errors", "_blank")}
            >
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
