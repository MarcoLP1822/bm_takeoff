"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Clock,
  Calendar,
  Star,
  Target,
  Settings,
  Zap,
  BarChart3,
  CheckCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SmartSchedulerProps {
  className?: string
  onSchedule?: (schedule: ScheduleConfig) => void
}

interface ScheduleConfig {
  startDate: string
  endDate: string
  frequency: 'daily' | 'every-other-day' | 'weekly' | 'custom'
  timeSlots: string[]
  platforms: string[]
  minEngagementScore: number
  respectOptimalTimes: boolean
  distributePlatforms: boolean
  prioritizeHighPerformers: boolean
}

interface SchedulePreview {
  date: string
  time: string
  platform: string
  contentTitle: string
  engagementScore: number
  estimatedReach: number
}

interface OptimalTime {
  platform: string
  day: string
  time: string
  engagementRate: number
}

const OPTIMAL_TIMES: OptimalTime[] = [
  { platform: 'instagram', day: 'monday', time: '11:00', engagementRate: 0.85 },
  { platform: 'instagram', day: 'wednesday', time: '14:00', engagementRate: 0.82 },
  { platform: 'instagram', day: 'friday', time: '15:00', engagementRate: 0.88 },
  { platform: 'twitter', day: 'tuesday', time: '09:00', engagementRate: 0.75 },
  { platform: 'twitter', day: 'wednesday', time: '12:00', engagementRate: 0.78 },
  { platform: 'twitter', day: 'friday', time: '17:00', engagementRate: 0.81 },
  { platform: 'linkedin', day: 'tuesday', time: '08:00', engagementRate: 0.72 },
  { platform: 'linkedin', day: 'wednesday', time: '09:30', engagementRate: 0.74 },
  { platform: 'linkedin', day: 'thursday', time: '14:30', engagementRate: 0.76 },
  { platform: 'facebook', day: 'wednesday', time: '15:00', engagementRate: 0.68 },
  { platform: 'facebook', day: 'friday', time: '16:00', engagementRate: 0.71 },
  { platform: 'facebook', day: 'sunday', time: '19:00', engagementRate: 0.73 }
]

