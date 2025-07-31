'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Database, 
  Zap, 
  Clock, 
  HardDrive,
  Wifi,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

interface PerformanceMetrics {
  cacheHitRate: number
  averageResponseTime: number
  databaseQueryTime: number
  compressionRatio: number
  memoryUsage: number
  activeConnections: number
  totalRequests: number
  errorRate: number
  lastUpdated: string
}

interface CacheStats {
  totalKeys: number
  memoryUsage: string
  hitRate?: number
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch performance metrics
      const [metricsResponse, cacheResponse] = await Promise.all([
        fetch('/api/monitoring/performance'),
        fetch('/api/monitoring/cache-stats')
      ])

      if (!metricsResponse.ok || !cacheResponse.ok) {
        throw new Error('Failed to fetch performance data')
      }

      const metricsData = await metricsResponse.json()
      const cacheData = await cacheResponse.json()

      setMetrics(metricsData)
      setCacheStats(cacheData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600'
    if (value >= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusBadge = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return <Badge className="bg-green-100 text-green-800">Good</Badge>
    if (value >= thresholds.warning) return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
    return <Badge className="bg-red-100 text-red-800">Critical</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchMetrics} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
          <Button onClick={fetchMetrics} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Cache Hit Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    Cache Hit Rate
                  </span>
                  {getStatusBadge(metrics.cacheHitRate, { good: 80, warning: 60 })}
                </div>
                <div className="space-y-1">
                  <Progress value={metrics.cacheHitRate} className="h-2" />
                  <span className={`text-lg font-bold ${getStatusColor(metrics.cacheHitRate, { good: 80, warning: 60 })}`}>
                    {metrics.cacheHitRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Response Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Avg Response Time
                  </span>
                  {getStatusBadge(metrics.averageResponseTime < 200 ? 100 : metrics.averageResponseTime < 500 ? 70 : 30, { good: 80, warning: 60 })}
                </div>
                <div className="space-y-1">
                  <span className={`text-lg font-bold ${metrics.averageResponseTime < 200 ? 'text-green-600' : metrics.averageResponseTime < 500 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {metrics.averageResponseTime.toFixed(0)}ms
                  </span>
                </div>
              </div>

              {/* Database Query Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Database className="h-4 w-4" />
                    DB Query Time
                  </span>
                  {getStatusBadge(metrics.databaseQueryTime < 100 ? 100 : metrics.databaseQueryTime < 300 ? 70 : 30, { good: 80, warning: 60 })}
                </div>
                <div className="space-y-1">
                  <span className={`text-lg font-bold ${metrics.databaseQueryTime < 100 ? 'text-green-600' : metrics.databaseQueryTime < 300 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {metrics.databaseQueryTime.toFixed(0)}ms
                  </span>
                </div>
              </div>

              {/* Compression Ratio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <HardDrive className="h-4 w-4" />
                    Compression Ratio
                  </span>
                  {getStatusBadge(metrics.compressionRatio < 0.5 ? 100 : metrics.compressionRatio < 0.7 ? 70 : 30, { good: 80, warning: 60 })}
                </div>
                <div className="space-y-1">
                  <span className={`text-lg font-bold ${metrics.compressionRatio < 0.5 ? 'text-green-600' : metrics.compressionRatio < 0.7 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {(metrics.compressionRatio * 100).toFixed(1)}%
                  </span>
                  <p className="text-xs text-gray-500">
                    {metrics.compressionRatio < 0.5 ? 'Excellent' : metrics.compressionRatio < 0.7 ? 'Good' : 'Poor'} compression
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cache Statistics */}
      {cacheStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Cache Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-600">Total Keys</span>
                <span className="text-2xl font-bold">{cacheStats.totalKeys.toLocaleString()}</span>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-600">Memory Usage</span>
                <span className="text-2xl font-bold">{cacheStats.memoryUsage}</span>
              </div>
              
              {cacheStats.hitRate !== undefined && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-600">Hit Rate</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{cacheStats.hitRate.toFixed(1)}%</span>
                    {cacheStats.hitRate >= 80 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-600">Active Connections</span>
                <span className="text-2xl font-bold">{metrics.activeConnections}</span>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-600">Total Requests</span>
                <span className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</span>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-600">Error Rate</span>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${metrics.errorRate < 1 ? 'text-green-600' : metrics.errorRate < 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {metrics.errorRate.toFixed(2)}%
                  </span>
                  {getStatusBadge(metrics.errorRate < 1 ? 100 : metrics.errorRate < 5 ? 70 : 30, { good: 80, warning: 60 })}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500">
                Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Hook for performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/monitoring/performance')
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  return { metrics, loading }
}