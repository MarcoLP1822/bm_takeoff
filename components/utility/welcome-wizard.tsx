"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Upload, Sparkles } from "lucide-react"
import { BookUpload } from "@/components/books/book-upload"

interface WelcomeWizardProps {
  translations: {
    title: string
    welcome: string
  }
}

export default function WelcomeWizard({ translations }: WelcomeWizardProps) {
  const [showUpload, setShowUpload] = useState(false)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-2 border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">{translations.welcome}</CardTitle>
          <p className="text-muted-foreground">
            Inizia caricando il tuo primo libro per generare contenuti di marketing automaticamente
          </p>
        </CardHeader>
        <CardContent>
          {!showUpload ? (
            <div className="text-center">
              <Button 
                onClick={() => setShowUpload(true)}
                size="lg"
                className="w-full sm:w-auto"
              >
                <Upload className="mr-2 h-5 w-5" />
                Carica il tuo primo libro
              </Button>
            </div>
          ) : (
            <BookUpload onUploadSuccess={() => {
              // Verrà gestito dalla completeOnboarding action
            }} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
