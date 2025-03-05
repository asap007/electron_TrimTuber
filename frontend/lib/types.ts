export interface Download {
  id: string
  title: string
  thumbnail?: string
  progress: number
  status: "processing" | "downloading" | "finalizing" | "completed" | "error"
  error?: string
  outputPath?: string
}

export interface Video {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
  viewCount: number
  duration: number
}

