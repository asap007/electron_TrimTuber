// app/search/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { VideoGrid } from "@/components/video-grid"
import { SearchIcon } from "lucide-react"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  
  const [loading, setLoading] = useState(true)
  const [videos, setVideos] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Function to load search results
  const loadSearchResults = async (pageNum: number) => {
    if (!query) return
    
    try {
      setLoading(true)
      const searchResults = await window.api.searchVideos({ 
        query: query, 
        page: pageNum 
      })
      
      if (searchResults.length === 0) {
        setHasMore(false)
      } else {
        if (pageNum === 1) {
          setVideos(searchResults)
        } else {
          setVideos(prev => [...prev, ...searchResults])
        }
        setPage(pageNum + 1)
      }
    } catch (error) {
      console.error("Error fetching search results:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load initial search results when query changes
  useEffect(() => {
    setVideos([])
    setPage(1)
    setHasMore(true)
    loadSearchResults(1)
  }, [query])

  // Setup infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      if (scrollTop + clientHeight >= scrollHeight - 500 && !loading && hasMore) {
        loadSearchResults(page)
      }
    }
    
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loading, hasMore, page, query])

  return (
    <div className="container py-8">
      <div className="flex items-center gap-2 mb-6">
        <SearchIcon className="text-primary" />
        <h2 className="text-2xl font-semibold">
          {query ? `Search results for "${query}"` : "Search"}
        </h2>
      </div>
      
      {query ? (
        <>
          <VideoGrid videos={videos} isLoading={loading && page === 1} />
          
          {videos.length === 0 && !loading && (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No videos found for "{query}"</p>
            </div>
          )}
          
          {loading && page > 1 && (
            <div className="flex justify-center mt-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Enter a search term to find videos</p>
        </div>
      )}
    </div>
  )
}