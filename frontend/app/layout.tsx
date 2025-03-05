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
import { useState, useEffect } from "react"
import type { Download } from "@/lib/types"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [downloads, setDownloads] = useState<Download[]>([])
  const [minimizedDownloads, setMinimizedDownloads] = useState<Download[]>([])
  const [activeDownload, setActiveDownload] = useState<Download | null>(null)

  const addDownload = (download: Download) => {
    setDownloads((prev) => [...prev, download])
    setActiveDownload(download)
  }

  const removeDownload = (id: string) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id))
    if (activeDownload?.id === id) {
      setActiveDownload(null)
    }
    setMinimizedDownloads((prev) => prev.filter((d) => d.id !== id))
  }

  const minimizeDownload = (id: string) => {
    const download = downloads.find((d) => d.id === id)
    if (download && !minimizedDownloads.some((d) => d.id === id)) {
      setMinimizedDownloads((prev) => [...prev, download])
    }
    if (activeDownload?.id === id) {
      setActiveDownload(null)
    }
  }

  const restoreDownload = (id: string) => {
    const download = downloads.find((d) => d.id === id)
    if (download) {
      setActiveDownload(download)
      setMinimizedDownloads((prev) => prev.filter((d) => d.id !== id))
    }
  }

  const updateDownloadProgress = (id: string, progress: number) => {
    setDownloads((prev) => prev.map((d) => (d.id === id ? { ...d, progress } : d)))
    setMinimizedDownloads((prev) => prev.map((d) => (d.id === id ? { ...d, progress } : d)))
    if (activeDownload?.id === id) {
      setActiveDownload((prev) => (prev ? { ...prev, progress } : null))
    }
  }

  // Simulate a download for testing
  useEffect(() => {
    // Comment out in production
    /* 
    const testDownload: Download = {
      id: 'test-1',
      title: 'Test Video Download',
      thumbnail: '/placeholder.svg?height=120&width=220',
      progress: 0,
      status: 'processing'
    };
    addDownload(testDownload);

    const interval = setInterval(() => {
      updateDownloadProgress('test-1', prev => {
        const newProgress = Math.min(prev + 5, 100);
        if (newProgress === 100) {
          clearInterval(interval);
          return 100;
        }
        return newProgress;
      });
    }, 1000);

    return () => clearInterval(interval);
    */
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <SidebarInset>
                <div className="flex flex-col h-screen">
                  <SiteHeader>
                    <HeaderSearchBar />
                  </SiteHeader>
                  <main className="flex-1 overflow-auto">{children}</main>
                  <DownloadManagement
                    downloads={downloads}
                    minimizedDownloads={minimizedDownloads}
                    activeDownload={activeDownload}
                    onMinimize={minimizeDownload}
                    onRestore={restoreDownload}
                    onRemove={removeDownload}
                    onUpdateProgress={updateDownloadProgress}
                  />
                </div>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
