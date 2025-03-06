// lib/contexts/download-context.tsx
"use client"

import React, { createContext, useContext, useState, useEffect, useRef } from "react"
import type { Download } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"

// Storage keys
const COMPLETED_DOWNLOADS_KEY = "completed_downloads"
const DOWNLOAD_HISTORY_KEY = "download_history"

interface DownloadContextType {
  // Active downloads
  activeDownloads: Download[]
  
  // Completed downloads (sessionStorage)
  completedDownloads: Download[]
  
  // Download history (localStorage)
  downloadHistory: Download[]
  
  // UI state for download management component
  minimizedDownloads: Download[]
  activeDownload: Download | null
  
  // Actions
  minimizeDownload: (id: string) => void
  restoreDownload: (id: string) => void
  removeDownload: (id: string) => void
  clearHistory: () => void
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined)

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const notifiedDownloads = useRef(new Set<string>())
  
  // Main download states
  const [activeDownloads, setActiveDownloads] = useState<Download[]>([])
  const [completedDownloads, setCompletedDownloads] = useState<Download[]>([])
  const [downloadHistory, setDownloadHistory] = useState<Download[]>([])
  
  // UI state for download management
  const [minimizedDownloads, setMinimizedDownloads] = useState<Download[]>([])
  const [activeDownload, setActiveDownload] = useState<Download | null>(null)

  // Initialize data from storage on app load
  useEffect(() => {
    // Load completed downloads from sessionStorage
    try {
      const storedCompletedDownloads = sessionStorage.getItem(COMPLETED_DOWNLOADS_KEY)
      if (storedCompletedDownloads) {
        setCompletedDownloads(JSON.parse(storedCompletedDownloads))
      }
    } catch (error) {
      console.error("Failed to load completed downloads from sessionStorage:", error)
    }

    // Load history from localStorage
    try {
      const storedHistory = localStorage.getItem(DOWNLOAD_HISTORY_KEY)
      if (storedHistory) {
        setDownloadHistory(JSON.parse(storedHistory))
      }
    } catch (error) {
      console.error("Failed to load download history from localStorage:", error)
    }
  }, [])

  // Save to storage when state changes
  useEffect(() => {
    // Save completed downloads to sessionStorage
    if (completedDownloads.length > 0) {
      try {
        sessionStorage.setItem(COMPLETED_DOWNLOADS_KEY, JSON.stringify(completedDownloads))
      } catch (error) {
        console.error("Failed to save completed downloads to sessionStorage:", error)
      }
    }
  }, [completedDownloads])

  useEffect(() => {
    // Save history to localStorage
    if (downloadHistory.length > 0) {
      try {
        localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(downloadHistory))
      } catch (error) {
        console.error("Failed to save download history to localStorage:", error)
      }
    }
  }, [downloadHistory])

  // Set up event listeners for download events
  useEffect(() => {
    // Add listener for new downloads
    const newDownloadListener = (downloadData: Download) => {
      setActiveDownloads((prev) => [...prev, downloadData])
      setActiveDownload(downloadData)
    }

    const progressListener = (downloadId: string, progress: number) => {
      setActiveDownloads((prev) =>
        prev.map((download) =>
          download.id === downloadId ? { ...download, progress } : download
        )
      )
      
      // Also update minimized downloads
      setMinimizedDownloads((prev) => 
        prev.map((download) =>
          download.id === downloadId ? { ...download, progress } : download
        )
      )
      
      // Update active download if this is the active one
      setActiveDownload((prev) => 
        prev?.id === downloadId ? { ...prev, progress } : prev
      )
    }

    const phaseChangeListener = (downloadId: string, phase: string) => {
      setActiveDownloads((prev) =>
        prev.map((download) =>
          download.id === downloadId ? { ...download, phase } : download
        )
      )
    }

    const completeListener = (result: Download) => {
      if (notifiedDownloads.current.has(result.id)) {
        console.log("Already notified for download:", result.id);
        return;
      }
      
      notifiedDownloads.current.add(result.id);
      
      toast({
        title: "Download Complete",
        description: `${result.title || 'Video'} has been downloaded successfully.`,
        variant: "success",
        duration: 5000,
      });
      
      // Add to completed downloads (sessionStorage)
      setCompletedDownloads((prev) => {
        const exists = prev.some(download => download.id === result.id);
        if (exists) {
          return prev;
        }
        return [...prev, result];
      });
      
      // Also add to history (localStorage)
      const historyItem = {
        ...result,
        completedAt: new Date().toISOString()
      };
      
      setDownloadHistory((prev) => {
        const exists = prev.some(download => download.id === result.id);
        if (exists) {
          return prev.map(item => 
            item.id === result.id ? historyItem : item
          );
        }
        return [...prev, historyItem];
      });
      
      // Remove from active downloads
      setActiveDownloads((prev) => prev.filter((download) => download.id !== result.id));
      
      // Remove from minimized if present
      setMinimizedDownloads((prev) => prev.filter((download) => download.id !== result.id));
      
      // Clear active download if this was the active one
      if (activeDownload?.id === result.id) {
        setActiveDownload(null);
      }
    };

    const errorListener = (downloadId: string, error: string) => {
      // Show notification for error
      toast({
        title: "Download Failed",
        description: error || "An error occurred during download.",
        variant: "destructive",
        duration: 5000,
      })
      
      // Update active downloads
      setActiveDownloads((prev) => {
        // Find the download that failed
        const failedDownload = prev.find(d => d.id === downloadId);
        
        if (failedDownload) {
          // Add to history with error status
          const historyItem = {
            ...failedDownload,
            status: "error",
            error: error || "Unknown error",
            completedAt: new Date().toISOString()
          };
          
          setDownloadHistory(prevHistory => {
            const exists = prevHistory.some(download => download.id === downloadId);
            if (exists) {
              return prevHistory.map(item => 
                item.id === downloadId ? historyItem : item
              );
            }
            return [...prevHistory, historyItem];
          });
        }
        
        return prev.map((download) =>
          download.id === downloadId ? { ...download, status: "error", error } : download
        );
      });
    }

    // Fetch existing downloads on mount
    const fetchExistingDownloads = async () => {
      try {
        const downloads = await window.api.getActiveDownloads()
        setActiveDownloads(downloads)
      } catch (error) {
        console.error("Failed to fetch active downloads:", error)
      }
    }

    fetchExistingDownloads()

    // Register event listeners
    window.api.on("new-download", newDownloadListener)
    window.api.on("download-progress", progressListener)
    window.api.on("phase-change", phaseChangeListener)
    window.api.on("download-complete", completeListener)
    window.api.on("download-error", errorListener)

    return () => {
      // Clean up event listeners
      window.api.off("new-download", newDownloadListener)
      window.api.off("download-progress", progressListener)
      window.api.off("phase-change", phaseChangeListener)
      window.api.off("download-complete", completeListener)
      window.api.off("download-error", errorListener)
    }
  }, [toast, activeDownload])

  // UI actions for download management
  const minimizeDownload = (id: string) => {
    const download = activeDownloads.find((d) => d.id === id)
    if (download && !minimizedDownloads.some((d) => d.id === id)) {
      setMinimizedDownloads((prev) => [...prev, download])
    }
    if (activeDownload?.id === id) {
      setActiveDownload(null)
    }
  }

  const restoreDownload = (id: string) => {
    const download = activeDownloads.find((d) => d.id === id)
    if (download) {
      setActiveDownload(download)
      setMinimizedDownloads((prev) => prev.filter((d) => d.id !== id))
    }
  }

  const removeDownload = (id: string) => {
    setActiveDownloads((prev) => prev.filter((d) => d.id !== id))
    if (activeDownload?.id === id) {
      setActiveDownload(null)
    }
    setMinimizedDownloads((prev) => prev.filter((d) => d.id !== id))
  }
  
  // Function to clear history
  const clearHistory = () => {
    setDownloadHistory([]);
    localStorage.removeItem(DOWNLOAD_HISTORY_KEY);
    toast({
      title: "History Cleared",
      description: "Your download history has been cleared.",
      duration: 3000,
    });
  };

  const value = {
    activeDownloads,
    completedDownloads,
    downloadHistory,
    minimizedDownloads,
    activeDownload,
    minimizeDownload,
    restoreDownload,
    removeDownload,
    clearHistory
  }

  return <DownloadContext.Provider value={value}>{children}</DownloadContext.Provider>
}

// Create a hook to use the download context
export function useDownloads() {
  const context = useContext(DownloadContext)
  if (context === undefined) {
    throw new Error("useDownloads must be used within a DownloadProvider")
  }
  return context
}