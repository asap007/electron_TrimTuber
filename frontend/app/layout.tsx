// app/layout.tsx
"use client"

import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { HeaderSearchBar } from "@/components/header-search-bar"
import { DownloadManagement } from "@/components/download-management"
import { SiteHeader } from "@/components/site-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { DownloadProvider, useDownloads } from "@/lib/contexts/download-context"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DownloadProvider>
            <SidebarProvider>
              <div className="flex min-h-screen w-full">
                <AppSidebar />
                <SidebarInset>
                  <div className="flex flex-col h-screen">
                    <SiteHeader>
                      <HeaderSearchBar />
                    </SiteHeader>
                    <main className="flex-1 overflow-auto">{children}</main>
                    <DownloadManagementWrapper />
                  </div>
                </SidebarInset>
              </div>
            </SidebarProvider>
          </DownloadProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}

// Create a wrapper component to connect DownloadManagement to our context
function DownloadManagementWrapper() {
  const {
    activeDownloads,
    minimizedDownloads,
    activeDownload,
    minimizeDownload,
    restoreDownload,
    removeDownload
  } = useDownloads()

  return (
    <DownloadManagement
      downloads={activeDownloads}
      minimizedDownloads={minimizedDownloads}
      activeDownload={activeDownload}
      onMinimize={minimizeDownload}
      onRestore={restoreDownload}
      onRemove={removeDownload}
    />
  )
}