'use client';

import React, { useState } from 'react';
import {
  Search,
  Bell,
  ShieldCheck,
  Check,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AdminBreadcrumb } from '@/components/admin/admin-breadcrumb';
import { AdminProfileModal } from '@/components/admin/admin-profile-modal';
import { useAdmin } from '@/components/admin/admin-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from 'next-auth/react';

interface AdminTopHeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
  } | null;
}

export function AdminTopHeader({ user }: AdminTopHeaderProps) {
  const { setActiveTab } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  const adminName = user?.name || 'Administrator Koperasi';
  const adminEmail = user?.email || 'admin@sinarpagisejahtera.co.id';
  const adminInitial = (adminName || 'A').charAt(0).toUpperCase();

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#dce1d6] bg-white/95 backdrop-blur-md px-4 sm:px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-14 sticky top-0 z-20">
        {/* Left Section: Sidebar Toggle + Quick Search Bar + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger className="-ml-1 hover:bg-[#EAEDE7] hover:text-[#233414] text-[#526046] transition-colors rounded-xl p-2 cursor-pointer shrink-0" />
          <Separator orientation="vertical" className="h-4 bg-[#dce1d6] shrink-0 hidden sm:block" />

          {/* Quick Search Pill (Exact Style from Reference Image 1) */}
          <div className="relative hidden md:flex items-center">
            <div className="relative flex items-center bg-[#f4f5f1] border border-[#dce1d6] hover:border-[#b8c4ae] focus-within:border-[#233414] focus-within:ring-2 focus-within:ring-[#233414]/10 rounded-full h-9 px-3 w-56 lg:w-64 transition-all">
              <Search className="w-3.5 h-3.5 text-[#708063] mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Cari menu atau data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full bg-transparent text-xs text-[#1a2610] placeholder:text-[#88967d] focus:outline-none"
              />
              <span className="text-[10px] font-mono text-[#88967d] bg-white border border-[#dce1d6] px-1.5 py-0.5 rounded-md shrink-0 shadow-2xs">
                ⌘K
              </span>
            </div>

            {/* Quick Search Dropdown Results */}
            {isSearchOpen && searchQuery && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSearchOpen(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[#dce1d6] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-98 duration-150">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#708063] px-2.5 py-1">
                    Navigasi Cepat
                  </div>
                  <div className="space-y-0.5">
                    {[
                      { group: 'Dashboard', item: '', label: 'Dashboard Ringkasan' },
                      { group: 'Transaksi Koperasi', item: 'Pesanan Masuk', label: 'Pesanan Masuk (Kasir)' },
                      { group: 'Transaksi Koperasi', item: 'Bagi Hasil Petani', label: 'Bagi Hasil & Cash Petani' },
                      { group: 'Produk dan Layanan', item: 'Toko Online', label: 'Katalog Komoditas' },
                      { group: 'Produk dan Layanan', item: 'Sewa Alat', label: 'Sewa Alsintan' },
                      { group: 'Pengguna', item: 'Petani', label: 'Data Petani Mitra' },
                      { group: 'Pengaturan Web', item: 'Logo Mitra', label: 'Pengaturan Logo Mitra' },
                    ]
                      .filter((m) =>
                        m.label.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((menu) => (
                        <button
                          key={menu.label}
                          type="button"
                          onClick={() => {
                            setActiveTab(menu.group, menu.item);
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-medium text-[#1a2610] hover:bg-[#EAEDE7] transition flex items-center justify-between cursor-pointer"
                        >
                          <span>{menu.label}</span>
                          <span className="text-[10px] text-[#708063]">{menu.group}</span>
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="hidden lg:block">
            <AdminBreadcrumb />
          </div>
        </div>

        {/* Right Section: Notifications + Profile Pill */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Notification Bell with Badge (Matching Reference Image 1) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative w-9 h-9 rounded-full bg-[#f4f5f1] hover:bg-[#EAEDE7] border border-[#dce1d6] text-[#233414] flex items-center justify-center transition cursor-pointer"
                title="Pemberitahuan Sistem"
              >
                <Bell className="w-4 h-4 text-[#526046]" />
                {hasUnreadNotification && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#e11d48] ring-2 ring-white" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 rounded-2xl p-2.5 shadow-xl border-[#dce1d6] bg-white z-50"
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-bold text-[#1a2610]">Pemberitahuan Sistem</span>
                <span className="text-[10px] font-semibold text-[#344d15] bg-[#eef1e8] px-2 py-0.5 rounded-full">
                  Admin Aktif
                </span>
              </div>
              <div className="my-1 border-t border-[#eaede7]" />
              <div className="space-y-1 py-1">
                <div className="p-2 rounded-xl bg-[#fafbf9] border border-[#eaede7] text-xs">
                  <div className="font-semibold text-[#1a2610]">Sistem Gudang Normal</div>
                  <div className="text-[11px] text-[#526046] mt-0.5">
                    Sinkronisasi data stok komoditas dan sewa alsintan berjalan lancar.
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#fafbf9] border border-[#eaede7] text-xs">
                  <div className="font-semibold text-[#1a2610]">Verifikasi Kemitraan</div>
                  <div className="text-[11px] text-[#526046] mt-0.5">
                    Tinjau calon petani binaan baru yang mendaftar di Minahasa Utara.
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Pill (Matching Reference Image 1) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 p-1 sm:pr-3 rounded-full bg-[#f4f5f1] hover:bg-[#EAEDE7] border border-[#dce1d6] transition cursor-pointer group"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#233414] text-[#D4F63D] font-bold text-xs flex items-center justify-center shrink-0 border border-white shadow-2xs overflow-hidden">
                  {user?.avatarUrl || user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl || user.image || ''}
                      alt={adminName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{adminInitial}</span>
                  )}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight min-w-0 max-w-[120px] lg:max-w-[160px]">
                  <span className="text-xs font-bold text-[#1a2610] truncate group-hover:text-[#344d15]">
                    {adminName}
                  </span>
                  <span className="text-[10px] text-[#708063] truncate">
                    Administrator
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#708063] group-hover:text-[#1a2610] shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 rounded-2xl p-2 shadow-xl border-[#dce1d6] bg-white z-50"
            >
              <DropdownMenuLabel className="p-2 font-normal">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#1a2610] truncate">{adminName}</span>
                  <span className="text-[11px] text-[#526046] truncate">{adminEmail}</span>
                  <span className="text-[10px] font-semibold text-[#344d15] bg-[#eef1e8] px-2 py-0.5 rounded-full mt-1.5 self-start">
                    Administrator Koperasi
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#eaede7]" />
              <DropdownMenuItem
                onClick={() => setIsEditProfileOpen(true)}
                className="text-xs font-medium text-[#1a2610] hover:bg-[#f4f5f1] rounded-xl cursor-pointer"
              >
                Profil & Kredensial Administrator
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open('/toko', '_blank')}
                className="text-xs font-medium text-[#1a2610] hover:bg-[#f4f5f1] rounded-xl cursor-pointer flex items-center justify-between"
              >
                <span>Buka Etalase Toko Publik</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#708063]" />
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#eaede7]" />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/admin-koperasi-sinar-pagi-sejahtera' })}
                className="text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl cursor-pointer"
              >
                Keluar Sesi (Logout)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Profile Edit Modal */}
      <AdminProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={{
          name: adminName,
          email: adminEmail,
          avatar: user?.avatarUrl || user?.image || '',
          phone: user?.phone || '',
        }}
        onUserUpdated={() => {}}
      />
    </>
  );
}
