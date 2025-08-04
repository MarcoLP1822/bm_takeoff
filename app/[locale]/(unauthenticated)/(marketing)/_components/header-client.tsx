"use client"

import { Button } from "@/components/ui/button"
import { SelectCustomer } from "@/db/schema/customers"
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { Menu, Moon, Sun, X, Sparkles } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useEffect, useState } from "react"

interface NavigationItem {
  name: string
  href: string
}

interface HeaderClientProps {
  navigation: NavigationItem[]
  userMembership: SelectCustomer["membership"] | null
}

export function HeaderClient({ navigation, userMembership }: HeaderClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8"
          aria-label="Global"
        >
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="text-xl font-bold">Book Marketing Take Off</span>
            </Link>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              className="text-muted-foreground -m-2.5 inline-flex items-center justify-center rounded-md p-2.5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            {navigation.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className="text-foreground hover:text-muted-foreground text-sm leading-6 font-semibold"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <SignedOut>
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              {userMembership === "pro" ? (
                <Button asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/pricing">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Upgrade
                  </Link>
                </Button>
              )}
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <div className="bg-background/80 supports-[backdrop-filter]:bg-background/60 border-border fixed inset-y-0 right-0 z-50 w-full overflow-y-auto border-l px-6 py-6 backdrop-blur sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="-m-1.5 p-1.5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-xl font-bold">Takeoff</span>
                </Link>
                <button
                  type="button"
                  className="text-muted-foreground -m-2.5 rounded-md p-2.5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-6 flow-root">
                <div className="divide-border -my-6 divide-y">
                  <div className="space-y-2 py-6">
                    {navigation.map(item => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="text-foreground hover:bg-accent hover:text-accent-foreground -mx-3 block rounded-lg px-3 py-2 text-base leading-7 font-semibold"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                  <div className="space-y-3 py-6">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setTheme(theme === "dark" ? "light" : "dark")
                        setMobileMenuOpen(false)
                      }}
                    >
                      {theme === "dark" ? (
                        <Sun className="mr-2 h-4 w-4" />
                      ) : (
                        <Moon className="mr-2 h-4 w-4" />
                      )}
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </Button>
                    <SignedOut>
                      <Button variant="outline" asChild className="w-full">
                        <Link
                          href="/login"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Log in
                        </Link>
                      </Button>
                      <Button asChild className="w-full">
                        <Link
                          href="/signup"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Sign up
                        </Link>
                      </Button>
                    </SignedOut>
                    <SignedIn>
                      {userMembership === "pro" ? (
                        <Button asChild className="w-full">
                          <Link
                            href="/dashboard"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Dashboard
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild className="w-full">
                          <Link
                            href="/pricing"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Upgrade
                          </Link>
                        </Button>
                      )}
                      <div className="flex justify-center">
                        <UserButton afterSignOutUrl="/" />
                      </div>
                    </SignedIn>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
