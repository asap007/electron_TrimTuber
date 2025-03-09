"use client"

import { Home, FlameIcon as Fire, Tag, History, BarChart, Heart, Star, Compass, Clock, Settings, GamepadIcon, ListVideoIcon as live, MusicIcon, Trophy} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import Link from "next/link"
import Image from 'next/image'
import logoImage from '../public/logo.png'
import { usePathname } from "next/navigation"

export function AppSidebar() {
  const pathname = usePathname()

  const categories = [
    { name: "Home", href: "/", icon: Home }
  ]

  const videoCategories = [
    { name: "Music", href: "/category/music", icon: MusicIcon },
    { name: "Gaming", href: "/category/gaming", icon: GamepadIcon },
    { name: "Sports", href: "/category/sports", icon: Trophy }
  ]

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center p-4">
        <div className="flex items-center space-x-2">
          <Image src={logoImage} alt="TrimTuber Logo" width={40} height={40} className="rounded" />
          <h1 className="text-xl font-bold">TrimTuber</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((category) => (
                <SidebarMenuItem key={category.name}>
                  <SidebarMenuButton asChild isActive={pathname === category.href} tooltip={category.name}>
                    <Link href={category.href}>
                      <category.icon className="mr-2 h-5 w-5" />
                      <span>{category.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {videoCategories.map((category) => (
                <SidebarMenuItem key={category.name}>
                  <SidebarMenuButton asChild isActive={pathname === category.href} tooltip={category.name}>
                    <Link href={category.href}>
                      <category.icon className="mr-2 h-5 w-5" />
                      <span>{category.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

