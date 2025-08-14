"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Zap, Settings2 } from "lucide-react"
import { useBooks } from "@/hooks/use-books"
import { toast } from "sonner"

interface AdvancedGenerationOptions {
  platforms: string[]
  tone: string
  contentTypes: string[]
  variationsPerTheme: number
  includeHashtags: boolean
  includeEmojis: boolean
  focusThemes: string[]
  customInstructions: string
  targetAudience: string
  contentLength: "short" | "medium" | "long"
}

const PLATFORM_OPTIONS = [
  { id: "twitter", label: "Twitter/X", maxChars: 280 },
  { id: "linkedin", label: "LinkedIn", maxChars: 3000 },
  { id: "instagram", label: "Instagram", maxChars: 2200 },
  { id: "facebook", label: "Facebook", maxChars: 8000 },
  { id: "tiktok", label: "TikTok", maxChars: 2200 }
]

const TONE_OPTIONS = [
  { id: "professional", label: "Professionale", description: "Formale e autorevole" },
  { id: "conversational", label: "Colloquiale", description: "Amichevole e accessibile" },
  { id: "inspirational", label: "Ispirante", description: "Motivante e positivo" },
  { id: "educational", label: "Educativo", description: "Informativo e didattico" },
  { id: "humorous", label: "Divertente", description: "Leggero e spiritoso" },
  { id: "authoritative", label: "Autorevole", description: "Esperto e affidabile" }
]

const CONTENT_TYPE_OPTIONS = [
  { id: "quotes", label: "Citazioni", description: "Estratti significativi dal libro" },
  { id: "insights", label: "Spunti", description: "Concetti chiave e riflessioni" },
  { id: "tips", label: "Consigli", description: "Suggerimenti pratici" },
  { id: "questions", label: "Domande", description: "Domande per engagement" },
  { id: "stories", label: "Storie", description: "Aneddoti e esempi" },
  { id: "facts", label: "Fatti", description: "Dati e statistiche interessanti" }
]

