"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { formatDuration } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, FolderOpen, Download, Film, Music, Clock, Settings, Scissors } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

export default function DownloadPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const videoId = searchParams.get("videoId")
  const title = searchParams.get("title")
  const thumbnail = searchParams.get("thumbnail")
  const duration = Number.parseInt(searchParams.get("duration") || "0")

  const [timeRange, setTimeRange] = useState([0, duration])
  const [outputPath, setOutputPath] = useState("")
  const [format, setFormat] = useState("video")
  const [quality, setQuality] = useState("360p")
  const [showAlert, setShowAlert] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [isDownloading, setIsDownloading] = useState(false)

  const handleSelectFolder = async () => {
    const path = await window.api.selectFolder()
    if (path) {
      setOutputPath(path)
    }
  }

  const handleStartDownload = async () => {
    if (!outputPath) {
      setShowAlert(true)
      return
    }

    setIsDownloading(true)

    const downloadOptions = {
      videoId,
      title,
      thumbnail,
      quality,
      format,
      outputPath,
      startTime: timeRange[0],
      endTime: timeRange[1],
      status: "processing",
      progress: 0,
      phase: "processing",
      id: `download-${Date.now()}` // Generate a unique ID for the download
    }

    try {
      // Start the download without waiting for it to complete
      await window.api.startDownload(downloadOptions)

      // Redirect to the downloads page after a short delay to allow UI update
      // setTimeout(() => router.push("/downloads"), 100)
    } catch (error) {
      console.error("Download error:", error)
      setIsDownloading(false)
    }
  }

  if (!videoId || !title || !thumbnail) {
    return null
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/")}>
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Search
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video Preview Section */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden h-full">
            <div className="relative aspect-video">
              <img
                src={thumbnail || "/placeholder.svg?height=256&width=640&text=Video+Thumbnail"}
                alt={title || "Video thumbnail"}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                {formatDuration(duration)}
              </div>
            </div>
            <CardContent className="p-4">
              <h1 className="text-xl font-bold line-clamp-2 mb-4">{title}</h1>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="text-sm">Duration: {formatDuration(duration)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">ID: {videoId}</div>
                </div>

                <div className="space-y-2">
                  <Label>Selected Portion</Label>
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex justify-between text-sm mb-2">
                      <span>{formatDuration(timeRange[0])}</span>
                      <span>{formatDuration(timeRange[1])}</span>
                    </div>
                    <div className="relative h-2 bg-primary/20 rounded-full">
                      <div
                        className="absolute h-full bg-primary rounded-full"
                        style={{
                          left: `${(timeRange[0] / duration) * 100}%`,
                          width: `${((timeRange[1] - timeRange[0]) / duration) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Download Options Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="basic" className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span>Basic Options</span>
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                    <span>Advanced Options</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-6">
                  {/* Format Selection */}
                  <div className="space-y-3">
                    <Label className="text-base">Format</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant={format === "video" ? "default" : "outline"}
                        className="h-24 flex flex-col items-center justify-center gap-2"
                        onClick={() => setFormat("video")}
                      >
                        <Film className="h-8 w-8" />
                        <span>Video</span>
                      </Button>
                      <Button
                        variant={format === "audio" ? "default" : "outline"}
                        className="h-24 flex flex-col items-center justify-center gap-2"
                        onClick={() => setFormat("audio")}
                      >
                        <Music className="h-8 w-8" />
                        <span>Audio Only</span>
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Quality Selection */}
                  <div className="space-y-3">
                    <Label className="text-base">Quality</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {["highest", "1080p", "720p", "480p", "360p", "240p"].map((q) => (
                        <Button
                          key={q}
                          variant={quality === q ? "default" : "outline"}
                          className="py-2"
                          onClick={() => setQuality(q)}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Timeline Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Video Timeline</Label>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Scissors className="h-4 w-4" />
                        <span>Trim Video</span>
                      </div>
                    </div>
                    <Slider value={timeRange} max={duration} step={1} onValueChange={setTimeRange} />
                    <div className="flex justify-between">
                      <div className="text-sm">
                        Start: <span className="font-medium">{formatDuration(timeRange[0])}</span>
                      </div>
                      <div className="text-sm">
                        End: <span className="font-medium">{formatDuration(timeRange[1])}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-6">
                  {/* Advanced options would go here */}
                  <div className="space-y-3">
                    <Label className="text-base">Output Format</Label>
                    <Select defaultValue="mp4">
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp4">MP4</SelectItem>
                        <SelectItem value="mkv">MKV</SelectItem>
                        <SelectItem value="webm">WebM</SelectItem>
                        <SelectItem value="mp3">MP3 (Audio)</SelectItem>
                        <SelectItem value="m4a">M4A (Audio)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base">Video Codec</Label>
                    <Select defaultValue="h264">
                      <SelectTrigger>
                        <SelectValue placeholder="Select codec" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="h264">H.264</SelectItem>
                        <SelectItem value="h265">H.265 (HEVC)</SelectItem>
                        <SelectItem value="vp9">VP9</SelectItem>
                        <SelectItem value="av1">AV1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base">Audio Codec</Label>
                    <Select defaultValue="aac">
                      <SelectTrigger>
                        <SelectValue placeholder="Select codec" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aac">AAC</SelectItem>
                        <SelectItem value="mp3">MP3</SelectItem>
                        <SelectItem value="opus">Opus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator className="my-6" />

              {/* Output Path */}
              <div className="space-y-3">
                <Label className="text-base">Output Folder</Label>
                <div className="flex gap-2">
                  <Input value={outputPath} readOnly placeholder="Select a folder" className="flex-1" />
                  <Button variant="outline" onClick={handleSelectFolder}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Browse
                  </Button>
                </div>
              </div>

              {/* Download Button */}
              <Button 
                size="lg" 
                onClick={handleStartDownload} 
                className="w-full mt-6"
                disabled={isDownloading}
              >
                <Download className="h-5 w-5 mr-2" />
                {isDownloading ? 'Starting Download...' : 'Download Now'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alert Dialog for missing output path */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Output Folder Required</AlertDialogTitle>
            <AlertDialogDescription>
              Please select an output folder to continue with the download.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Okay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}