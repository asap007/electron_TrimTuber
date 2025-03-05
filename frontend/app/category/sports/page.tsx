"use client"

import { useState, useEffect } from "react"
import { VideoGrid } from "@/components/video-grid"
import { RadioIcon, Trophy } from "lucide-react"

export default function LivePage() {
  const [loading, setLoading] = useState(true)
  const [videos, setVideos] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  // Function to load live videos
  const loadSportVideos = async (pageNum: number) => {
    try {
      setLoading(true)
      const sportVideos = await window.api.getSports({ page: pageNum })
      
      if (sportVideos.length === 0) {
        setHasMore(false)
      } else {
        if (pageNum === 1) {
          setVideos(sportVideos)
        } else {
          setVideos(prev => [...prev, ...sportVideos])
        }
        setPage(pageNum + 1)
      }
    } catch (error) {
      console.error("Error fetching live videos:", error)
    } finally {
      setLoading(false)
    }
  }
  
  // Load initial live videos
  useEffect(() => {
    loadSportVideos(1)
  }, [])
  
  // Setup infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      if (scrollTop + clientHeight >= scrollHeight - 500 && !loading && hasMore) {
        loadSportVideos(page)
      }
    }
    
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loading, hasMore, page])
  
  return (
    <div className="container py-8">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="text-yellow-500" />
        <h2 className="text-2xl font-semibold">Sports Videos</h2>
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