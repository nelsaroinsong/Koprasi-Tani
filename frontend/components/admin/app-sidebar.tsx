"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Sprout,
  Users,
  Package,
  ShoppingCart,
  Search,
  Sparkles,
  Building2,
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { useAdmin } from "@/components/admin/admin-context"

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
      badge: "Utama",
    },
    {
      title: "Pengguna",
      url: "/admin",
      icon: Users,
      badge: "Mitra",
      items: [
        {
          title: "Petani",
          url: "/admin",
          badge: "Produsen",
        },
        {
          title: "Pembeli",
          url: "/admin",
          badge: "Konsumen",
        },
      ],
    },
    {
      title: "Produk dan Layanan",
      url: "/admin",
      icon: Package,
      badge: "Katalog",
      items: [
        {
          title: "Toko Online",
          url: "/admin",
          badge: "24",
        },
        {
          title: "Kategori Komoditas",
          url: "/admin",
        },
        {
          title: "Sewa Alat",
          url: "/admin",
          badge: "8",
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
      badge: "Kasir",
      items: [
        {
          title: "Pesanan Masuk",
          url: "/admin",
          badge: "12",
        },
        {
          title: "Pengajuan Sewa Alat",
          url: "/admin",
          badge: "3",
        },
        {
          title: "Bagi Hasil Petani",
          url: "/admin",
          badge: "Tunai",
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
      <SidebarHeader className="p-2 space-y-1">
        <TeamSwitcher teams={data.teams} />
        <div className="px-1 pt-1 pb-1 group-data-[collapsible=icon]:hidden">
          <div className="relative flex items-center bg-[#f4f5f1] border border-[#dce1d6] hover:border-[#b8c4ae] rounded-xl px-2.5 py-1.5 text-xs text-[#526046] transition-colors">
            <Search className="w-3.5 h-3.5 text-[#708063] shrink-0 mr-2" />
            <span className="w-full text-xs text-[#708063] select-none">Cari menu...</span>
            <span className="text-[9px] font-mono text-[#708063] bg-white border border-[#dce1d6] px-1 py-0.5 rounded shadow-2xs shrink-0">⌘K</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Menu Utama */}
        <NavMain items={data.navMain} />

        {/* Grup Terpisah dari Menu Utama: Pengaturan Web & Tampilan */}
        <SidebarGroup className="mt-2 pt-2 border-t border-[#eaede7]">
          <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-[#526046] px-2 py-1.5">
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
                    ? "bg-[#EAEDE7] text-[#1a2610] font-bold shadow-2xs rounded-xl"
                    : "text-[#526046] hover:bg-[#EAEDE7]/60 hover:text-[#1a2610] font-medium transition rounded-xl"
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
                        ? "w-4 h-4 text-[#233414] shrink-0"
                        : "w-4 h-4 text-[#708063] group-hover:text-[#1a2610] shrink-0 transition"
                    }
                  />
                  <span className="text-xs">Teks Berjalan</span>
                  <span className="ml-auto text-[10px] font-semibold text-[#526046] bg-white border border-[#dce1d6] px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                    Tayang
                  </span>
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
                    ? "bg-[#EAEDE7] text-[#1a2610] font-bold shadow-2xs rounded-xl"
                    : "text-[#526046] hover:bg-[#EAEDE7]/60 hover:text-[#1a2610] font-medium transition rounded-xl"
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
                        ? "w-4 h-4 text-[#233414] shrink-0"
                        : "w-4 h-4 text-[#708063] group-hover:text-[#1a2610] shrink-0 transition"
                    }
                  />
                  <span className="text-xs">Logo Mitra</span>
                  <span className="ml-auto text-[10px] font-semibold text-[#526046] bg-white border border-[#dce1d6] px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                    6 Mitra
                  </span>
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
