"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/ui/page-header"
import { Loader2, Settings, BookOpen, TrendingUp, ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { CONTENT_PRESETS, PRESET_CATEGORIES, getPresetsByCategory } from "@/lib/content-presets"
import { useBooks } from "@/hooks/use-books"
import { toast } from "sonner"

interface CustomizationOptions {
  focusTheme?: string
  additionalInstructions?: string
}

export default function ContentGeneratePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { books, loading: booksLoading, completedBooks } = useBooks()
  
  const [selectedBookId, setSelectedBookId] = useState<string>("")
  const [generating, setGenerating] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customizations, setCustomizations] = useState<CustomizationOptions>({})

  // Auto-select book if only one available
  useEffect(() => {
    if (completedBooks.length === 1 && !selectedBookId) {
      setSelectedBookId(completedBooks[0].id)
    }
  }, [completedBooks, selectedBookId])

  // Check for analytics suggestions
  const analyticsTheme = searchParams.get('theme')
  const analyticsPlatform = searchParams.get('platform')
  const analyticsEngagement = searchParams.get('engagement')

  const handlePresetSelect = async (presetId: string) => {
    if (!selectedBookId) {
      toast.error("Seleziona prima un libro da cui generare contenuti")
      return
    }

    // Prevent multiple clicks
    if (generating) {
      toast.warning("Generazione già in corso, attendi...")
      return
    }

    setGenerating(presetId)
    
    try {
      const response = await fetch("/api/content/generate/preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          bookId: selectedBookId, 
          presetId,
          customizations: customizations
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`${data.totalPosts} contenuti generati con preset "${data.preset.name}"!`)
        // Reindirizzare al content manager con filtro
        router.push(`/dashboard/content?new=true&preset=${presetId}`)
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate content")
      }
    } catch (error) {
      console.error("Generation error:", error)
      toast.error("Errore durante la generazione dei contenuti")
    } finally {
      setGenerating(null)
    }
  }

  if (booksLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Caricamento libri...</span>
      </div>
    )
  }

  if (completedBooks.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Nessun libro pronto</h2>
        <p className="text-muted-foreground mb-6">
          Carica e completa l'analisi di almeno un libro per generare contenuti.
        </p>
        <Button onClick={() => router.push("/dashboard/books")}>
          Vai ai tuoi libri
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Standardized Header */}
      <PageHeader
        icon={Sparkles}
        title="Genera Contenuti"
        description="Scegli il tipo di campagna per il tuo libro"
        action={{
          label: "Impostazioni Avanzate",
          onClick: () => setShowAdvanced(!showAdvanced),
          icon: Settings,
          variant: "outline"
        }}
      />

      {/* Analytics Insight Banner */}
      {analyticsTheme && analyticsEngagement && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">
                  Suggerimento basato sui tuoi dati
                </h4>
                <p className="text-sm text-green-700 mt-1">
                  Il tema "{analyticsTheme}" ha una performance del {analyticsEngagement}% di engagement. 
                  Ottime possibilità di successo con questo argomento!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Book Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seleziona Libro</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBookId} onValueChange={setSelectedBookId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Scegli il libro da cui generare contenuti" />
            </SelectTrigger>
            <SelectContent>
              {completedBooks.map((book) => (
                <SelectItem key={book.id} value={book.id}>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{book.title}</span>
                    <span className="text-sm text-muted-foreground">
                      by {book.author}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Preset Categories */}
      {Object.entries(PRESET_CATEGORIES).map(([categoryKey, category]) => {
        const categoryPresets = getPresetsByCategory(categoryKey as "launch" | "maintenance" | "engagement" | "professional")
        if (categoryPresets.length === 0) return null

        return (
          <div key={categoryKey}>
            <div className="flex items-center space-x-3 mb-4">
              <h2 className="text-xl font-semibold">{category.name}</h2>
              <Badge className={category.color}>{category.description}</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {categoryPresets.map((preset) => {
                const isDisabled = !selectedBookId || generating !== null
                const isGenerating = generating === preset.id
                
                return (
                  <Card 
                    key={preset.id} 
                    className={`transition-all ${
                      isDisabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'cursor-pointer hover:shadow-md'
                    } ${isGenerating ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => !isDisabled && handlePresetSelect(preset.id)}
                  >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-2xl mb-2">{preset.icon}</div>
                        <CardTitle className="text-lg">{preset.name}</CardTitle>
                      </div>
                      {generating === preset.id && (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {preset.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {preset.options.platforms?.map((platform) => (
                          <Badge key={platform} variant="secondary" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {preset.options.variationsPerTheme} variazioni • Tono {preset.options.tone}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Advanced Options Toggle */}
      <div className="border-t pt-6">
        <Button
          variant="ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full"
        >
          <Settings className="mr-2 h-4 w-4" />
          Personalizzazioni Avanzate
          {showAdvanced ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4" />
          )}
        </Button>
        
        {showAdvanced && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Opzioni di Personalizzazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="focusTheme">Tema Specifico (opzionale)</Label>
                <Input
                  id="focusTheme"
                  placeholder="es. leadership, crescita personale, innovazione"
                  value={customizations.focusTheme || ''}
                  onChange={(e) => setCustomizations(prev => ({
                    ...prev,
                    focusTheme: e.target.value
                  }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Concentra la generazione su un tema specifico del tuo libro
                </p>
              </div>
              
              <div>
                <Label htmlFor="additionalInstructions">Istruzioni Aggiuntive (opzionale)</Label>
                <Textarea
                  id="additionalInstructions"
                  placeholder="es. Includi sempre una domanda, usa un tono più formale, aggiungi emoji specifici"
                  value={customizations.additionalInstructions || ''}
                  onChange={(e) => setCustomizations(prev => ({
                    ...prev,
                    additionalInstructions: e.target.value
                  }))}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Personalizza ulteriormente lo stile e il contenuto generato
                </p>
              </div>
              
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => router.push("/dashboard/content/generate/advanced")}
                  className="w-full"
                >
                  Apri Configurazione Completamente Personalizzata
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

