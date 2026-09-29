"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Sprout,
  Users,
  Package,
  ShoppingCart,
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
          title: "Kategori Komoditas",
          url: "/admin",
        },
        {
          title: "Sewa Alat",
          url: "/admin",
        },
        {
          title: "Kategori Sewa Alat",
          url: "/admin",
        },
      ],
    },
    {
      title: "Transaksi Koperasi",
      url: "/admin",
      icon: ShoppingCart,
      items: [
        {
          title: "Pesanan Masuk",
          url: "/admin",
        },
        {
          title: "Bagi Hasil Petani",
          url: "/admin",
        },
      ],
    },
  ],
}

import { useAdmin } from "@/components/admin/admin-context"
import { Sparkles, Building2 } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

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
  const { activeTab, setActiveTab } = useAdmin();

  const currentUser = {
    name: user?.name || data.user.name,
    email: user?.email || data.user.email,
    avatar: user?.avatarUrl || user?.image || data.user.avatar,
    phone: user?.phone || '',
  };

  const isTickerActive =
    activeTab.group === 'Pengaturan Web' && activeTab.item === 'Teks Berjalan';
  const isLogoActive =
    activeTab.group === 'Pengaturan Web' && activeTab.item === 'Logo Mitra';

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        {/* Menu Utama */}
        <NavMain items={data.navMain} />

        {/* Grup Terpisah dari Menu Utama: Pengaturan Web & Tampilan */}
        <SidebarGroup className="mt-2 pt-2 border-t border-slate-100">
          <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1.5">
            Pengaturan Web
          </SidebarGroupLabel>
          <SidebarMenu className="space-y-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isTickerActive}
                tooltip="Teks Berjalan Landing Page"
                className={
                  isTickerActive
                    ? "bg-emerald-50 text-emerald-800 font-bold border-r-2 border-emerald-600 shadow-2xs hover:bg-emerald-50 hover:text-emerald-900 rounded-xl"
                    : "text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-800 transition rounded-xl"
                }
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('Pengaturan Web', 'Teks Berjalan')}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer w-full text-left"
                >
                  <Sparkles
                    className={
                      isTickerActive
                        ? "w-4 h-4 text-emerald-700 shrink-0"
                        : "w-4 h-4 text-slate-500 group-hover:text-emerald-700 shrink-0 transition"
                    }
                  />
                  <span className="text-xs">Teks Berjalan</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isLogoActive}
                tooltip="Logo Mitra (Didukung Oleh)"
                className={
                  isLogoActive
                    ? "bg-emerald-50 text-emerald-800 font-bold border-r-2 border-emerald-600 shadow-2xs hover:bg-emerald-50 hover:text-emerald-900 rounded-xl"
                    : "text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-800 transition rounded-xl"
                }
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('Pengaturan Web', 'Logo Mitra')}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer w-full text-left"
                >
                  <Building2
                    className={
                      isLogoActive
                        ? "w-4 h-4 text-emerald-700 shrink-0"
                        : "w-4 h-4 text-slate-500 group-hover:text-emerald-700 shrink-0 transition"
                    }
                  />
                  <span className="text-xs">Logo Mitra</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
