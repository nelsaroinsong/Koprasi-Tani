'use client';

import React, { useState } from 'react';
import { Bell, Settings } from 'lucide-react';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { AdminBreadcrumb } from '@/components/admin/admin-breadcrumb';
import { AdminProfileModal } from '@/components/admin/admin-profile-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { state, isMobile } = useSidebar();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const adminName = user?.name || 'Achmad Hakim';
  const adminEmail = user?.email || 'admin@sinarpagisejahtera.co.id';

  return (
    <>
      <header className="flex h-13 shrink-0 items-center justify-between gap-3 border-b border-[#F1F3F5] bg-white px-4 sm:px-6 lg:px-8 sticky top-0 z-20">
        {/* Left Section: Mobile/Collapsed Trigger + Breadcrumb (🔲 Overview / Dashboard) */}
        <div className="flex items-center gap-2.5 min-w-0">
          {(isMobile || state === 'collapsed') && (
            <SidebarTrigger className="-ml-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors rounded-lg p-1.5 cursor-pointer shrink-0" />
          )}
          <AdminBreadcrumb />
        </div>

        {/* Right Section: Clean Ghost Bell + Settings Cog matching Reference Image */}
        <div className="flex items-center gap-1.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                title="Pemberitahuan Sistem"
              >
                <Bell className="w-[17px] h-[17px] stroke-[1.8]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-76 rounded-xl p-2.5 shadow-lg border-slate-200 bg-white z-50 text-xs"
            >
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold text-slate-900">Pemberitahuan</span>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Aktif
                </span>
              </div>
              <div className="my-1.5 border-t border-slate-100" />
              <div className="space-y-1">
                <div className="p-2 rounded-lg bg-slate-50/80 text-xs">
                  <div className="font-semibold text-slate-800">Pesanan Masuk Kasir</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Antrean pesanan tunai siap diverifikasi di gudang.
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50/80 text-xs">
                  <div className="font-semibold text-slate-800">Sistem Gudang Normal</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Sinkronisasi data stok panen & sewa alat beroperasi lancar.
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => setIsEditProfileOpen(true)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            title="Pengaturan Akun"
          >
            <Settings className="w-[17px] h-[17px] stroke-[1.8]" />
          </button>
        </div>
      </header>

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