export default function SmartScheduler({ className, onSchedule }: SmartSchedulerProps) {
  const [config, setConfig] = useState<ScheduleConfig>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    frequency: 'daily',
    timeSlots: ['09:00', '14:00', '18:00'],
    platforms: ['instagram', 'twitter', 'linkedin'],
    minEngagementScore: 3,
    respectOptimalTimes: true,
    distributePlatforms: true,
    prioritizeHighPerformers: true
  })

  const [preview, setPreview] = useState<SchedulePreview[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    generatePreview()
  }, [config])

  const generatePreview = async () => {
    setLoading(true)
    try {
      // Simulazione della generazione del programma
      const mockPreview: SchedulePreview[] = [
        {
          date: '2025-08-15',
          time: '11:00',
          platform: 'instagram',
          contentTitle: 'Post Romance Novel',
          engagementScore: 5,
          estimatedReach: 1200
        },
        {
          date: '2025-08-15',
          time: '14:00', 
          platform: 'twitter',
          contentTitle: 'Writing Tips Thread',
          engagementScore: 4,
          estimatedReach: 800
        },
        {
          date: '2025-08-16',
          time: '09:30',
          platform: 'linkedin',
          contentTitle: 'Author Journey Post',
          engagementScore: 3,
          estimatedReach: 650
        }
      ]
      
      setPreview(mockPreview)
    } catch (error) {
      console.error('Error generating preview:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfigChange = (key: keyof ScheduleConfig, value: string | number | boolean | string[]) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const addTimeSlot = () => {
    setConfig(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, '12:00']
    }))
  }

  const removeTimeSlot = (index: number) => {
    setConfig(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((_, i) => i !== index)
    }))
  }

  const updateTimeSlot = (index: number, value: string) => {
    setConfig(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.map((slot, i) => i === index ? value : slot)
    }))
  }

  const handleSchedule = () => {
    onSchedule?.(config)
  }

  const renderEngagementStars = (score: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= score
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      {/* Configurazione */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurazione Programmazione
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Data Inizio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={config.startDate}
                  onChange={(e) => handleConfigChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Data Fine</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={config.endDate}
                  onChange={(e) => handleConfigChange('endDate', e.target.value)}
                />
              </div>
            </div>

            {/* Frequenza */}
            <div>
              <Label htmlFor="frequency">Frequenza</Label>
              <Select
                value={config.frequency}
                onValueChange={(value) => handleConfigChange('frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Giornaliera</SelectItem>
                  <SelectItem value="every-other-day">A giorni alterni</SelectItem>
                  <SelectItem value="weekly">Settimanale</SelectItem>
                  <SelectItem value="custom">Personalizzata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orari */}
            <div>
              <Label>Orari di Pubblicazione</Label>
              <div className="space-y-2 mt-2">
                {config.timeSlots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot}
                      onChange={(e) => updateTimeSlot(index, e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeTimeSlot(index)}
                      disabled={config.timeSlots.length <= 1}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTimeSlot}
                  className="w-full"
                >
                  + Aggiungi Orario
                </Button>
              </div>
            </div>

            <Separator />

            {/* Filtri */}
            <div>
              <Label htmlFor="minScore">Punteggio Minimo Engagement</Label>
              <Select
                value={config.minEngagementScore.toString()}
                onValueChange={(value) => handleConfigChange('minEngagementScore', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 stella (tutti)</SelectItem>
                  <SelectItem value="2">2 stelle</SelectItem>
                  <SelectItem value="3">3 stelle</SelectItem>
                  <SelectItem value="4">4 stelle</SelectItem>
                  <SelectItem value="5">5 stelle (solo i migliori)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Opzioni avanzate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="optimalTimes">Usa orari ottimali</Label>
                <Switch
                  id="optimalTimes"
                  checked={config.respectOptimalTimes}
                  onCheckedChange={(checked: boolean) => handleConfigChange('respectOptimalTimes', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="distributePlatforms">Distribuisci piattaforme</Label>
                <Switch
                  id="distributePlatforms"
                  checked={config.distributePlatforms}
                  onCheckedChange={(checked: boolean) => handleConfigChange('distributePlatforms', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="prioritizeHigh">Priorità contenuti top</Label>
                <Switch
                  id="prioritizeHigh"
                  checked={config.prioritizeHighPerformers}
                  onCheckedChange={(checked: boolean) => handleConfigChange('prioritizeHighPerformers', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orari ottimali */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Orari Ottimali per Piattaforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['instagram', 'twitter', 'linkedin', 'facebook'].map(platform => {
                const bestTimes = OPTIMAL_TIMES
                  .filter(t => t.platform === platform)
                  .sort((a, b) => b.engagementRate - a.engagementRate)
                  .slice(0, 2)
                
                return (
                  <div key={platform} className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{platform}</span>
                    <div className="flex gap-2">
                      {bestTimes.map((time, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {time.day} {time.time}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anteprima */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Anteprima Programmazione
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Generando anteprima...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {preview.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {new Date(item.date).toLocaleDateString('it-IT')} alle {item.time}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.platform}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{item.contentTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          Reach stimato: {item.estimatedReach.toLocaleString()}
                        </p>
                      </div>
                      {renderEngagementStars(item.engagementScore)}
                    </div>
                  </div>
                ))}
                
                {preview.length === 0 && (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nessun contenuto disponibile con i filtri selezionati
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiche stimate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Metriche Stimate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Post programmati</span>
              <Badge variant="outline">{preview.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Reach totale stimato</span>
              <Badge variant="outline">
                {preview.reduce((sum, item) => sum + item.estimatedReach, 0).toLocaleString()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Punteggio medio</span>
              <div className="flex items-center gap-1">
                {renderEngagementStars(
                  Math.round(preview.reduce((sum, item) => sum + item.engagementScore, 0) / preview.length) || 0
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Azioni */}
        <div className="space-y-2">
          <Button 
            className="w-full" 
            onClick={handleSchedule}
            disabled={preview.length === 0}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Conferma Programmazione
          </Button>
          <Button variant="outline" className="w-full">
            <Clock className="h-4 w-4 mr-2" />
            Salva come Template
          </Button>
        </div>
      </div>
    </div>
  )
}
