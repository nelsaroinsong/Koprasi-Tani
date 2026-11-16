'use client';

import React, { useState, useEffect } from 'react';
import { Package, Tractor, ShoppingCart, Layers, HandCoins } from 'lucide-react';
import { useAdmin } from '@/components/admin/admin-context';

export function DashboardKpiCards() {
  const { setActiveTab } = useAdmin();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalEquipments: 0,
    totalOrders: 0,
    totalCategories: 0,
    totalHasilPetani: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/dashboard-stats')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.success && data.stats) {
          setStats(data.stats);
        }
      })
      .catch((err) => console.error('Error fetching dashboard stats:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const cardItems = [
    {
      title: 'Total Produk',
      value:
        stats.totalProducts > 0
          ? stats.totalProducts.toLocaleString('id-ID')
          : isLoading
          ? '-'
          : '0',
      description: 'Komoditas pertanian aktif di katalog toko koperasi.',
      icon: Package,
      actionLabel: 'Kelola',
      onClick: () => setActiveTab('Produk dan Layanan', 'Toko Online'),
    },
    {
      title: 'Total Alat',
      value:
        stats.totalEquipments > 0
          ? stats.totalEquipments.toLocaleString('id-ID')
          : isLoading
          ? '-'
          : '0',
      description: 'Unit mesin dan alat sewa pertanian aktif.',
      icon: Tractor,
      actionLabel: 'Kelola',
      onClick: () => setActiveTab('Produk dan Layanan', 'Sewa Alat'),
    },
    {
      title: 'Total Pesanan',
      value:
        stats.totalOrders > 0
          ? stats.totalOrders.toLocaleString('id-ID')
          : isLoading
          ? '-'
          : '0',
      description: 'Total transaksi pesanan komoditas masuk.',
      icon: ShoppingCart,
      actionLabel: 'Kelola',
      onClick: () => setActiveTab('Transaksi Koperasi', 'Pesanan Toko'),
    },
    {
      title: 'Total Kategori',
      value:
        stats.totalCategories > 0
          ? stats.totalCategories.toLocaleString('id-ID')
          : isLoading
          ? '-'
          : '0',
      description: 'Klasifikasi kategori produk komoditas dan alat.',
      icon: Layers,
      actionLabel: 'Kelola',
      onClick: () => setActiveTab('Produk dan Layanan', 'Kategori Komoditas'),
    },
    {
      title: 'Total Hasil Petani',
      value:
        stats.totalHasilPetani > 0
          ? stats.totalHasilPetani >= 1000000
            ? `Rp ${(stats.totalHasilPetani / 1000000).toFixed(1)} jt`
            : `Rp ${stats.totalHasilPetani.toLocaleString('id-ID')}`
          : isLoading
          ? '-'
          : 'Rp 0',
      description: 'Akumulasi bagi hasil penjualan komoditas petani.',
      icon: HandCoins,
      actionLabel: 'Kelola',
      onClick: () => setActiveTab('Transaksi Koperasi', 'Bagi Hasil Petani'),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
      {cardItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between min-h-[178px] group"
          >
            {/* Top row: Dark Squircle Icon on Left + Stat Value on Right */}
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-200">
                <Icon className="w-5 h-5 text-white stroke-[1.8]" />
              </div>
              <div className="text-right min-w-0">
                <span
                  className={`block whitespace-nowrap font-bold text-slate-900 tracking-tight tabular-nums ${
                    item.value.length > 6 ? 'text-[17px] sm:text-[19px] mt-1.5' : 'text-[20px] sm:text-[23px]'
                  }`}
                >
                  {item.value}
                </span>
              </div>
            </div>

            {/* Middle row: Title & Description */}
            <div className="mt-3.5 flex-1">
              <h3 className="text-[14.5px] font-semibold text-slate-900 tracking-tight">
                {item.title}
              </h3>
              <p className="text-[12px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Bottom row: Action Button matching Image 1 */}
            <div className="mt-4 pt-1">
              <button
                type="button"
                onClick={item.onClick}
                className="h-7 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11.5px] font-medium text-slate-700 hover:text-slate-900 transition cursor-pointer shadow-2xs self-start flex items-center gap-1"
              >
                <span>{item.actionLabel}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
