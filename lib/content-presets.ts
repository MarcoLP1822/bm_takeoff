import { ContentGenerationOptions } from "@/lib/content-generation"

export interface ContentPreset {
  id: string
  name: string
  description: string
  icon: string
  options: ContentGenerationOptions
  category: 'launch' | 'maintenance' | 'engagement' | 'professional'
}

export const CONTENT_PRESETS: ContentPreset[] = [
  {
    id: "libro-lancio",
    name: "Lancio Libro",
    description: "Post per annunciare e promuovere il lancio del tuo libro",
    icon: "🚀",
    category: "launch",
    options: {
      platforms: ["twitter", "instagram", "linkedin", "facebook"],
      variationsPerTheme: 3,
      tone: "inspirational",
      includeImages: true
    }
  },
  {
    id: "mantenimento-settimanale",
    name: "Mantenimento Settimanale",
    description: "Contenuti regolari per mantenere l'engagement",
    icon: "📅",
    category: "maintenance",
    options: {
      platforms: ["twitter", "instagram"],
      variationsPerTheme: 2,
      tone: "casual",
      includeImages: true
    }
  },
  {
    id: "citazioni-ispirazionali",
    name: "Citazioni Ispiratrici",
    description: "Post basati su citazioni e estratti dal libro",
    icon: "💭",
    category: "engagement",
    options: {
      platforms: ["instagram", "twitter"],
      variationsPerTheme: 4,
      tone: "inspirational",
      includeImages: true
    }
  },
  {
    id: "professionale-linkedin",
    name: "Contenuto Professionale",
    description: "Post ottimizzati per networking professionale",
    icon: "💼",
    category: "professional",
    options: {
      platforms: ["linkedin"],
      variationsPerTheme: 2,
      tone: "professional",
      includeImages: false
    }
  },
  {
    id: "storytelling-personale",
    name: "Storytelling Personale",
    description: "Condividi la storia dietro al tuo libro",
    icon: "📖",
    category: "engagement",
    options: {
      platforms: ["facebook", "instagram", "linkedin"],
      variationsPerTheme: 3,
      tone: "casual",
      includeImages: true
    }
  },
  {
    id: "tips-educativi",
    name: "Tips Educativi",
    description: "Contenuti educativi basati sui temi del libro",
    icon: "🎓",
    category: "professional",
    options: {
      platforms: ["linkedin", "twitter"],
      variationsPerTheme: 2,
      tone: "educational",
      includeImages: false
    }
  }
]

export function getPresetById(presetId: string): ContentPreset | undefined {
  return CONTENT_PRESETS.find(p => p.id === presetId)
}

export function getPresetsByCategory(category: ContentPreset['category']): ContentPreset[] {
  return CONTENT_PRESETS.filter(p => p.category === category)
}

export const PRESET_CATEGORIES = {
  launch: {
    name: "Lancio",
    description: "Per promuovere l'uscita del libro",
    color: "bg-red-100 text-red-800"
  },
  maintenance: {
    name: "Mantenimento",
    description: "Per engagement regolare",
    color: "bg-blue-100 text-blue-800"
  },
  engagement: {
    name: "Coinvolgimento",
    description: "Per aumentare l'interazione",
    color: "bg-green-100 text-green-800"
  },
  professional: {
    name: "Professionale",
    description: "Per networking e autorevolezza",
    color: "bg-purple-100 text-purple-800"
  }
} as const
