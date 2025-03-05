// app/page.tsx
"use client"

import { useState, useEffect } from "react"
import { VideoGrid } from "@/components/video-grid"
import { FlameIcon as Fire } from "lucide-react"

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const [videos, setVideos] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  // Function to load trending videos
  const loadTrendingVideos = async (pageNum: number) => {
    try {
      setLoading(true)
      const trendingVideos = await window.api.getTrending({ page: pageNum })
      
      if (trendingVideos.length === 0) {
        setHasMore(false)
      } else {
        if (pageNum === 1) {
          setVideos(trendingVideos)
        } else {
          setVideos(prev => [...prev, ...trendingVideos])
        }
        setPage(pageNum + 1)
      }
    } catch (error) {
      console.error("Error fetching trending videos:", error)
    } finally {
      setLoading(false)
    }
  }
  
  // Load initial trending videos
  useEffect(() => {
    loadTrendingVideos(1)
  }, [])
  
  // Setup infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      if (scrollTop + clientHeight >= scrollHeight - 500 && !loading && hasMore) {
        loadTrendingVideos(page)
      }
    }
    
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loading, hasMore, page])
  
  return (
    <div className="container py-8">
      <div className="flex items-center gap-2 mb-6">
        <Fire className="text-red-500" />
        <h2 className="text-2xl font-semibold">Trending Videos</h2>
      </div>
      
      <VideoGrid videos={videos} isLoading={loading && page === 1} />
      
      {loading && page > 1 && (
        <div className="flex justify-center mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  )
}