export default function AdvancedGeneratePage() {
  const router = useRouter()
  const { books, loading: booksLoading, completedBooks } = useBooks()
  
  const [selectedBookId, setSelectedBookId] = useState<string>("")
  const [generating, setGenerating] = useState(false)
  const [options, setOptions] = useState<AdvancedGenerationOptions>({
    platforms: ["twitter", "linkedin"],
    tone: "conversational",
    contentTypes: ["quotes", "insights", "tips"],
    variationsPerTheme: 2,
    includeHashtags: true,
    includeEmojis: true,
    focusThemes: [],
    customInstructions: "",
    targetAudience: "",
    contentLength: "medium"
  })

  // Auto-select book if only one available
  useEffect(() => {
    if (completedBooks.length === 1 && !selectedBookId) {
      setSelectedBookId(completedBooks[0].id)
    }
  }, [completedBooks, selectedBookId])

  const handlePlatformToggle = (platformId: string) => {
    setOptions(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId]
    }))
  }

  const handleContentTypeToggle = (typeId: string) => {
    setOptions(prev => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(typeId)
        ? prev.contentTypes.filter(t => t !== typeId)
        : [...prev.contentTypes, typeId]
    }))
  }

  const handleFocusThemeAdd = (theme: string) => {
    if (theme.trim() && !options.focusThemes.includes(theme.trim())) {
      setOptions(prev => ({
        ...prev,
        focusThemes: [...prev.focusThemes, theme.trim()]
      }))
    }
  }

  const handleFocusThemeRemove = (theme: string) => {
    setOptions(prev => ({
      ...prev,
      focusThemes: prev.focusThemes.filter(t => t !== theme)
    }))
  }

  const handleGenerate = async () => {
    if (!selectedBookId) {
      toast.error("Seleziona prima un libro")
      return
    }

    if (options.platforms.length === 0) {
      toast.error("Seleziona almeno una piattaforma")
      return
    }

    if (options.contentTypes.length === 0) {
      toast.error("Seleziona almeno un tipo di contenuto")
      return
    }

    setGenerating(true)
    
    try {
      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          bookId: selectedBookId, 
          options: options
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`${data.totalPosts} contenuti generati con successo!`)
        router.push("/dashboard/content?new=true&advanced=true")
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate content")
      }
    } catch (error) {
      console.error("Generation error:", error)
      toast.error("Errore durante la generazione dei contenuti")
    } finally {
      setGenerating(false)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Settings2 className="h-6 w-6 mr-2" />
            Generazione Avanzata
          </h1>
          <p className="text-muted-foreground">
            Configura ogni aspetto della generazione di contenuti
          </p>
        </div>
      </div>

      {/* Book Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Selezione Libro</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBookId} onValueChange={setSelectedBookId}>
            <SelectTrigger>
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

      {/* Platform Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Piattaforme Target</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORM_OPTIONS.map((platform) => (
              <div
                key={platform.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  options.platforms.includes(platform.id)
                    ? "border-primary bg-primary/5"
                    : "border-muted"
                }`}
                onClick={() => handlePlatformToggle(platform.id)}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    options.platforms.includes(platform.id) 
                      ? "bg-primary border-primary" 
                      : "border-muted-foreground"
                  }`}>
                    {options.platforms.includes(platform.id) && (
                      <span className="text-white text-xs">✓</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{platform.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Max {platform.maxChars} caratteri
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tone & Style */}
        <Card>
          <CardHeader>
            <CardTitle>Tono e Stile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tono di Voce</Label>
              <Select value={options.tone} onValueChange={(value) => 
                setOptions(prev => ({ ...prev, tone: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((tone) => (
                    <SelectItem key={tone.id} value={tone.id}>
                      <div>
                        <p className="font-medium">{tone.label}</p>
                        <p className="text-xs text-muted-foreground">{tone.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Lunghezza Contenuto</Label>
              <Select value={options.contentLength} onValueChange={(value: "short" | "medium" | "long") => 
                setOptions(prev => ({ ...prev, contentLength: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Breve (più conciso)</SelectItem>
                  <SelectItem value="medium">Medio (bilanciato)</SelectItem>
                  <SelectItem value="long">Lungo (più dettagliato)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  options.includeHashtags 
                    ? "bg-primary border-primary" 
                    : "border-muted-foreground"
                }`}
                onClick={() => setOptions(prev => ({ ...prev, includeHashtags: !prev.includeHashtags }))}
              >
                {options.includeHashtags && (
                  <span className="text-white text-xs">✓</span>
                )}
              </button>
              <Label>Includi hashtag rilevanti</Label>
            </div>

            <div className="flex items-center space-x-2">
              <button
                className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  options.includeEmojis 
                    ? "bg-primary border-primary" 
                    : "border-muted-foreground"
                }`}
                onClick={() => setOptions(prev => ({ ...prev, includeEmojis: !prev.includeEmojis }))}
              >
                {options.includeEmojis && (
                  <span className="text-white text-xs">✓</span>
                )}
              </button>
              <Label>Includi emoji appropriate</Label>
            </div>
          </CardContent>
        </Card>

        {/* Content Types */}
        <Card>
          <CardHeader>
            <CardTitle>Tipi di Contenuto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {CONTENT_TYPE_OPTIONS.map((type) => (
                <div
                  key={type.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    options.contentTypes.includes(type.id)
                      ? "border-primary bg-primary/5"
                      : "border-muted"
                  }`}
                  onClick={() => handleContentTypeToggle(type.id)}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      options.contentTypes.includes(type.id) 
                        ? "bg-primary border-primary" 
                        : "border-muted-foreground"
                    }`}>
                      {options.contentTypes.includes(type.id) && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Impostazioni di Generazione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Variazioni per tema</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={options.variationsPerTheme}
              onChange={(e) => 
                setOptions(prev => ({ ...prev, variationsPerTheme: parseInt(e.target.value) || 1 }))
              }
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Più variazioni = maggiore diversità nei contenuti (1-5)
            </p>
          </div>

          <div>
            <Label htmlFor="targetAudience">Target Audience (opzionale)</Label>
            <Input
              id="targetAudience"
              placeholder="es. professionisti IT, imprenditori, studenti universitari"
              value={options.targetAudience}
              onChange={(e) => setOptions(prev => ({ 
                ...prev, 
                targetAudience: e.target.value 
              }))}
            />
          </div>

          <div>
            <Label>Temi Specifici</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {options.focusThemes.map((theme) => (
                <Badge
                  key={theme}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleFocusThemeRemove(theme)}
                >
                  {theme} ×
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Aggiungi un tema e premi Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFocusThemeAdd(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
            />
          </div>

          <div>
            <Label htmlFor="customInstructions">Istruzioni Personalizzate</Label>
            <Textarea
              id="customInstructions"
              placeholder="Aggiungi istruzioni specifiche per la generazione..."
              value={options.customInstructions}
              onChange={(e) => setOptions(prev => ({ 
                ...prev, 
                customInstructions: e.target.value 
              }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Generation Button */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={() => router.back()}>
          Annulla
        </Button>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Genera Contenuti
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
