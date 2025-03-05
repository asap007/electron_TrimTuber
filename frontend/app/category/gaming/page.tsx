"use client"

import { useState, useEffect } from "react"
import { VideoGrid } from "@/components/video-grid"
import { GamepadIcon } from "lucide-react"

export default function GamingPage() {
  const [loading, setLoading] = useState(true)
  const [videos, setVideos] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  // Function to load gaming videos
  const loadGamingVideos = async (pageNum: number) => {
    try {
      setLoading(true)
      const gamingVideos = await window.api.getGaming({ page: pageNum })
      
      if (gamingVideos.length === 0) {
        setHasMore(false)
      } else {
        if (pageNum === 1) {
          setVideos(gamingVideos)
        } else {
          setVideos(prev => [...prev, ...gamingVideos])
        }
        setPage(pageNum + 1)
      }
    } catch (error) {
      console.error("Error fetching gaming videos:", error)
    } finally {
      setLoading(false)
    }
  }
  
  // Load initial gaming videos
  useEffect(() => {
    loadGamingVideos(1)
  }, [])
  
  // Setup infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      if (scrollTop + clientHeight >= scrollHeight - 500 && !loading && hasMore) {
        loadGamingVideos(page)
      }
    }
    
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loading, hasMore, page])
  
  return (
    <div className="container py-8">
      <div className="flex items-center gap-2 mb-6">
        <GamepadIcon className="text-green-500" />
        <h2 className="text-2xl font-semibold">Gaming Videos</h2>
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