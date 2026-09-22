'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Sprout,
  Package,
  Home,
  Menu,
  X,
  ShieldCheck,
  Bell,
  ChevronRight,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      badge: 'Utama',
    },
    {
      label: 'Kelompok Tani',
      href: '/admin?tab=kelompok-tani',
      icon: Sprout,
      badge: '18 Kelompok',
    },
    {
      label: 'Petani & Anggota',
      href: '/admin?tab=users',
      icon: Users,
      badge: '1.240 Petani',
    },
    {
      label: 'Produk Komoditas',
      href: '/admin?tab=products',
      icon: Package,
      badge: 'Panen',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 flex flex-col md:flex-row font-sans antialiased">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } h-screen`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3 group focus:outline-none">
            <div className="w-10 h-10 rounded-xl bg-forest-accent flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Sprout className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-tight text-slate-900 uppercase block">
                Panel Pengurus
              </span>
              <span className="text-[10px] font-semibold text-forest-700 tracking-wider block">
                KOPERASI SINAR PAGI
              </span>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Menu Links */}
        <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Menu Utama
            </p>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/admin' && pathname === '/admin');

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-forest-50 text-forest-accent border border-forest-200/60 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-forest-accent' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-forest-100 text-forest-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-6 px-3 pb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Akses Cepat
            </p>
          </div>

          <Link
            href="/"
            className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-slate-600 hover:text-forest-accent hover:bg-forest-50/50 transition-all"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>Lihat Website Publik</span>
            <ChevronRight className="w-4 h-4 ml-auto text-slate-300" />
          </Link>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-xl bg-forest-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                Admin Koperasi
              </p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Minahasa Utara</span>
              </div>
            </div>
            <ShieldCheck className="w-4 h-4 text-forest-accent shrink-0" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Admin Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              type="button"
              aria-label="Open Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-400">Koperasi Sinar Pagi Sejahtera</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">Admin Workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>PostgreSQL &amp; Redis Ready</span>
            </div>

            <button
              title="Notifikasi"
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition relative"
              type="button"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-forest-accent" />
            </button>
          </div>
        </header>

        {/* Page Children Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
