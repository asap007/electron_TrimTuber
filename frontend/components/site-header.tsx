import type React from "react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export function SiteHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <SidebarTrigger />
        </div>
        <div className="flex items-center justify-between w-full gap-4">
          <div className="w-full max-w-4xl">{children}</div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon">
              <Link href="/downloads">
                <Download className="h-5 w-5" />
                <span className="sr-only">Downloads</span>
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}

