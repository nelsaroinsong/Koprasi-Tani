"use client"

import * as React from "react"
import {
  LayoutGrid,
  Users,
  UserCheck,
  Package,
  Tractor,
  ReceiptText,
  FolderTree,
  SlidersHorizontal,
  Building2,
  HelpCircle,
  Settings,
  Search,
  ChevronDown,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  UserCog,
  Check,
  ExternalLink,
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
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAdmin } from "@/components/admin/admin-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AdminProfileModal } from "@/components/admin/admin-profile-modal"
import { signOut } from "next-auth/react"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    avatarUrl?: string | null
    phone?: string | null
  } | null
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const { activeTab, setActiveTab } = useAdmin()
  const { toggleSidebar, state } = useSidebar()
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false)
  const [isHelpModalOpen, setIsHelpModalOpen] = React.useState(false)
  const [isTransaksiOpen, setIsTransaksiOpen] = React.useState(true)

  const adminName = user?.name || "Achmad Hakim"
  const adminEmail = user?.email || "admin@sinarpagisejahtera.co.id"
  const adminInitial = (adminName || "A").charAt(0).toUpperCase()

  const isOverview = activeTab.group === "Dashboard" || !activeTab.group

  // Quick navigation items for search filter
  const searchableMenus = [
    { group: "Dashboard", item: "", label: "Overview / Ringkasan Dashboard" },
    { group: "Transaksi Koperasi", item: "Pesanan Masuk", label: "Pesanan Masuk (Kasir)" },
    { group: "Transaksi Koperasi", item: "Pengajuan Sewa Alat", label: "Pengajuan Sewa Alsintan" },
    { group: "Transaksi Koperasi", item: "Bagi Hasil Petani", label: "Bagi Hasil & Cash Petani" },
    { group: "Pengguna", item: "Petani", label: "Data Petani Mitra" },
    { group: "Pengguna", item: "Pembeli", label: "Data Pembeli & Pelanggan" },
    { group: "Produk dan Layanan", item: "Toko Online", label: "Katalog Komoditas Online" },
    { group: "Produk dan Layanan", item: "Sewa Alat", label: "Daftar Sewa Alsintan" },
    { group: "Produk dan Layanan", item: "Kategori Komoditas", label: "Kategori Komoditas" },
    { group: "Produk dan Layanan", item: "Kategori Sewa Alat", label: "Kategori Sewa Alsintan" },
    { group: "Pengaturan Web", item: "Logo Mitra", label: "Pengaturan Logo Mitra" },
  ]

  const filteredMenus = searchQuery.trim()
    ? searchableMenus.filter((m) =>
        m.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="bg-white border-r border-[#eaecf0] text-slate-800 font-sans"
        {...props}
      >
        {/* 1. Header: Brand Logo & Title + Search Bar */}
        <SidebarHeader className="p-3.5 space-y-3 border-b border-[#f1f3f5]">
          {/* Brand Row */}
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => setActiveTab("Dashboard", "")}
              className="flex items-center gap-2.5 cursor-pointer group min-w-0"
            >
              {/* Kravio-style Solid Rounded Monogram Badge */}
              <div className="w-8 h-8 rounded-xl bg-[#111827] text-[#D4F63D] flex items-center justify-center font-bold text-sm shrink-0 shadow-xs transition-transform group-hover:scale-105">
                <span className="font-mono tracking-tighter">K</span>
              </div>
              <div className="grid flex-1 text-left leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="truncate font-bold text-slate-900 text-[13px] tracking-tight">
                  Kravio • SPS
                </span>
                <span className="truncate text-[10px] text-slate-400 font-medium">
                  Minahasa Utara
                </span>
              </div>
            </div>

            {/* Sidebar Collapse Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition shrink-0 group-data-[collapsible=icon]:hidden"
              title={state === "expanded" ? "Tutup Sidebar" : "Buka Sidebar"}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input Bar (Matching Kravio Style: Search anything ⌘K) */}
          <div className="relative group-data-[collapsible=icon]:hidden">
            <div className="relative flex items-center bg-[#f8f9fa] border border-[#e5e7eb] hover:border-slate-300 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-800/5 rounded-xl h-9 px-2.5 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsSearchOpen(true)
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs shrink-0 select-none">
                ⌘ K
              </span>
            </div>

            {/* Search Dropdown Results */}
            {isSearchOpen && searchQuery && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSearchOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-98 duration-100 max-h-60 overflow-y-auto">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Hasil Pencarian
                  </div>
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
                        className="w-full px-2 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate">{menu.label}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          {menu.group}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-3 text-center text-xs text-slate-400">
                      Tidak ada menu cocok
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </SidebarHeader>

        {/* 2. Content: Groups & Navigation Items */}
        <SidebarContent className="px-2 py-2 space-y-4">
          {/* GROUP 1: MAIN NAVIGATION */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">
              MAIN NAVIGATION
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5 mt-0.5">
              {/* Overview (Ringkasan) */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isOverview}
                  className={
                    isOverview
                      ? "bg-[#111827] text-white font-semibold rounded-xl hover:bg-[#111827] hover:text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium rounded-xl transition"
                  }
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab("Dashboard", "")}
                    className="flex items-center gap-2.5 px-2.5 py-2 w-full cursor-pointer text-left"
                  >
                    <LayoutGrid
                      className={`w-4 h-4 shrink-0 ${
                        isOverview ? "text-[#D4F63D]" : "text-slate-400"
                      }`}
                    />
                    <span className="text-xs">Overview</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Transaksi Koperasi (Tickets style with Tree Branch connector) */}
              <SidebarMenuItem>
                <div>
                  <button
                    type="button"
                    onClick={() => setIsTransaksiOpen((prev) => !prev)}
                    className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <ReceiptText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Transaksi</span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        isTransaksiOpen ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </button>

                  {/* Exact Tree Branch Lines from Kravio Screenshot */}
                  {isTransaksiOpen && (
                    <div className="relative ml-5 pl-3 border-l border-slate-200 space-y-0.5 my-1">
                      {/* Sub-item 1: Pesanan Masuk */}
                      {(() => {
                        const isActive =
                          activeTab.group === "Transaksi Koperasi" &&
                          activeTab.item === "Pesanan Masuk"
                        return (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTab("Transaksi Koperasi", "Pesanan Masuk")
                            }
                            className={`relative flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs transition cursor-pointer text-left before:absolute before:-left-3 before:top-1/2 before:w-2.5 before:h-[1px] before:bg-slate-200 ${
                              isActive
                                ? "bg-slate-100 text-slate-900 font-semibold"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                            }`}
                          >
                            <span className="truncate">Pesanan Masuk</span>
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded-full shrink-0">
                              12
                            </span>
                          </button>
                        )
                      })()}

                      {/* Sub-item 2: Sewa Alsintan */}
                      {(() => {
                        const isActive =
                          activeTab.group === "Transaksi Koperasi" &&
                          activeTab.item === "Pengajuan Sewa Alat"
                        return (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTab("Transaksi Koperasi", "Pengajuan Sewa Alat")
                            }
                            className={`relative flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs transition cursor-pointer text-left before:absolute before:-left-3 before:top-1/2 before:w-2.5 before:h-[1px] before:bg-slate-200 ${
                              isActive
                                ? "bg-slate-100 text-slate-900 font-semibold"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                            }`}
                          >
                            <span className="truncate">Sewa Alsintan</span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-full shrink-0">
                              3
                            </span>
                          </button>
                        )
                      })()}

                      {/* Sub-item 3: Bagi Hasil Petani */}
                      {(() => {
                        const isActive =
                          activeTab.group === "Transaksi Koperasi" &&
                          activeTab.item === "Bagi Hasil Petani"
                        return (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTab("Transaksi Koperasi", "Bagi Hasil Petani")
                            }
                            className={`relative flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs transition cursor-pointer text-left before:absolute before:-left-3 before:top-1/2 before:w-2.5 before:h-[1px] before:bg-slate-200 ${
                              isActive
                                ? "bg-slate-100 text-slate-900 font-semibold"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                            }`}
                          >
                            <span className="truncate">Bagi Hasil Petani</span>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full shrink-0">
                              Tunai
                            </span>
                          </button>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </SidebarMenuItem>

              {/* Clients: Petani Mitra */}
              {(() => {
                const isActive =
                  activeTab.group === "Pengguna" && activeTab.item === "Petani"
                return (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isActive
                          ? "bg-slate-100 text-slate-900 font-semibold rounded-xl"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium rounded-xl transition"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setActiveTab("Pengguna", "Petani")}
                        className="flex items-center justify-between w-full px-2.5 py-2 cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Users className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-xs truncate">Petani Mitra</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                          Produsen
                        </span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })()}

              {/* Agents: Pembeli & Konsumen */}
              {(() => {
                const isActive =
                  activeTab.group === "Pengguna" && activeTab.item === "Pembeli"
                return (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isActive
                          ? "bg-slate-100 text-slate-900 font-semibold rounded-xl"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium rounded-xl transition"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setActiveTab("Pengguna", "Pembeli")}
                        className="flex items-center justify-between w-full px-2.5 py-2 cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-xs truncate">Pembeli</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                          Konsumen
                        </span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })()}

              {/* Knowledge Base: Katalog Komoditas */}
              {(() => {
                const isActive =
                  activeTab.group === "Produk dan Layanan" &&
                  activeTab.item === "Toko Online"
                return (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isActive
                          ? "bg-slate-100 text-slate-900 font-semibold rounded-xl"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium rounded-xl transition"
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTab("Produk dan Layanan", "Toko Online")
                        }
                        className="flex items-center justify-between w-full px-2.5 py-2 cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Package className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-xs truncate">Katalog Komoditas</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                          24
                        </span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })()}

              {/* Integrations: Sewa Alsintan */}
              {(() => {
                const isActive =
                  activeTab.group === "Produk dan Layanan" &&
                  activeTab.item === "Sewa Alat"
                return (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isActive
                          ? "bg-slate-100 text-slate-900 font-semibold rounded-xl"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium rounded-xl transition"
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTab("Produk dan Layanan", "Sewa Alat")
                        }
                        className="flex items-center justify-between w-full px-2.5 py-2 cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Tractor className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-xs truncate">Sewa Alsintan</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                          8 Unit
                        </span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })()}
            </SidebarMenu>
          </SidebarGroup>

          {/* GROUP 2: ANALYTICS & INSIGHTS (PENGATURAN & KATALOG) */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">
              ANALYTICS & INSIGHTS
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5 mt-0.5">
              {/* Kategori Komoditas */}
              {(() => {
                const isActive =
                  activeTab.group === "Produk dan Layanan" &&
                  activeTab.item === "Kategori Komoditas"
                return (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isActive
                          ? "bg-slate-100 text-slate-900 font-semibold rounded-xl"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium rounded-xl transition"
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTab("Produk dan Layanan", "Kategori Komoditas")
                        }
                        className="flex items-center gap-2.5 px-2.5 py-2 w-full cursor-pointer text-left"
                      >
                        <FolderTree className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs truncate">Kategori Produk</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })()}

              {/* Kategori Sewa Alsintan */}
              {(() => {
                const isActive =
                  activeTab.group === "Produk dan Layanan" &&
                  activeTab.item === "Kategori Sewa Alat"
                return (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isActive
                          ? "bg-slate-100 text-slate-900 font-semibold rounded-xl"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium rounded-xl transition"
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTab("Produk dan Layanan", "Kategori Sewa Alat")
                        }
                        className="flex items-center gap-2.5 px-2.5 py-2 w-full cursor-pointer text-left"
                      >
                        <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs truncate">Kategori Alsintan</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })()}

              {/* Logo Mitra (Didukung Oleh) */}
              {(() => {
                const isActive =
                  activeTab.group === "Pengaturan Web" &&
                  activeTab.item === "Logo Mitra"
                return (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isActive
                          ? "bg-slate-100 text-slate-900 font-semibold rounded-xl"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium rounded-xl transition"
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTab("Pengaturan Web", "Logo Mitra")
                        }
                        className="flex items-center justify-between w-full px-2.5 py-2 cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-xs truncate">Logo Mitra</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                          Mitra
                        </span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })()}
            </SidebarMenu>
          </SidebarGroup>

          {/* GROUP 3: SUPPORT */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">
              SUPPORT
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5 mt-0.5">
              {/* Pusat Bantuan */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium rounded-xl transition"
                >
                  <button
                    type="button"
                    onClick={() => setIsHelpModalOpen(true)}
                    className="flex items-center gap-2.5 px-2.5 py-2 w-full cursor-pointer text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-xs truncate">Bantuan & Panduan</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Settings: Edit Profil Admin */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium rounded-xl transition"
                >
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(true)}
                    className="flex items-center gap-2.5 px-2.5 py-2 w-full cursor-pointer text-left"
                  >
                    <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-xs truncate">Pengaturan Akun</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {/* 3. Footer: Kravio User Profile Card */}
        <SidebarFooter className="p-2 border-t border-[#f1f3f5]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition flex items-center justify-between cursor-pointer group text-left shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#111827] text-[#D4F63D] font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                    {user?.avatarUrl || user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl || user.image || ""}
                        alt={adminName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      adminInitial
                    )}
                  </div>
                  <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                    <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                      {adminName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {adminEmail}
                    </div>
                  </div>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0 group-data-[collapsible=icon]:hidden" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-60 rounded-2xl p-1.5 shadow-xl border-slate-200 bg-white z-50 text-xs"
            >
              <DropdownMenuLabel className="px-2.5 py-1.5">
                <div className="font-bold text-slate-900">{adminName}</div>
                <div className="text-[10px] text-slate-400 font-normal">{adminEmail}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 border-slate-100" />
              <DropdownMenuItem
                onClick={() => setIsEditProfileOpen(true)}
                className="cursor-pointer rounded-lg px-2 py-1.5 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
              >
                <UserCog className="w-4 h-4 text-slate-500" />
                <span>Edit Profil Administrator</span>
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
                onClick={() => signOut({ callbackUrl: "/login" })}
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

      {/* Admin Profile Modal */}
      <AdminProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={{
          name: adminName,
          email: adminEmail,
          avatar: user?.avatarUrl || user?.image || "",
          phone: user?.phone || "",
        }}
        onUserUpdated={() => {}}
      />

      {/* Help & Operational Guide Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#111827] text-[#D4F63D] flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Panduan Pengurus Koperasi
                </h3>
                <p className="text-xs text-slate-500">
                  Sinar Pagi Sejahtera • Minahasa Utara
                </p>
              </div>
            </div>
            <div className="space-y-2.5 text-xs text-slate-600 my-4 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <p>
                <strong>1. Verifikasi Pesanan Kasir:</strong> Pembeli tunai akan
                mengambil barang di gudang. Cocokkan ID pesanan sebelum serah terima
                komoditas fisik.
              </p>
              <p>
                <strong>2. Bagi Hasil Petani:</strong> Petani berhak menerima uang tunai
                di kantor/gudang setelah hasil panen terjual.
              </p>
              <p>
                <strong>3. Bantuan IT:</strong> Hubungi admin sistem jika terdapat
                kendala sinkronisasi data komoditas atau database.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsHelpModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#111827] hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
            >
              Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </>
  )
}
