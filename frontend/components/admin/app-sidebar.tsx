"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Sprout,
  Users,
  Package,
} from "lucide-react"

import { NavMain } from "@/components/admin/nav-main"
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
    name: "admin",
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
      // Tanpa dropdown sesuai permintaan pengguna
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
      ],
    },
    {
      title: "Produk dan Layanan",
      url: "/admin",
      icon: Package,
      items: [
        {
          title: "Toko Online",
          url: "/admin",
        },
        {
          title: "Sewa Alat",
          url: "/admin",
        },
      ],
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
  } | null;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const currentUser = {
    name: user?.name || data.user.name,
    email: user?.email || data.user.email,
    avatar: user?.avatarUrl || user?.image || data.user.avatar,
    phone: user?.phone || '',
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
