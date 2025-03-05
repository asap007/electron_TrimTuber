"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDownToLine, History, Clock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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
            activeDownloads.map((download) => <div key={download.id}>{/* Active download item */}</div>)
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
            completedDownloads.map((download) => <div key={download.id}>{/* Completed download item */}</div>)
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

