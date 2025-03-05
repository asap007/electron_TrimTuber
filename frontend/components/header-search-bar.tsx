// components/header-search-bar.tsx
"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export function HeaderSearchBar() {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }
  
  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative flex items-center w-full max-w-4xl">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search videos..."
          className="pl-10 pr-20 py-5 h-10 w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button type="submit" className="absolute right-1" size="sm">
          <span className="hidden sm:inline">Search</span>
          <Search className="sm:hidden h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}