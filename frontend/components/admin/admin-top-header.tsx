'use client';

import React from 'react';
import { Bell, Settings, ShoppingBag, Tractor, UserPlus, AlertCircle, CheckCheck } from 'lucide-react';
import { useAdminNotifications, type AdminNotificationItem } from '@/components/admin/admin-notifications';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { AdminBreadcrumb } from '@/components/admin/admin-breadcrumb';
import { useAdmin } from '@/components/admin/admin-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  const { setActiveTab } = useAdmin();


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
          <NotificationBell />

          <button
            type="button"
            onClick={() => setActiveTab('Pengaturan', 'Pengaturan Akun')}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            title="Pengaturan Akun"
          >
            <Settings className="w-[17px] h-[17px] stroke-[1.8]" />
          </button>
        </div>
      </header>

    </>
  );
}

const KIND_ICON: Record<AdminNotificationItem['kind'], { icon: React.ElementType; cls: string }> = {
  order: { icon: ShoppingBag, cls: 'bg-emerald-50 text-emerald-700' },
  rental: { icon: Tractor, cls: 'bg-blue-50 text-blue-700' },
  rental_update: { icon: AlertCircle, cls: 'bg-amber-50 text-amber-700' },
  user: { icon: UserPlus, cls: 'bg-violet-50 text-violet-700' },
};

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'kemarin' : `${d} hari lalu`;
}

function NotificationBell() {
  const { setActiveTab } = useAdmin();
  const { items, unreadCount, sewaDetail, pending, loaded, markSeen } = useAdminNotifications();
  const tasks = [
    { n: pending.pesananToko, label: 'pesanan toko baru', group: 'Transaksi Koperasi', item: 'Pesanan Toko' },
    { n: sewaDetail.menunggu, label: 'pengajuan sewa menunggu persetujuan', group: 'Transaksi Koperasi', item: 'Pesanan Sewa Alat' },
    { n: sewaDetail.ambilHariIni, label: 'sewa dijadwalkan diambil hari ini', group: 'Transaksi Koperasi', item: 'Pesanan Sewa Alat' },
    { n: sewaDetail.terlambat, label: 'alat terlambat dikembalikan', group: 'Transaksi Koperasi', item: 'Pesanan Sewa Alat' },
    { n: sewaDetail.refundDp, label: 'DP perlu dikembalikan', group: 'Transaksi Koperasi', item: 'Pesanan Sewa Alat' },
    { n: pending.bagiHasil, label: 'bagi hasil petani belum dicairkan', group: 'Transaksi Koperasi', item: 'Bagi Hasil Petani' },
  ].filter((t) => t.n > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          aria-label={unreadCount ? `Pemberitahuan, ${unreadCount} belum dibaca` : 'Pemberitahuan'}
        >
          <Bell className="w-[17px] h-[17px] stroke-[1.8]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9.5px] font-bold leading-4 text-center tabular-nums ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] max-w-[calc(100vw-24px)] rounded-xl p-0 shadow-lg border-slate-200 bg-white z-50 text-xs overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100">
          <span className="text-[13px] font-semibold text-slate-900">Pemberitahuan</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markSeen('bell')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Tandai dibaca
            </button>
          )}
        </div>

        {tasks.length > 0 && (
          <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/70 space-y-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Perlu tindakan</div>
            {tasks.map((t) => (
              <DropdownMenuItem
                key={t.label}
                onSelect={() => setActiveTab(t.group, t.item)}
                className="flex items-center gap-2 px-1.5 py-1 rounded-md cursor-pointer text-xs text-slate-700"
              >
                <span className="min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-5 text-center tabular-nums">
                  {t.n}
                </span>
                <span>{t.label}</span>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <div className="max-h-[360px] overflow-y-auto py-1">
          {!loaded ? (
            <div className="px-3.5 py-6 text-center text-slate-400">Memuat...</div>
          ) : items.length === 0 ? (
            <div className="px-3.5 py-8 text-center text-slate-400">Belum ada aktivitas dalam 14 hari terakhir.</div>
          ) : (
            items.map((n) => {
              const { icon: Icon, cls } = KIND_ICON[n.kind];
              return (
                <DropdownMenuItem
                  key={n.id}
                  onSelect={() => setActiveTab(n.target.group, n.target.item)}
                  className={`flex items-start gap-2.5 mx-1 px-2.5 py-2 rounded-lg cursor-pointer ${n.unread ? 'bg-blue-50/50' : ''}`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cls}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-xs ${n.unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </span>
                      <span className="text-[10.5px] text-slate-400 shrink-0">{timeAgo(n.at)}</span>
                    </span>
                    <span className="block text-[11px] text-slate-500 truncate mt-0.5">{n.description}</span>
                  </span>
                  {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" aria-label="Belum dibaca" />}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
