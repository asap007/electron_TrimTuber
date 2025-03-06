// app/downloads/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDownToLine, History, Clock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { DownloadManagement } from "@/components/download-management"

export default function DownloadsPage() {
  const [loading, setLoading] = useState(true)
  const [activeDownloads, setActiveDownloads] = useState([])
  const [completedDownloads, setCompletedDownloads] = useState([])

  useEffect(() => {
    // Simulate API loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Add listener for new downloads
    const newDownloadListener = (downloadData) => {
      setActiveDownloads((prev) => [...prev, downloadData])
    }

    const progressListener = (downloadId, progress) => {
      setActiveDownloads((prev) =>
        prev.map((download) =>
          download.id === downloadId ? { ...download, progress } : download
        )
      )
    }

    const phaseChangeListener = (downloadId, phase) => {
      setActiveDownloads((prev) =>
        prev.map((download) =>
          download.id === downloadId ? { ...download, phase } : download
        )
      )
    }

    const completeListener = (result) => {
      if (result.success) {
        setCompletedDownloads((prev) => [...prev, result])
        setActiveDownloads((prev) => prev.filter((download) => download.id !== result.id))
      }
    }

    const errorListener = (downloadId, error) => {
      setActiveDownloads((prev) =>
        prev.map((download) =>
          download.id === downloadId ? { ...download, status: "error", error } : download
        )
      )
    }

    // Fetch existing downloads on mount
    const fetchExistingDownloads = async () => {
      try {
        const downloads = await window.api.getActiveDownloads()
        setActiveDownloads(downloads)
      } catch (error) {
        console.error("Failed to fetch active downloads:", error)
      }
    }

    fetchExistingDownloads()

    // Register event listeners
    window.api.on("new-download", newDownloadListener)
    window.api.on("download-progress", progressListener)
    window.api.on("phase-change", phaseChangeListener)
    window.api.on("download-complete", completeListener)
    window.api.on("download-error", errorListener)

    return () => {
      // Clean up event listeners
      window.api.off("new-download", newDownloadListener)
      window.api.off("download-progress", progressListener)
      window.api.off("phase-change", phaseChangeListener)
      window.api.off("download-complete", completeListener)
      window.api.off("download-error", errorListener)
    }
  }, [])

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="text-primary" />
          <h2 className="text-2xl font-semibold">Downloads</h2>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="active" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Active</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            <span>Completed</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <History className="h-4 w-4" />
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {loading ? (
            <DownloadsSkeleton count={2} />
          ) : activeDownloads.length > 0 ? (
            activeDownloads.map((download) => (
              <div key={download.id}>
                {/* Active download item - Replace with your actual download component */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="h-16 w-28 bg-gray-100 rounded"></div>
                      <div className="flex-1">
                        <h3 className="font-medium">{download.title || "Downloading..."}</h3>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${download.progress || 0}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-sm text-gray-500">
                            {download.phase || "Preparing"}
                          </span>
                          <span className="text-sm font-medium">{download.progress || 0}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          ) : (
            <EmptyState
              title="No active downloads"
              description="You don't have any downloads in progress."
              actionText="Find videos to download"
              actionLink="/"
            />
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {loading ? (
            <DownloadsSkeleton count={3} />
          ) : completedDownloads.length > 0 ? (
            completedDownloads.map((download) => (
              <div key={download.id}>
                {/* Completed download item - Replace with your actual component */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="h-16 w-28 bg-gray-100 rounded"></div>
                      <div className="flex-1">
                        <h3 className="font-medium">{download.title || "Download completed"}</h3>
                        <div className="text-sm text-gray-500 mt-1">
                          {download.fileSize ? `${download.fileSize} • ` : ""}
                          {download.completedAt
                            ? new Date(download.completedAt).toLocaleString()
                            : "Download complete"}
                        </div>
                        <div className="flex mt-2">
                          <Button size="sm" variant="outline" className="mr-2">
                            Open folder
                          </Button>
                          <Button size="sm" variant="outline">
                            Play
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          ) : (
            <EmptyState
              title="No completed downloads"
              description="You haven't completed any downloads yet."
              actionText="Find videos to download"
              actionLink="/"
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loading ? (
            <DownloadsSkeleton count={4} />
          ) : (
            <EmptyState
              title="Download history"
              description="You'll see your download history here."
              actionText="Find videos to download"
              actionLink="/"
            />
          )}
        </TabsContent>
      </Tabs>

      <DownloadManagement
        downloads={activeDownloads}
        minimizedDownloads={[]}
        activeDownload={null}
        onMinimize={() => {}}
        onRestore={() => {}}
        onRemove={() => {}}
        onUpdateProgress={() => {}}
      />
    </div>
  )
}

function EmptyState({ title, description, actionText, actionLink }) {
  return (
    <Card className="flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <ArrowDownToLine className="text-primary h-8 w-8" />
      </div>
      <CardTitle className="text-xl mb-2">{title}</CardTitle>
      <CardDescription className="mb-6">{description}</CardDescription>
      <Button asChild>
        <Link href={actionLink}>{actionText}</Link>
      </Button>
    </Card>
  )
}

function DownloadsSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="w-full">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="h-16 w-28 skeleton rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 skeleton rounded"></div>
                <div className="h-2 w-full skeleton rounded"></div>
                <div className="h-4 w-1/4 skeleton rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}