'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Upload, 
  Zap, 
  Users, 
  BarChart3, 
  X,
  ChevronRight,
  FileText,
  Settings,
  HelpCircle,
  Lightbulb,
  Target,
  Rocket
} from 'lucide-react'
import Link from 'next/link'

interface HelpSection {
  id: string
  title: string
  description: string
  icon: React.ElementType
  items: Array<{
    title: string
    description: string
    action?: {
      label: string
      href: string
    }
  }>
}

interface HelpDocumentationProps {
  onCloseAction: () => void
  className?: string
}

export default function HelpDocumentation({ onCloseAction, className }: HelpDocumentationProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the basics of using the Book Social Content Analyzer',
      icon: Rocket,
      items: [
        {
          title: 'Upload Your First Book',
          description: 'Start by uploading a book file (PDF, EPUB, TXT, or DOCX) to begin the analysis process.',
          action: {
            label: 'Upload Book',
            href: '/dashboard/books?action=upload'
          }
        },
        {
          title: 'Understanding Analysis',
          description: 'Our AI analyzes your book to extract themes, quotes, and key insights that work well for social media.',
        },
        {
          title: 'Generate Content',
          description: 'Create platform-specific social media posts based on your book analysis.',
          action: {
            label: 'Generate Content',
            href: '/dashboard/content/generate'
          }
        }
      ]
    },
    {
      id: 'book-management',
      title: 'Book Management',
      description: 'How to manage your book library and analysis',
      icon: BookOpen,
      items: [
        {
          title: 'Supported File Formats',
          description: 'Upload books in PDF, EPUB, TXT, or DOCX format. Maximum file size is 50MB.',
        },
        {
          title: 'Analysis Status',
          description: 'Track the progress of your book analysis. Books can be pending, analyzing, completed, or have errors.',
        },
        {
          title: 'Managing Your Library',
          description: 'View all your uploaded books, check analysis status, and delete books you no longer need.',
          action: {
            label: 'View Library',
            href: '/dashboard/books'
          }
        }
      ]
    },
    {
      id: 'content-creation',
      title: 'Content Creation',
      description: 'Generate and manage social media content',
      icon: Zap,
      items: [
        {
          title: 'Platform-Specific Content',
          description: 'Generate content optimized for Twitter/X, Instagram, LinkedIn, and Facebook with appropriate character limits.',
        },
        {
          title: 'Content Variations',
          description: 'Get multiple variations of each post to choose the one that best fits your style and audience.',
        },
        {
          title: 'Editing and Customization',
          description: 'Edit generated content, add your own touch, and preview how posts will appear on each platform.',
          action: {
            label: 'Manage Content',
            href: '/dashboard/content'
          }
        }
      ]
    },
    {
      id: 'social-media',
      title: 'Social Media Integration',
      description: 'Connect accounts and publish content',
      icon: Users,
      items: [
        {
          title: 'Connecting Accounts',
          description: 'Securely connect your Twitter/X, Instagram, LinkedIn, and Facebook accounts using OAuth.',
          action: {
            label: 'Connect Accounts',
            href: '/dashboard/settings/social'
          }
        },
        {
          title: 'Publishing Content',
          description: 'Publish content immediately or schedule it for later. Track publishing status and handle failures.',
        },
        {
          title: 'Account Management',
          description: 'View connected accounts, check connection status, and reconnect if needed.',
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Performance',
      description: 'Track and analyze your content performance',
      icon: BarChart3,
      items: [
        {
          title: 'Engagement Metrics',
          description: 'Track likes, shares, comments, and impressions across all your published content.',
        },
        {
          title: 'Platform Comparison',
          description: 'Compare performance across different social media platforms to optimize your strategy.',
        },
        {
          title: 'Content Insights',
          description: 'Discover which book themes and content types perform best with your audience.',
          action: {
            label: 'View Analytics',
            href: '/dashboard/analytics'
          }
        }
      ]
    },
    {
      id: 'tips-tricks',
      title: 'Tips & Best Practices',
      description: 'Get the most out of the platform',
      icon: Lightbulb,
      items: [
        {
          title: 'Optimal Book Selection',
          description: 'Books with clear themes, memorable quotes, and engaging content work best for social media generation.',
        },
        {
          title: 'Content Scheduling',
          description: 'Use analytics to determine the best times to post on each platform for maximum engagement.',
        },
        {
          title: 'Engagement Strategy',
          description: 'Mix different types of content: quotes, insights, questions, and discussion starters for better engagement.',
        }
      ]
    }
  ]

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Help & Documentation
          </CardTitle>
          <CardDescription>
            Learn how to make the most of the Book Social Content Analyzer
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onCloseAction}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Tips */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <Target className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Quick Start Tip</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Start by uploading a book with clear themes and memorable quotes. Non-fiction books often work particularly well for generating engaging social media content.
              </p>
            </div>
          </div>
        </div>

        {/* Help Sections */}
        <div className="space-y-4">
          {helpSections.map((section) => (
            <div key={section.id} className="border rounded-lg">
              <button
                onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <section.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <ChevronRight 
                  className={`h-4 w-4 transition-transform ${
                    activeSection === section.id ? 'rotate-90' : ''
                  }`} 
                />
              </button>
              
              {activeSection === section.id && (
                <div className="border-t bg-muted/20">
                  <div className="p-4 space-y-4">
                    {section.items.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                        {item.action && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={item.action.href}>
                              {item.action.label}
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
          <div className="flex items-start space-x-3">
            <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h4 className="font-medium">Need More Help?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                If you can't find what you're looking for, our support team is here to help.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/dashboard/support">
                  Contact Support
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}