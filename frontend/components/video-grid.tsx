import { VideoCard } from "@/components/video-card"

interface Video {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
  viewCount: number
  duration: number
}

interface VideoGridProps {
  videos: Video[]
  isLoading?: boolean
}

export function VideoGrid({ videos, isLoading = false }: VideoGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          className="h-12 w-12 text-muted-foreground mb-4"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
          <line x1="9" x2="9.01" y1="9" y2="9" />
          <line x1="15" x2="15.01" y1="9" y2="9" />
        </svg>
        <p className="text-muted-foreground">No videos found. Try a different search term.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          id={video.id}
          title={video.title}
          thumbnail={video.thumbnail}
          channelTitle={video.channelTitle}
          viewCount={video.viewCount}
          duration={video.duration}
        />
      ))}
    </div>
  )
}

function VideoCardSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden">
      <div className="aspect-video skeleton"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton rounded w-3/4"></div>
        <div className="h-4 skeleton rounded w-1/2"></div>
        <div className="flex justify-between items-center">
          <div className="h-4 skeleton rounded w-1/4"></div>
          <div className="h-8 skeleton rounded w-24"></div>
        </div>
      </div>
    </div>
  )
}

