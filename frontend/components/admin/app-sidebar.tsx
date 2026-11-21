"use client"

import * as React from "react"
import {
  LayoutGrid,
  Users,
  Package,
  Tractor,
  Tag,
  FolderTree,
  Settings,
  Search,
  ChevronDown,
  ChevronsUpDown,
  PanelLeft,
  LogOut,
  UserCog,
  ExternalLink,
  History,
  FileBarChart2,
} from "lucide-react"

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
  useSidebar,
} from "@/components/ui/sidebar"
import { useAdmin } from "@/components/admin/admin-context"
import { CountBadge, useAdminNotifications, type BadgeKey } from "@/components/admin/admin-notifications"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { signOut } from "next-auth/react"
import { ADMIN_LOGIN_PATH } from "@/lib/admin-routes"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    avatarUrl?: string | null
    phone?: string | null
  } | null
}

/**
 * Renders a child item with the exact Kravio curved tree branch connector (├─ / ╰─)
 */
function TreeBranchItem({
  label,
  isActive,
  isLast,
  onClick,
  badge = 0,
}: {
  label: string
  isActive: boolean
  isLast?: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <div className="relative flex items-center pl-6">
      {/* Vertical continuation line for non-last items */}
      {!isLast && (
        <span
          className="absolute left-[11px] top-0 bottom-0 w-[1.5px] bg-slate-200/90"
          aria-hidden="true"
        />
      )}
      {/* Curved L elbow connector */}
      <span
        className="absolute left-[11px] top-0 h-[18px] w-3 border-l-[1.5px] border-b-[1.5px] border-slate-200/90 rounded-bl-[6px]"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center justify-between gap-2 text-left px-2.5 py-1.5 rounded-lg text-[12.5px] transition-all cursor-pointer ${
          isActive
            ? "bg-white text-slate-900 font-semibold border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/40 font-medium"
        }`}
      >
        <span className="truncate">{label}</span>
        <CountBadge count={badge} />
      </button>
    </div>
  )
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const { activeTab, setActiveTab } = useAdmin()
  const { toggleSidebar, state, isMobile } = useSidebar()
  const isCollapsed = state === "collapsed"
  const { badges, refresh: refreshBadges, markSeen } = useAdminNotifications()
  const transaksiBadge = badges.pesananToko + badges.pesananSewa + badges.bagiHasil
  const keanggotaanBadge = badges.petani + badges.pembeli

  // Menu yang sedang dibuka -> badge-nya dianggap sudah dilihat
  const activeSection: BadgeKey | null =
    activeTab.group === "Pengguna" && activeTab.item === "Petani"
      ? "petani"
      : activeTab.group === "Pengguna" && activeTab.item === "Pembeli"
        ? "pembeli"
        : activeTab.group === "Transaksi Koperasi" && activeTab.item === "Bagi Hasil Petani"
          ? "bagiHasil"
          : activeTab.group === "Transaksi Koperasi" &&
              ["Pesanan Sewa Alat", "Pengajuan Sewa Alat", "Sewa Alat"].includes(activeTab.item)
            ? "pesananSewa"
            : activeTab.group === "Transaksi Koperasi"
              ? "pesananToko"
              : null

  // Membuka / mengklik menu = badge menu itu dianggap sudah dilihat.
  // Item baru yang masuk SAAT halaman terbuka tetap memunculkan badge (klik menunya lagi untuk menghapus).
  React.useEffect(() => {
    if (activeSection) markSeen(activeSection)
    else refreshBadges()
  }, [activeTab, activeSection, markSeen, refreshBadges])

  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Collapsible Menu States (Semua dropdown terbuka secara default saat login ke admin dashboard)
  const [isTransaksiOpen, setIsTransaksiOpen] = React.useState(true)
  const [isKeanggotaanOpen, setIsKeanggotaanOpen] = React.useState(true)
  const [isKatalogOpen, setIsKatalogOpen] = React.useState(true)
  const [isKategoriOpen, setIsKategoriOpen] = React.useState(true)

  // Auto-expand section if activeTab is inside it
  React.useEffect(() => {
    if (activeTab.group === "Pengguna") setIsKeanggotaanOpen(true)
    if (
      activeTab.group === "Produk dan Layanan" &&
      (activeTab.item === "Toko Online" ||
        activeTab.item === "Lokasi Gudang" ||
        activeTab.item === "Tambah Komoditas" ||
        activeTab.item === "Sewa Alat" ||
        activeTab.item === "Tambah Alat")
    ) {
      setIsKatalogOpen(true)
    }
    if (
      activeTab.group === "Produk dan Layanan" &&
      (activeTab.item === "Kategori Komoditas" ||
        activeTab.item === "Kategori Sewa Alat")
    ) {
      setIsKategoriOpen(true)
    }
  }, [activeTab])

  const adminName = user?.name || "Achmad Hakim"
  const adminEmail = user?.email || "achmadhakim@gmail.com"
  const adminInitials = adminName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const isOverview = activeTab.group === "Dashboard" || !activeTab.group

  const searchableMenus = [
    { group: "Dashboard", item: "", label: "Overview / Dashboard" },
    { group: "Transaksi Koperasi", item: "Pesanan Toko", label: "Pesanan Toko" },
    { group: "Transaksi Koperasi", item: "Pesanan Sewa Alat", label: "Pesanan Sewa Alat" },
    { group: "Transaksi Koperasi", item: "Bagi Hasil Petani", label: "Bagi Hasil Petani" },
    { group: "Pengguna", item: "Petani", label: "Petani Mitra" },
    { group: "Pengguna", item: "Pembeli", label: "Pembeli" },
    { group: "Produk dan Layanan", item: "Toko Online", label: "Katalog Komoditas" },
    { group: "Produk dan Layanan", item: "Sewa Alat", label: "Katalog Sewa Alat" },
    { group: "Produk dan Layanan", item: "Kategori Komoditas", label: "Kategori Produk" },
    { group: "Produk dan Layanan", item: "Kategori Sewa Alat", label: "Kategori Sewa Alat" },
    { group: "Pengaturan", item: "Pengaturan Akun", label: "Pengaturan Akun" },
    { group: "Analitik", item: "Laporan Keuangan", label: "Laporan Keuangan" },
    { group: "Analitik", item: "Log Aktivitas", label: "Log Aktivitas Admin" },
  ]

  const filteredMenus = searchQuery.trim()
    ? searchableMenus.filter((m) =>
        m.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <TooltipProvider delayDuration={120}>
      <Sidebar
        collapsible="icon"
        className="bg-[#F8F9FA] border-r border-[#EAECF0] text-slate-800 font-sans select-none"
        {...props}
      >
        {/* 1. Header: Cooperative Logo & Single-Line Brand + Search Bar */}
        <SidebarHeader className="px-3.5 pt-3.5 pb-2 bg-[#F8F9FA] shrink-0">
          {!isCollapsed ? (
            <div className="space-y-3">
              {/* Brand Row */}
              <div className="flex items-center justify-between gap-2 px-0.5">
                <div
                  onClick={() => setActiveTab("Dashboard", "")}
                  className="flex items-center gap-2 cursor-pointer min-w-0"
                >
                  <div className="w-6.5 h-6.5 rounded-lg bg-[#18181B] flex items-center justify-center p-1 shrink-0 shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/landing/koperasi-logo-lime.png"
                      alt="Logo Koperasi"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="truncate font-bold text-slate-900 text-[14px] tracking-tight">
                    Sinar Pagi Sejahtera
                  </span>
                </div>

                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition shrink-0 cursor-pointer"
                  title="Tutup Sidebar"
                >
                  <PanelLeft className="w-4 h-4 stroke-[1.75]" />
                </button>
              </div>

              {/* Search Input Bar (Matching Kravio White Input on Grey Sidebar) */}
              <div className="relative">
                <div className="relative flex items-center bg-white border border-[#E5E7EB] hover:border-slate-300 focus-within:border-slate-400 rounded-lg h-8.5 px-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all">
                  <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search anything"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setIsSearchOpen(true)
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    className="w-full bg-transparent text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 font-medium shrink-0 select-none tracking-tight">
                    ⌘ K
                  </span>
                </div>

                {isSearchOpen && searchQuery && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSearchOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 max-h-60 overflow-y-auto">
                      {filteredMenus.length > 0 ? (
                        filteredMenus.map((menu) => (
                          <button
                            key={menu.label}
                            type="button"
                            onClick={() => {
                              setActiveTab(menu.group, menu.item)
                              setIsSearchOpen(false)
                              setSearchQuery("")
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition flex items-center justify-between cursor-pointer"
                          >
                            <span className="truncate">{menu.label}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-2 py-2.5 text-center text-xs text-slate-400">
                          Tidak ditemukan
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Collapsed Header */
            <div className="flex flex-col items-center gap-2.5 py-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="w-8 h-8 rounded-lg bg-[#18181B] flex items-center justify-center p-1.5 shadow-2xs cursor-pointer hover:scale-105 transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/landing/koperasi-logo-lime.png"
                      alt="Logo Koperasi"
                      className="w-full h-full object-contain"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-semibold text-xs">
                  Sinar Pagi Sejahtera (Buka Sidebar)
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EB] text-slate-400 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-2xs"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Search anything (⌘ K)
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </SidebarHeader>

        {/* 2. Scrollable Navigation Content */}
        <SidebarContent
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 flex flex-col justify-between bg-[#F8F9FA] no-scrollbar [scrollbar-width:none]"
          onWheel={(e) => {
            e.stopPropagation()
          }}
        >
          <div className="space-y-4">
            {/* GROUP 1: MAIN NAVIGATION */}
            <SidebarGroup className="p-0">
              {!isCollapsed && (
                <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 h-6">
                  MAIN NAVIGATION
                </SidebarGroupLabel>
              )}

              <SidebarMenu className="space-y-0.5 mt-0.5">
                {/* 1. Overview (White Elevated Card when Active) */}
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setActiveTab("Dashboard", "")}
                          className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition cursor-pointer ${
                            isOverview
                              ? "bg-white text-slate-900 border border-[#E5E7EB] shadow-2xs"
                              : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
                          }`}
                        >
                          <LayoutGrid className="w-4 h-4 stroke-[1.8]" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium text-xs">
                        Overview
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab("Dashboard", "")}
                      className={`flex items-center gap-2.5 px-2.5 py-2 w-full rounded-lg text-[13px] transition-all cursor-pointer text-left ${
                        isOverview
                          ? "bg-white text-slate-900 font-semibold border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                          : "text-slate-600 hover:bg-slate-200/40 hover:text-slate-900 font-medium"
                      }`}
                    >
                      <LayoutGrid
                        className={`w-4 h-4 shrink-0 stroke-[1.8] ${
                          isOverview ? "text-slate-800" : "text-slate-500"
                        }`}
                      />
                      <span>Overview</span>
                    </button>
                  )}
                </SidebarMenuItem>

                {/* 2. Transaksi (Tickets style with Curved Tree Branch Connectors) */}
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveTab("Transaksi Koperasi", "Pesanan Toko")
                          }
                          className={`relative w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition cursor-pointer ${
                            activeTab.group === "Transaksi Koperasi"
                              ? "bg-white text-slate-900 border border-[#E5E7EB] shadow-2xs"
                              : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
                          }`}
                        >
                          <Tag className="w-4 h-4 stroke-[1.8]" />
                          {transaksiBadge > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#F8F9FA]" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium text-xs">
                        Transaksi
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsTransaksiOpen((prev) => !prev)}
                        className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-200/40 hover:text-slate-900 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Tag className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                          <span>Transaksi</span>
                        </div>
                        {!isTransaksiOpen && <CountBadge count={transaksiBadge} className="ml-auto mr-1.5" />}
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                            isTransaksiOpen ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      </button>

                      {isTransaksiOpen && (
                        <div className="mt-0.5 space-y-0.5">
                          <TreeBranchItem
                            label="Pesanan Toko"
                            isActive={
                              activeTab.group === "Transaksi Koperasi" &&
                              (activeTab.item === "Pesanan Toko" || activeTab.item === "Pesanan Masuk")
                            }
                            badge={badges.pesananToko}
                            onClick={() =>
                              setActiveTab("Transaksi Koperasi", "Pesanan Toko")
                            }
                          />
                          <TreeBranchItem
                            label="Pesanan Sewa Alat"
                            isActive={
                              activeTab.group === "Transaksi Koperasi" &&
                              (activeTab.item === "Pesanan Sewa Alat" ||
                                activeTab.item === "Pengajuan Sewa Alat" ||
                                activeTab.item === "Sewa Alat")
                            }
                            badge={badges.pesananSewa}
                            onClick={() =>
                              setActiveTab(
                                "Transaksi Koperasi",
                                "Pesanan Sewa Alat"
                              )
                            }
                          />
                          <TreeBranchItem
                            label="Bagi Hasil Petani"
                            isLast
                            isActive={
                              activeTab.group === "Transaksi Koperasi" &&
                              activeTab.item === "Bagi Hasil Petani"
                            }
                            badge={badges.bagiHasil}
                            onClick={() =>
                              setActiveTab(
                                "Transaksi Koperasi",
                                "Bagi Hasil Petani"
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </SidebarMenuItem>

                {/* 3. Keanggotaan (Single Parent -> Expands to Petani Mitra & Pembeli) */}
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setActiveTab("Pengguna", "Petani")}
                          className={`relative w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition cursor-pointer ${
                            activeTab.group === "Pengguna"
                              ? "bg-white text-slate-900 border border-[#E5E7EB] shadow-2xs"
                              : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
                          }`}
                        >
                          <Users className="w-4 h-4 stroke-[1.8]" />
                          {keanggotaanBadge > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#F8F9FA]" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium text-xs">
                        Keanggotaan
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsKeanggotaanOpen((prev) => !prev)}
                        className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-200/40 hover:text-slate-900 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                          <span>Keanggotaan</span>
                        </div>
                        {!isKeanggotaanOpen && <CountBadge count={keanggotaanBadge} className="ml-auto mr-1.5" />}
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                            isKeanggotaanOpen ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      </button>

                      {isKeanggotaanOpen && (
                        <div className="mt-0.5 space-y-0.5">
                          <TreeBranchItem
                            label="Petani Mitra"
                            isActive={
                              activeTab.group === "Pengguna" &&
                              activeTab.item === "Petani"
                            }
                            badge={badges.petani}
                            onClick={() => setActiveTab("Pengguna", "Petani")}
                          />
                          <TreeBranchItem
                            label="Pembeli"
                            isLast
                            isActive={
                              activeTab.group === "Pengguna" &&
                              activeTab.item === "Pembeli"
                            }
                            badge={badges.pembeli}
                            onClick={() => setActiveTab("Pengguna", "Pembeli")}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </SidebarMenuItem>

                {/* 4. Katalog (Dropdown / Collapsible with curved branch: Katalog Komoditas & Katalog Sewa Alat) */}
                <SidebarMenuItem>
                  {(() => {
                    const isKomoditasActive =
                      activeTab.group === "Produk dan Layanan" &&
                      (activeTab.item === "Toko Online" ||
                        activeTab.item === "Lokasi Gudang" ||
                        activeTab.item === "Tambah Komoditas")
                    const isSewaAlatActive =
                      activeTab.group === "Produk dan Layanan" &&
                      (activeTab.item === "Sewa Alat" ||
                        activeTab.item === "Tambah Alat")
                    const isKatalogActive = isKomoditasActive || isSewaAlatActive

                    return isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTab(
                                "Produk dan Layanan",
                                isSewaAlatActive ? "Sewa Alat" : "Toko Online"
                              )
                            }
                            className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition cursor-pointer ${
                              isKatalogActive
                                ? "bg-white text-slate-900 border border-[#E5E7EB] shadow-2xs"
                                : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
                            }`}
                          >
                            <Package className="w-4 h-4 stroke-[1.8]" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium text-xs">
                          Katalog
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div>
                        <button
                          type="button"
                          onClick={() => setIsKatalogOpen((prev) => !prev)}
                          className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-200/40 hover:text-slate-900 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Package className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                            <span>Katalog</span>
                          </div>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                              isKatalogOpen ? "rotate-180" : "rotate-0"
                            }`}
                          />
                        </button>

                        {isKatalogOpen && (
                          <div className="mt-0.5 space-y-0.5">
                            <TreeBranchItem
                              label="Katalog Komoditas"
                              isActive={isKomoditasActive}
                              onClick={() =>
                                setActiveTab("Produk dan Layanan", "Toko Online")
                              }
                            />
                            <TreeBranchItem
                              label="Katalog Sewa Alat"
                              isLast
                              isActive={isSewaAlatActive}
                              onClick={() =>
                                setActiveTab("Produk dan Layanan", "Sewa Alat")
                              }
                            />
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            {/* GROUP 2: ANALYTICS & INSIGHTS */}
            <SidebarGroup className="p-0">
              {!isCollapsed && (
                <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 h-6">
                  ANALYTICS & INSIGHTS
                </SidebarGroupLabel>
              )}

              <SidebarMenu className="space-y-0.5 mt-0.5">
                {/* 1. Kategori (Single Parent -> Expands to Kategori Produk & Kategori Sewa Alat) */}
                <SidebarMenuItem>
                  {(() => {
                    const isKategoriActive =
                      activeTab.group === "Produk dan Layanan" &&
                      (activeTab.item === "Kategori Komoditas" ||
                        activeTab.item === "Kategori Sewa Alat")

                    return isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTab(
                                "Produk dan Layanan",
                                "Kategori Komoditas"
                              )
                            }
                            className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition cursor-pointer ${
                              isKategoriActive
                                ? "bg-white text-slate-900 border border-[#E5E7EB] shadow-2xs"
                                : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
                            }`}
                          >
                            <FolderTree className="w-4 h-4 stroke-[1.8]" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium text-xs">
                          Kategori
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div>
                        <button
                          type="button"
                          onClick={() => setIsKategoriOpen((prev) => !prev)}
                          className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-200/40 hover:text-slate-900 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <FolderTree className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                            <span>Kategori</span>
                          </div>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                              isKategoriOpen ? "rotate-180" : "rotate-0"
                            }`}
                          />
                        </button>

                        {isKategoriOpen && (
                          <div className="mt-0.5 space-y-0.5">
                            <TreeBranchItem
                              label="Kategori Produk"
                              isActive={
                                activeTab.group === "Produk dan Layanan" &&
                                activeTab.item === "Kategori Komoditas"
                              }
                              onClick={() =>
                                setActiveTab(
                                  "Produk dan Layanan",
                                  "Kategori Komoditas"
                                )
                              }
                            />
                            <TreeBranchItem
                              label="Kategori Sewa Alat"
                              isLast
                              isActive={
                                activeTab.group === "Produk dan Layanan" &&
                                activeTab.item === "Kategori Sewa Alat"
                              }
                              onClick={() =>
                                setActiveTab(
                                  "Produk dan Layanan",
                                  "Kategori Sewa Alat"
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </SidebarMenuItem>

                {/* 2. Laporan Keuangan */}
                <SidebarMenuItem>
                  {(() => {
                    const isFinanceActive = activeTab.group === "Analitik" && activeTab.item === "Laporan Keuangan"
                    return isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setActiveTab("Analitik", "Laporan Keuangan")}
                            className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition cursor-pointer ${
                              isFinanceActive
                                ? "bg-white text-slate-900 border border-[#E5E7EB] shadow-2xs"
                                : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
                            }`}
                          >
                            <FileBarChart2 className="w-4 h-4 stroke-[1.8]" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium text-xs">
                          Laporan Keuangan
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab("Analitik", "Laporan Keuangan")}
                        className={`flex items-center gap-2.5 px-2.5 py-2 w-full rounded-lg text-[13px] transition-all cursor-pointer text-left ${
                          isFinanceActive
                            ? "bg-white text-slate-900 font-semibold border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                            : "text-slate-600 hover:bg-slate-200/40 hover:text-slate-900 font-medium"
                        }`}
                      >
                        <FileBarChart2 className={`w-4 h-4 shrink-0 stroke-[1.8] ${isFinanceActive ? "text-slate-800" : "text-slate-500"}`} />
                        <span>Laporan Keuangan</span>
                      </button>
                    )
                  })()}
                </SidebarMenuItem>

                {/* 3. Log Aktivitas Admin */}
                <SidebarMenuItem>
                  {(() => {
                    const isAuditActive = activeTab.group === "Analitik" && activeTab.item === "Log Aktivitas"
                    return isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setActiveTab("Analitik", "Log Aktivitas")}
                            className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition cursor-pointer ${
                              isAuditActive
                                ? "bg-white text-slate-900 border border-[#E5E7EB] shadow-2xs"
                                : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
                            }`}
                          >
                            <History className="w-4 h-4 stroke-[1.8]" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium text-xs">
                          Log Aktivitas
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab("Analitik", "Log Aktivitas")}
                        className={`flex items-center gap-2.5 px-2.5 py-2 w-full rounded-lg text-[13px] transition-all cursor-pointer text-left ${
                          isAuditActive
                            ? "bg-white text-slate-900 font-semibold border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                            : "text-slate-600 hover:bg-slate-200/40 hover:text-slate-900 font-medium"
                        }`}
                      >
                        <History className={`w-4 h-4 shrink-0 stroke-[1.8] ${isAuditActive ? "text-slate-800" : "text-slate-500"}`} />
                        <span>Log Aktivitas</span>
                      </button>
                    )
                  })()}
                </SidebarMenuItem>

              </SidebarMenu>
            </SidebarGroup>
          </div>

          {/* GROUP 3: SUPPORT (Anchored at bottom matching Kravio screenshot) */}
          <SidebarGroup className="p-0 pt-4 mt-auto">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 h-6">
                SUPPORT
              </SidebarGroupLabel>
            )}

            <SidebarMenu className="space-y-0.5 mt-0.5">
              <SidebarMenuItem>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setActiveTab("Pengaturan", "Pengaturan Akun")}
                        className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 transition cursor-pointer"
                      >
                        <Settings className="w-4 h-4 stroke-[1.8]" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium text-xs">
                      Pengaturan
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab("Pengaturan", "Pengaturan Akun")}
                    className={`flex items-center gap-2.5 px-2.5 py-2 w-full rounded-lg text-[13px] transition-all cursor-pointer text-left ${
                      activeTab.group === "Pengaturan"
                        ? "bg-white text-slate-900 font-semibold border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                        : "text-slate-600 hover:bg-slate-200/40 hover:text-slate-900 font-medium"
                    }`}
                  >
                    <Settings className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                    <span className="truncate">Pengaturan</span>
                  </button>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {/* 3. Footer: Kravio White User Profile Card with Online Green Dot */}
        <SidebarFooter className="px-3 pb-3 pt-1 bg-[#F8F9FA] shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isCollapsed ? (
                <button
                  type="button"
                  className="relative w-8 h-8 mx-auto rounded-full bg-slate-200/80 text-slate-700 font-semibold text-xs flex items-center justify-center border border-slate-300/80 cursor-pointer hover:ring-2 hover:ring-slate-300 transition"
                  title={`Profil: ${adminName}`}
                >
                  <AdminAvatar src={user?.avatarUrl || user?.image || ""} name={adminName} initials={adminInitials} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full p-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-slate-50/80 transition flex items-center justify-between cursor-pointer text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 rounded-full bg-[#F1F5F9] text-slate-700 font-semibold text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                      <AdminAvatar src={user?.avatarUrl || user?.image || ""} name={adminName} initials={adminInitials} />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-slate-800 truncate leading-tight">
                        {adminName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {adminEmail}
                      </div>
                    </div>
                  </div>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side={isMobile ? "top" : "right"}
              align="end"
              sideOffset={10}
              className="w-60 rounded-xl p-1.5 shadow-lg border-slate-200 bg-white z-50 text-xs"
            >
              <DropdownMenuLabel className="px-2.5 py-1.5 min-w-0">
                <div className="font-semibold text-slate-900 truncate" title={adminName}>{adminName}</div>
                <div className="text-[11px] text-slate-400 font-normal truncate" title={adminEmail}>{adminEmail}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 border-slate-100" />
              <DropdownMenuItem
                onClick={() => setActiveTab("Pengaturan", "Pengaturan Akun")}
                className="cursor-pointer rounded-lg px-2 py-1.5 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
              >
                <UserCog className="w-4 h-4 text-slate-500" />
                <span>Pengaturan Akun</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open("/toko", "_blank")}
                className="cursor-pointer rounded-lg px-2 py-1.5 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4 text-slate-500" />
                <span>Buka Katalog Toko Online</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-slate-100" />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: ADMIN_LOGIN_PATH })}
                className="cursor-pointer rounded-lg px-2 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

    </TooltipProvider>
  )
}

function AdminAvatar({ src, name, initials }: { src: string; name: string; initials: string }) {
  const [failed, setFailed] = React.useState(false)
  if (!src || failed) return <>{initials}</>
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full rounded-full object-cover"
    />
  )
}
