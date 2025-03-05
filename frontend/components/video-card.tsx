import { formatDuration, formatViews } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Download, Eye } from "lucide-react"

interface VideoCardProps {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
  viewCount: number
  duration: number
}

export function VideoCard({ id, title, thumbnail, channelTitle, viewCount, duration }: VideoCardProps) {
  return (
    <div className="video-card group bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200">
      <div className="relative aspect-video">
        <img
          src={thumbnail || "/placeholder.svg"}
          alt={title}
          className="w-full h-full object-cover transform transition-transform duration-200 group-hover:scale-105"
        />
        <span className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white px-2 py-1 rounded text-xs">
          {formatDuration(duration)}
        </span>
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200"></div>
      </div>
      <div className="p-4 flex flex-col h-[180px]">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary">{title}</h3>
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-xs">{channelTitle.charAt(0)}</span>
          </div>
          <p className="text-muted-foreground text-sm">{channelTitle}</p>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span>{formatViews(viewCount)}</span>
          </div>
          <Button asChild size="sm">
            <Link
              href={`/download?videoId=${id}&title=${encodeURIComponent(title)}&thumbnail=${encodeURIComponent(thumbnail)}&duration=${duration}`}
            >
              <span>Get Video</span>
              <Download className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

