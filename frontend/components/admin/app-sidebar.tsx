"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Sprout,
  Users,
  Package,
  Settings2,
  ShoppingCart,
  Tractor,
  BookOpen,
} from "lucide-react"

import { NavMain } from "@/components/admin/nav-main"
import { NavProjects } from "@/components/admin/nav-projects"
import { NavUser } from "@/components/admin/nav-user"
import { TeamSwitcher } from "@/components/admin/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

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
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        {
          title: "Ringkasan",
          url: "/admin",
        },
        {
          title: "Aktivitas Terbaru",
          url: "/admin",
        },
      ],
    },
    {
      title: "Kelompok Tani",
      url: "/admin",
      icon: Sprout,
      items: [
        {
          title: "Semua Kelompok",
          url: "/admin",
        },
        {
          title: "Tambah Kelompok",
          url: "/admin",
        },
      ],
    },
    {
      title: "Pengguna",
      url: "/admin",
      icon: Users,
      items: [
        {
          title: "Petani",
          url: "/admin",
        },
        {
          title: "Pembeli",
          url: "/admin",
        },
        {
          title: "Pengurus",
          url: "/admin",
        },
      ],
    },
    {
      title: "Produk",
      url: "/admin",
      icon: Package,
      items: [
        {
          title: "Katalog Komoditas",
          url: "/admin",
        },
        {
          title: "Tambah Produk",
          url: "/admin",
        },
      ],
    },
    {
      title: "Pengaturan",
      url: "/admin",
      icon: Settings2,
      items: [
        {
          title: "Umum",
          url: "/admin",
        },
        {
          title: "Keamanan",
          url: "/admin",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Toko Online",
      url: "/admin",
      icon: ShoppingCart,
    },
    {
      name: "Sewa Alsintan",
      url: "/admin",
      icon: Tractor,
    },
    {
      name: "Edukasi Tani",
      url: "/admin",
      icon: BookOpen,
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
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
