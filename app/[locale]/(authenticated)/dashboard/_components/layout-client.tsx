"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar"
import { LanguageSelector } from "@/components/ui/language-selector"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { type Locale } from "@/i18n"
import { AppSidebar } from "./app-sidebar"
import { DashboardProvider } from "./dashboard-context"

type Props = {
  children: React.ReactNode
  userData: {
    name: string
    email: string
    avatar: string
    membership: string
    onboardingCompleted: boolean
  }
  locale: Locale
}

export default function DashboardClientLayout({
  children,
  userData,
  locale
}: Props) {
  const pathname = usePathname()
  const t = useTranslations('breadcrumbs')

  // Read the sidebar state from cookie on initial load
  const getCookieValue = (name: string) => {
    if (typeof document === "undefined") return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(";").shift()
    return null
  }

  const savedState = getCookieValue("sidebar_state")
  const defaultOpen = savedState === null ? true : savedState === "true"

  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean)
    // Remove locale from paths if present
    const normalizedPaths = paths[0] === locale ? paths.slice(1) : paths
    const breadcrumbs: Array<{
      name: string
      href: string
      current?: boolean
    }> = []

    if (normalizedPaths[0] === "dashboard") {
      breadcrumbs.push({ name: "Dashboard", href: `/${locale}/dashboard` })

      if (normalizedPaths[1]) {
        const pageName =
          normalizedPaths[1].charAt(0).toUpperCase() +
          normalizedPaths[1].slice(1)

        if (normalizedPaths[1] === "tracks" && normalizedPaths[2]) {
          // Add Tracks breadcrumb
          breadcrumbs.push({
            name: "Tracks",
            href: `/${locale}/dashboard/tracks`
          })

          // Add specific track breadcrumb
          // For now, we'll use a placeholder. In a real app, you'd fetch the track name
          const trackNames: Record<string, string> = {
            "ai-engineer": "AI Engineer Track",
            "full-stack": "Full Stack Developer Track",
            "data-scientist": "Data Scientist Track"
          }
          const trackName = trackNames[normalizedPaths[2]] || "Track Details"
          breadcrumbs.push({ name: trackName, href: pathname, current: true })
        } else if (normalizedPaths[1] === "courses") {
          breadcrumbs.push({
            name: "Courses",
            href: `/${locale}/dashboard/courses`
          })

          // Handle course detail pages
          if (normalizedPaths[2]) {
            // Format course slug to readable name
            const courseName = normalizedPaths[2]
              .split("-")
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")

            // Check if we're on a section or lesson page
            if (normalizedPaths[3]) {
              // Add course breadcrumb
              breadcrumbs.push({
                name: courseName,
                href: `/${locale}/dashboard/courses/${normalizedPaths[2]}`
              })

              // Add section name (formatted from slug)
              const sectionName = normalizedPaths[3]
                .split("-")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")

              if (normalizedPaths[4]) {
                // We're on a lesson page
                breadcrumbs.push({
                  name: sectionName,
                  href: `/${locale}/dashboard/courses/${normalizedPaths[2]}/${normalizedPaths[3]}`
                })

                // Add lesson name (formatted from slug)
                const lessonName = paths[4]
                  .split("-")
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")
                breadcrumbs.push({
                  name: lessonName,
                  href: pathname,
                  current: true
                })
              } else {
                // We're on a section page
                breadcrumbs.push({
                  name: sectionName,
                  href: pathname,
                  current: true
                })
              }
            } else {
              // Just course detail page
              breadcrumbs.push({
                name: courseName,
                href: pathname,
                current: true
              })
            }
          }
        } else if (paths[1] === "books") {
          breadcrumbs.push({ name: t('books'), href: `/${locale}/dashboard/books` })

          if (paths[2] === "upload") {
            breadcrumbs.push({ name: t('upload'), href: pathname, current: true })
          } else if (paths[2]) {
            breadcrumbs.push({
              name: t('bookDetails'),
              href: pathname,
              current: true
            })
          } else {
            breadcrumbs[breadcrumbs.length - 1].current = true
          }
        } else if (paths[1] === "content") {
          breadcrumbs.push({ name: t('content'), href: `/${locale}/dashboard/content` })

          if (paths[2] === "generate") {
            breadcrumbs.push({
              name: t('generate'),
              href: pathname,
              current: true
            })
          } else if (paths[2]) {
            breadcrumbs.push({
              name: "Content Details",
              href: pathname,
              current: true
            })
          } else {
            breadcrumbs[breadcrumbs.length - 1].current = true
          }
        } else if (paths[1] === "analytics") {
          breadcrumbs.push({ name: "Analytics", href: pathname, current: true })
        } else if (paths[1] === "settings") {
          breadcrumbs.push({ name: "Settings", href: `/${locale}/dashboard/settings` })

          if (paths[2] === "social") {
            breadcrumbs.push({
              name: "Social Accounts",
              href: pathname,
              current: true
            })
          } else if (paths[2]) {
            const settingName =
              paths[2].charAt(0).toUpperCase() + paths[2].slice(1)
            breadcrumbs.push({
              name: settingName,
              href: pathname,
              current: true
            })
          } else {
            breadcrumbs[breadcrumbs.length - 1].current = true
          }
        } else {
          breadcrumbs.push({ name: pageName, href: pathname, current: true })
        }
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <DashboardProvider userData={userData} locale={locale}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar userData={userData} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex flex-1 items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              {breadcrumbs.length > 0 && (
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                      <div
                        key={`${crumb.href}-${index}`}
                        className="flex items-center"
                      >
                        {index > 0 && <BreadcrumbSeparator className="mx-2" />}
                        <BreadcrumbItem>
                          {crumb.current ? (
                            <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href={crumb.href}>
                              {crumb.name}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
            </div>
            {/* Language Selector in the header */}
            <div className="px-4">
              <LanguageSelector />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardProvider>
  )
}
