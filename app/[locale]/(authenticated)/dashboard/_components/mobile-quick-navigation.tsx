/**
 * MobileQuickNavigation Component
 * Mobile-specific quick navigation extracted from DashboardOverview
 */
"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Edit3, BarChart3, Settings } from "lucide-react"

export default function MobileQuickNavigation() {
  return (
    <div className="block sm:hidden">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              asChild
              variant="ghost"
              className="h-auto justify-start p-3"
            >
              <Link href="/dashboard/books">
                <BookOpen className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Books</div>
                  <div className="text-muted-foreground text-xs">
                    Library & Upload
                  </div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              className="h-auto justify-start p-3"
            >
              <Link href="/dashboard/content">
                <Edit3 className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Content</div>
                  <div className="text-muted-foreground text-xs">
                    Manage & Generate
                  </div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              className="h-auto justify-start p-3"
            >
              <Link href="/dashboard/analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Analytics</div>
                  <div className="text-muted-foreground text-xs">
                    Performance
                  </div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              className="h-auto justify-start p-3"
            >
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Settings</div>
                  <div className="text-muted-foreground text-xs">
                    Accounts & Config
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
