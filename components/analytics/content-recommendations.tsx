"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  Target, 
  ArrowRight,
  Sparkles,
  Calendar,
  Users
} from "lucide-react"
import Link from "next/link"
import type { ThemePerformance, OptimalPostingTime } from "@/lib/analytics-service"

interface ContentRecommendationsProps {
  topThemes: ThemePerformance[]
  optimalTimes: OptimalPostingTime[]
  className?: string
}

interface Recommendation {
  id: string
  type: 'theme' | 'timing' | 'format' | 'engagement'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  actionLink?: string
  impact: string
  data?: ThemePerformance | OptimalPostingTime | object
}

export default function ContentRecommendations({ 
  topThemes, 
  optimalTimes, 
  className 
}: ContentRecommendationsProps) {
  
  const generateRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = []
    
    // Raccomandazioni basate sui temi performanti
    if (topThemes.length > 0) {
      const bestTheme = topThemes[0]
      if (bestTheme.avgEngagementRate > 3) {
        recommendations.push({
          id: 'theme-top-performer',
          type: 'theme',
          priority: 'high',
          title: `Sfrutta il successo di "${bestTheme.theme}"`,
          description: `Il tema "${bestTheme.theme}" ha un engagement del ${(bestTheme.avgEngagementRate).toFixed(1)}%, molto sopra la media.`,
          action: 'Crea variazioni di questo tema',
          actionLink: '/dashboard/content/generate?theme=' + encodeURIComponent(bestTheme.theme),
          impact: '+25% engagement previsto',
          data: bestTheme
        })
      }
      
      // Tema sottoperformante da migliorare
      if (topThemes.length > 3) {
        const underPerforming = topThemes.slice(-1)[0]
        if (underPerforming.avgEngagementRate < 1.5) {
          recommendations.push({
            id: 'theme-improve',
            type: 'theme',
            priority: 'medium',
            title: `Migliora "${underPerforming.theme}"`,
            description: `Questo tema ha performance sotto la media (${underPerforming.avgEngagementRate.toFixed(1)}%).`,
            action: 'Prova nuovi formati per questo tema',
            actionLink: '/dashboard/content/generate?improve=' + encodeURIComponent(underPerforming.theme),
            impact: 'Recupero potenziale 15%',
            data: underPerforming
          })
        }
      }
    }
    
    // Raccomandazioni basate sui timing ottimali
    if (optimalTimes.length > 0) {
      const bestTime = optimalTimes[0]
      const bestHour = bestTime.hour
      const timeLabel = bestHour < 12 ? "mattina" : bestHour < 18 ? "pomeriggio" : "sera"
      
      recommendations.push({
        id: 'timing-optimization',
        type: 'timing',
        priority: 'high',
        title: `Ottimizza per la ${timeLabel}`,
        description: `Il tuo pubblico è più attivo alle ${bestHour}:00 con ${bestTime.avgEngagementRate.toFixed(1)}% di engagement.`,
        action: 'Programma contenuti per questo orario',
        actionLink: '/dashboard/content?tab=scheduler',
        impact: '+20% engagement garantito',
        data: bestTime
      })
    }
    
    // Raccomandazioni per diversificare le piattaforme
    const platformsUsed = new Set(topThemes.flatMap(t => t.platforms.map(p => p.platform)))
    if (platformsUsed.size < 3) {
      recommendations.push({
        id: 'platform-expansion',
        type: 'format',
        priority: 'medium',
        title: 'Espandi su nuove piattaforme',
        description: `Stai usando solo ${platformsUsed.size} piattaforme. Considera Instagram Stories o LinkedIn per raggiungere nuovi pubblici.`,
        action: 'Genera contenuti multi-piattaforma',
        actionLink: '/dashboard/content/generate/advanced',
        impact: '+40% reach potenziale'
      })
    }
    
    // Raccomandazioni per engagement
    const avgEngagement = topThemes.reduce((sum, theme) => sum + theme.avgEngagementRate, 0) / topThemes.length
    if (avgEngagement < 2) {
      recommendations.push({
        id: 'engagement-boost',
        type: 'engagement',
        priority: 'high',
        title: 'Aumenta l\'engagement generale',
        description: `L'engagement medio è ${avgEngagement.toFixed(1)}%. Aggiungi più domande e call-to-action.`,
        action: 'Usa contenuti interattivi',
        actionLink: '/dashboard/content/generate?style=interactive',
        impact: '+30% interaction rate'
      })
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }
  
  const recommendations = generateRecommendations()
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800'
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'theme': return <Sparkles className="h-4 w-4" />
      case 'timing': return <Clock className="h-4 w-4" />
      case 'format': return <Target className="h-4 w-4" />
      case 'engagement': return <Users className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <span>Raccomandazioni AI</span>
          <Badge variant="secondary" className="ml-auto">
            {recommendations.length} suggerimenti
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Genera più contenuti per ricevere raccomandazioni personalizzate</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.slice(0, 5).map((rec) => (
              <div 
                key={rec.id}
                className={`p-4 rounded-lg border-2 ${getPriorityColor(rec.priority)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-1">
                      {getTypeIcon(rec.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{rec.title}</h4>
                      <p className="text-sm opacity-90 mb-2">{rec.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {rec.impact}
                        </Badge>
                        <Badge className={`text-xs ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {rec.priority === 'high' ? 'Alta priorità' :
                           rec.priority === 'medium' ? 'Media priorità' :
                           'Bassa priorità'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-current/20">
                  {rec.actionLink ? (
                    <Link href={rec.actionLink}>
                      <Button size="sm" className="w-full">
                        {rec.action}
                        <ArrowRight className="h-3 w-3 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full">
                      {rec.action}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {recommendations.length > 5 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm">
                  Vedi tutte le raccomandazioni ({recommendations.length - 5} altre)
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
