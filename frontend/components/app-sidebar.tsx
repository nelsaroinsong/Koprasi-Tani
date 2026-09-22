"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Sprout,
  Users,
  Settings2,
  Home,
  ShieldCheck,
  Building2,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// Data Sidebar Koperasi Sinar Pagi Sejahtera
const data = {
  user: {
    name: "Lionel Roinsong",
    email: "admin@sinarpagisejahtera.co.id",
    avatar: "",
  },
  teams: [
    {
      name: "Sinar Pagi Sejahtera",
      logo: Sprout,
      plan: "Koperasi Minahasa Utara",
    },
    {
      name: "Dinas Pertanian Minut",
      logo: Building2,
      plan: "Mitra Pembina",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        {
          title: "Ringkasan Statistik",
          url: "/admin",
        },
        {
          title: "Aktivitas Panen",
          url: "/admin",
        },
      ],
    },
    {
      title: "Kelompok Tani",
      url: "/admin?tab=kelompok-tani",
      icon: Sprout,
      items: [
        {
          title: "Daftar Kelompok Tani",
          url: "/admin?tab=kelompok-tani",
        },
        {
          title: "Binaan Likupang & Kauditan",
          url: "/admin?tab=kelompok-tani",
        },
      ],
    },
    {
      title: "Users",
      url: "/admin?tab=users",
      icon: Users,
      items: [
        {
          title: "Petani Anggota",
          url: "/admin?tab=users",
        },
        {
          title: "Pembeli Industri",
          url: "/admin?tab=users",
        },
        {
          title: "Pengurus Koperasi",
          url: "/admin?tab=users",
        },
      ],
    },
    {
      title: "Settings",
      url: "/admin?tab=settings",
      icon: Settings2,
      items: [
        {
          title: "Konfigurasi Koperasi",
          url: "/admin?tab=settings",
        },
        {
          title: "Koneksi Cloudflare R2",
          url: "/admin?tab=settings",
        },
        {
          title: "Keamanan & Hak Akses",
          url: "/admin?tab=settings",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
