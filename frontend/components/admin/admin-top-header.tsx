'use client';

import React, { useState } from 'react';
import {
  Bell,
  Settings,
  LogOut,
  UserCog,
  ExternalLink,
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
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
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  const adminName = user?.name || 'Achmad Hakim';
  const adminEmail = user?.email || 'admin@sinarpagisejahtera.co.id';
  const adminInitial = (adminName || 'A').charAt(0).toUpperCase();

  return (
    <>
      <header className="flex h-14 sm:h-15 shrink-0 items-center justify-between gap-3 border-b border-[#eaecf0] bg-white/95 backdrop-blur-md px-4 sm:px-6 sticky top-0 z-20">
        {/* Left Section: Sidebar Toggle + Breadcrumb (🔲 Overview / Dashboard) */}
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger className="-ml-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors rounded-xl p-2 cursor-pointer shrink-0" />
          <AdminBreadcrumb />
        </div>

        {/* Right Section: Notification Bell + Settings Cog + User Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Notification Bell with Badge */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
                title="Pemberitahuan Sistem"
              >
                <Bell className="w-4 h-4 text-slate-500" />
                {hasUnreadNotification && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#e11d48] ring-2 ring-white" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 rounded-2xl p-2.5 shadow-xl border-slate-200 bg-white z-50 text-xs"
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-bold text-slate-900">Pemberitahuan Sistem</span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  Admin Aktif
                </span>
              </div>
              <div className="my-1 border-t border-slate-100" />
              <div className="space-y-1 py-1">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="font-semibold text-slate-900">Pesanan Masuk Kasir</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Terdapat pesanan tunai baru menunggu verifikasi di kasir gudang.
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="font-semibold text-slate-900">Sistem Gudang Normal</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Sinkronisasi data stok panen & sewa alsintan beroperasi lancar.
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Cog Icon (Direct Match to Kravio Top-Right Header) */}
          <button
            type="button"
            onClick={() => setIsEditProfileOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
            title="Pengaturan Profil Administrator"
          >
            <Settings className="w-4 h-4 text-slate-500" />
          </button>

          {/* User Profile Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-slate-200 transition cursor-pointer group"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#111827] text-[#D4F63D] font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden shadow-2xs">
                  {user?.avatarUrl || user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl || user.image || ''}
                      alt={adminName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    adminInitial
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-2xl p-1.5 shadow-xl border-slate-200 bg-white z-50 text-xs"
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
                <span>Pengaturan Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open('/toko', '_blank')}
                className="cursor-pointer rounded-lg px-2 py-1.5 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4 text-slate-500" />
                <span>Buka Toko Online</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-slate-100" />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="cursor-pointer rounded-lg px-2 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Akun</span>
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
