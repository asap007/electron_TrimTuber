// components/download-management.tsx
"use client"

import { useState } from "react"
import type { Download } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Maximize2, Minimize2, X, DownloadIcon } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface DownloadManagementProps {
  downloads: Download[]
  minimizedDownloads: Download[]
  activeDownload: Download | null
  onMinimize: (id: string) => void
  onRestore: (id: string) => void
  onRemove: (id: string) => void
  onUpdateProgress: (id: string, progress: number) => void
}

export function DownloadManagement({
  downloads,
  minimizedDownloads,
  activeDownload,
  onMinimize,
  onRestore,
  onRemove,
  onUpdateProgress,
}: DownloadManagementProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  if (minimizedDownloads.length === 0 && !activeDownload) {
    return null
  }

  return (
    <>
      {activeDownload && (
        <div className="fixed bottom-4 right-4 z-50">
          <ActiveDownloadCard download={activeDownload} onMinimize={onMinimize} onRemove={onRemove} />
        </div>
      )}

      {minimizedDownloads.length > 0 && (
        <div className="fixed bottom-4 left-4 z-50">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="default" className="flex items-center gap-2 rounded-full pl-3 pr-4">
                <DownloadIcon className="h-4 w-4" />
                <span>Downloads ({minimizedDownloads.length})</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Downloads</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-4">
                {minimizedDownloads.map((download) => (
                  <MinimizedDownloadCard
                    key={download.id}
                    download={download}
                    onRestore={onRestore}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </>
  )
}

interface ActiveDownloadCardProps {
  download: Download
  onMinimize: (id: string) => void
  onRemove: (id: string) => void
}

function ActiveDownloadCard({ download, onMinimize, onRemove }: ActiveDownloadCardProps) {
  return (
    <Card className="w-80 p-4 shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-12 h-12">
            <img
              src={download.thumbnail || "/placeholder.svg?height=48&width=48"}
              alt={download.title}
              className="w-full h-full object-cover rounded"
            />
          </div>
          <div>
            <h4 className="font-medium line-clamp-1">{download.title}</h4>
            <p className="text-sm text-muted-foreground capitalize">{download.status}</p>
          </div>
        </div>
        <div className="flex">
          <Button variant="ghost" size="icon" onClick={() => onMinimize(download.id)}>
            <Minimize2 className="h-4 w-4" />
            <span className="sr-only">Minimize</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onRemove(download.id)}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>
      <Progress value={Math.round(download.progress)} className="h-2" />
      <div className="mt-2 text-right text-sm text-muted-foreground">{Math.round(download.progress)}%</div>
    </Card>
  )
}

interface MinimizedDownloadCardProps {
  download: Download
  onRestore: (id: string) => void
  onRemove: (id: string) => void
}

function MinimizedDownloadCard({ download, onRestore, onRemove }: MinimizedDownloadCardProps) {
  return (
    <Card className="p-3">
      <div className="flex gap-3 items-center">
        <div className="w-10 h-10 flex-shrink-0">
          <img
            src={download.thumbnail || "/placeholder.svg?height=40&width=40"}
            alt={download.title}
            className="w-full h-full object-cover rounded"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium line-clamp-1">{download.title}</h4>
          <Progress value={Math.round(download.progress)} className="h-1.5 mt-1" />
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRestore(download.id)}>
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="sr-only">Restore</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove(download.id)}>
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Remove</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}