"use client"

import {
  Link,
  Settings2,
  User,
  Users,
  BookOpen,
  Edit3,
  BarChart3
} from "lucide-react"
import * as React from "react"
import { useNavigationTranslations } from "@/hooks/use-translations"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from "@/components/ui/sidebar"
import { NavMain } from "../_components/nav-main"
import { NavUser } from "../_components/nav-user"
import { TeamSwitcher } from "../_components/team-switcher"

export function AppSidebar({
  userData,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  userData: {
    name: string
    email: string
    avatar: string
    membership: string
  }
}) {
  const t = useNavigationTranslations()

  const data = {
    user: userData,
    teams: [
      {
        name: "Personal",
        logo: User,
        plan: "Account"
      },
      {
        name: "Team 1",
        logo: Users,
        plan: "Team"
      },
      {
        name: "Team 2",
        logo: Users,
        plan: "Team"
      },
      {
        name: "Team 3",
        logo: Users,
        plan: "Team"
      }
    ],
    navMain: [
      {
        title: t("dashboard"),
        url: "/dashboard",
        icon: BarChart3,
        items: []
      },
      {
        title: t("books"),
        url: "#",
        icon: BookOpen,
        items: [
          {
            title: t("library"),
            url: "/dashboard/books"
          }
        ]
      },
      {
        title: t("content"),
        url: "#",
        icon: Edit3,
        items: [
          {
            title: t("contentManager"),
            url: "/dashboard/content"
          },
          {
            title: t("generateContent"),
            url: "/dashboard/content/generate"
          }
        ]
      },
      {
        title: t("analytics"),
        url: "#",
        icon: BarChart3,
        items: [
          {
            title: t("performance"),
            url: "/dashboard/analytics"
          }
        ]
      },
      {
        title: t("settings"),
        url: "#",
        icon: Settings2,
        items: [
          {
            title: t("general"),
            url: "/dashboard/settings"
          },
          {
            title: t("socialAccounts"),
            url: "/dashboard/settings/social"
          }
        ]
      }
    ]
  }
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
