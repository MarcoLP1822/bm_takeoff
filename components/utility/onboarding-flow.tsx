"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BookOpen,
  Upload,
  Zap,
  Users,
  BarChart3,
  CheckCircle,
  ArrowRight,
  X
} from "lucide-react"
import Link from "next/link"

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  completed: boolean
}

interface OnboardingFlowProps {
  onCloseAction: () => void
  className?: string
}

export default function OnboardingFlow({
  onCloseAction,
  className
}: OnboardingFlowProps) {
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: "upload-book",
      title: "Upload Your First Book",
      description:
        "Start by uploading a book file (PDF, EPUB, TXT, or DOCX) to analyze",
      icon: Upload,
      href: "/dashboard/books?action=upload",
      completed: false
    },
    {
      id: "analyze-content",
      title: "Analyze Book Content",
      description:
        "Let our AI analyze your book to extract themes, quotes, and insights",
      icon: BookOpen,
      href: "/dashboard/books",
      completed: false
    },
    {
      id: "generate-content",
      title: "Generate Social Content",
      description:
        "Create platform-specific social media posts from your book analysis",
      icon: Zap,
      href: "/dashboard/content/generate",
      completed: false
    },
    {
      id: "connect-accounts",
      title: "Connect Social Accounts",
      description:
        "Link your social media accounts to publish content directly",
      icon: Users,
      href: "/dashboard/settings/social",
      completed: false
    },
    {
      id: "view-analytics",
      title: "Track Performance",
      description:
        "Monitor how your book-based content performs across platforms",
      icon: BarChart3,
      href: "/dashboard/analytics",
      completed: false
    }
  ])

  useEffect(() => {
    // Check completion status from localStorage or API
    const checkStepCompletion = async () => {
      try {
        // Check if user has uploaded books
        const booksRes = await fetch("/api/books")
        const booksData = await booksRes.json()
        const books = booksData.books || booksData // Handle new API structure

        // Check if user has generated content
        const contentRes = await fetch("/api/content")
        const contentData = await contentRes.json()
        const content =
          contentData.data?.content || contentData.content || contentData // Handle new API structure

        // Check if user has connected social accounts
        const accountsRes = await fetch("/api/social/accounts")
        const accounts = await accountsRes.json()

        setSteps(prevSteps =>
          prevSteps.map(step => {
            switch (step.id) {
              case "upload-book":
                return {
                  ...step,
                  completed: Array.isArray(books) && books.length > 0
                }
              case "analyze-content":
                return {
                  ...step,
                  completed:
                    Array.isArray(books) &&
                    books.some(
                      (book: { analysisStatus?: string }) =>
                        book.analysisStatus === "completed"
                    )
                }
              case "generate-content":
                return {
                  ...step,
                  completed: Array.isArray(content) && content.length > 0
                }
              case "connect-accounts":
                return {
                  ...step,
                  completed: Array.isArray(accounts) && accounts.length > 0
                }
              case "view-analytics":
                return {
                  ...step,
                  completed:
                    Array.isArray(content) &&
                    content.some(
                      (item: { status?: string }) => item.status === "published"
                    )
                }
              default:
                return step
            }
          })
        )
      } catch (error) {
        console.error("Error checking onboarding progress:", error)
      }
    }

    checkStepCompletion()
  }, [])

  const completedSteps = steps.filter(step => step.completed).length
  const progress = (completedSteps / steps.length) * 100

  const nextIncompleteStep = steps.find(step => !step.completed)
  const currentStepIndex = nextIncompleteStep
    ? steps.findIndex(step => step.id === nextIncompleteStep.id)
    : 0

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">
            Welcome to Book Social Content Analyzer!
          </CardTitle>
          <CardDescription>
            Get started with these simple steps to create engaging social media
            content from your books
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onCloseAction}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">
              {completedSteps} of {steps.length} completed
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current Step Highlight */}
        {nextIncompleteStep && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                    <nextIncompleteStep.icon className="text-primary h-5 w-5" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium">
                    {nextIncompleteStep.title}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {nextIncompleteStep.description}
                  </p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href={nextIncompleteStep.href}>
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Steps List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">All Steps</h4>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center space-x-3 rounded-lg border p-3 transition-colors ${
                  step.completed
                    ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                    : index === currentStepIndex
                      ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
                      : "bg-muted/30 border-muted"
                }`}
              >
                <div className="flex-shrink-0">
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <step.icon
                      className={`h-5 w-5 ${
                        index === currentStepIndex
                          ? "text-blue-600"
                          : "text-muted-foreground"
                      }`}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-sm font-medium ${
                        step.completed
                          ? "text-green-900 dark:text-green-100"
                          : ""
                      }`}
                    >
                      {step.title}
                    </span>
                    {step.completed && (
                      <Badge variant="secondary" className="text-xs">
                        Complete
                      </Badge>
                    )}
                    {index === currentStepIndex && !step.completed && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p
                    className={`mt-1 text-xs ${
                      step.completed
                        ? "text-green-700 dark:text-green-300"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
                {!step.completed && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={step.href}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Completion Message */}
        {completedSteps === steps.length && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
            <CardContent className="p-4 text-center">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-600" />
              <h3 className="font-medium text-green-900 dark:text-green-100">
                Congratulations! 🎉
              </h3>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                You've completed the onboarding process. You're ready to create
                amazing social media content from your books!
              </p>
              <Button onClick={onCloseAction} size="sm" className="mt-3">
                Continue to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
