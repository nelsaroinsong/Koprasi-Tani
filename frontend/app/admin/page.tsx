'use client';

import React from 'react';
import { useAdmin } from '@/components/admin/admin-context';
import { PetaniDataTable } from '@/components/admin/petani-data-table';
import { PembeliDataTable } from '@/components/admin/pembeli-data-table';
import { TokoOnlineDataTable } from '@/components/admin/toko-data-table';
import { OrdersDataTable } from '@/components/admin/orders-data-table';
import { PayoutsDataTable } from '@/components/admin/payouts-data-table';
import { LogoSettingsPanel } from '@/components/admin/logo-settings-panel';
import { CategoriesDataTable } from '@/components/admin/categories-data-table';
import { EquipmentCategoriesDataTable } from '@/components/admin/equipment-categories-data-table';
import { EquipmentFormPage } from '@/components/admin/equipment-form-page';
import { TokoProductFormPage } from '@/components/admin/toko-product-form-page';
import EquipmentsDataTable from '@/components/admin/equipments-data-table';
import { EquipmentRentalsTable } from '@/components/admin/equipment-rentals-table';
import { useSession } from 'next-auth/react';

export default function AdminPage() {
  const { activeTab, setActiveTab } = useAdmin();
  const { data: session } = useSession();

  const adminUser = {
    name: session?.user?.name || 'Achmad Hakim',
    email: session?.user?.email || 'admin@sinarpagisejahtera.co.id',
    avatar: (session?.user as any)?.avatarUrl || session?.user?.image || '',
    phone: (session?.user as any)?.phone || '',
  };

  // 0. Tampilan Pengaturan Web: Logo Mitra
  if (activeTab.group === 'Pengaturan Web') {
    return <LogoSettingsPanel />;
  }

  // 1. Tampilan Halaman Pengguna: Petani
  if (activeTab.group === 'Pengguna' && activeTab.item === 'Petani') {
    return <PetaniDataTable />;
  }

  // 2. Tampilan Halaman Pengguna: Pembeli
  if (activeTab.group === 'Pengguna' && activeTab.item === 'Pembeli') {
    return <PembeliDataTable />;
  }

  // 3. Tampilan Halaman Produk dan Layanan: Toko Online / Kategori / Sewa Alat
  if (activeTab.group === 'Produk dan Layanan') {
    if (activeTab.item === 'Kategori Komoditas' || activeTab.item === 'Kategori') {
      return <CategoriesDataTable />;
    }

    if (activeTab.item === 'Kategori Sewa Alat' || activeTab.item === 'Kategori Alat') {
      return <EquipmentCategoriesDataTable />;
    }

    if (activeTab.item === 'Tambah Alat') {
      return (
        <EquipmentFormPage
          initialData={activeTab.payload}
          onCancel={() => setActiveTab('Produk dan Layanan', 'Sewa Alat')}
          onSuccess={() => setActiveTab('Produk dan Layanan', 'Sewa Alat')}
        />
      );
    }

    if (activeTab.item === 'Tambah Komoditas') {
      return (
        <TokoProductFormPage
          initialData={activeTab.payload}
          onCancel={() => setActiveTab('Produk dan Layanan', 'Toko Online')}
          onSuccess={() => setActiveTab('Produk dan Layanan', 'Toko Online')}
        />
      );
    }

    if (activeTab.item === 'Sewa Alat') {
      return <EquipmentsDataTable />;
    }

    // Default untuk 'Toko Online'
    return <TokoOnlineDataTable />;
  }

  // 4. Tampilan Halaman Transaksi Koperasi: Pesanan Masuk, Sewa Alat, & Bagi Hasil Petani
  if (activeTab.group === 'Transaksi Koperasi') {
    if (activeTab.item === 'Bagi Hasil Petani') {
      return <PayoutsDataTable />;
    }
    if (activeTab.item === 'Pengajuan Sewa Alat' || activeTab.item === 'Sewa Alat') {
      return <EquipmentRentalsTable />;
    }
    // Default untuk 'Pesanan Masuk'
    return <OrdersDataTable />;
  }

  // 5. Default: Halaman Dashboard Utama (Kravio Style: 3 Metric Cards + Incoming Orders Table)
  return (
    <div className="space-y-5 w-full pb-10">
      {/* Top Greeting matching Kravio Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Halo, {adminUser.name}</span>
          <span className="text-[20px]">👋</span>
        </h1>
        <p className="text-[13px] text-slate-400 mt-0.5">
          Berikut ringkasan terbaru dari interaksi dan transaksi pesanan koperasi Anda.
        </p>
      </div>

      {/* Kravio: 3 Cards on top + Pesanan Masuk in Table underneath */}
      <OrdersDataTable hideCards={false} />
    </div>
  );
}
