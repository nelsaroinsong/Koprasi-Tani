'use client';

import React from 'react';
import { useAdmin } from '@/components/admin/admin-context';
import { PetaniDataTable } from '@/components/admin/petani-data-table';
import { PembeliDataTable } from '@/components/admin/pembeli-data-table';
import { TokoOnlineDataTable } from '@/components/admin/toko-data-table';
import { OrdersDataTable } from '@/components/admin/orders-data-table';
import { PayoutsDataTable } from '@/components/admin/payouts-data-table';
import { CategoriesDataTable } from '@/components/admin/categories-data-table';
import { EquipmentCategoriesDataTable } from '@/components/admin/equipment-categories-data-table';
import { EquipmentFormPage } from '@/components/admin/equipment-form-page';
import { TokoProductFormPage } from '@/components/admin/toko-product-form-page';
import EquipmentsDataTable from '@/components/admin/equipments-data-table';
import { EquipmentRentalsTable } from '@/components/admin/equipment-rentals-table';
import { DashboardKpiCards } from '@/components/admin/dashboard-kpi-cards';
import { RecentUsersTable } from '@/components/admin/recent-users-table';
import { WarehouseLocationPage } from '@/components/admin/warehouse-location-page';
import { AdminSettingsPage } from '@/components/admin/admin-settings-page';

export default function AdminPage() {
  const { activeTab, setActiveTab } = useAdmin();

  // 0. Halaman Pengaturan Akun Administrator
  if (activeTab.group === 'Pengaturan') {
    return <AdminSettingsPage />;
  }

  // 1. Tampilan Halaman Pengguna: Petani
  if (activeTab.group === 'Pengguna' && activeTab.item === 'Petani') {
    return <PetaniDataTable />;
  }

  // 2. Tampilan Halaman Pengguna: Pembeli
  if (activeTab.group === 'Pengguna' && activeTab.item === 'Pembeli') {
    return <PembeliDataTable />;
  }

  // 3. Tampilan Halaman Produk dan Layanan: Toko Online / Kategori / Sewa Alat / Lokasi Gudang
  if (activeTab.group === 'Produk dan Layanan') {
    if (activeTab.item === 'Lokasi Gudang' || activeTab.item === 'Ubah Lokasi Gudang') {
      return (
        <WarehouseLocationPage
          initialAddress={activeTab.payload?.address}
          onBack={() => setActiveTab('Produk dan Layanan', 'Toko Online')}
        />
      );
    }

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

  // 4. Tampilan Halaman Transaksi Koperasi: Pesanan Toko, Pesanan Sewa Alat, & Bagi Hasil Petani
  if (activeTab.group === 'Transaksi Koperasi') {
    if (activeTab.item === 'Bagi Hasil Petani') {
      return <PayoutsDataTable />;
    }
    if (
      activeTab.item === 'Pesanan Sewa Alat' ||
      activeTab.item === 'Pengajuan Sewa Alat' ||
      activeTab.item === 'Sewa Alat'
    ) {
      return <EquipmentRentalsTable />;
    }
    // Default untuk 'Pesanan Toko' / 'Pesanan Masuk' (Halaman penuh manajemen pesanan yang bisa di-action)
    return <OrdersDataTable hideCards={true} isDashboard={false} />;
  }

  // 5. Default: Halaman Dashboard Utama (5 KPI Cards + User Baru Mendaftar View Only)
  return (
    <div className="space-y-5 w-full pb-10">
      <DashboardKpiCards />
      <RecentUsersTable />
    </div>
  );
}
