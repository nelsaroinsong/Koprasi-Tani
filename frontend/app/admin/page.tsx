'use client';

import React, { useState } from 'react';
import {
  Sprout,
  Users,
  Package,
  TrendingUp,
  Plus,
  CheckCircle2,
  Phone,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface KelompokTaniData {
  id: string;
  nama: string;
  desa: string;
  kecamatan: string;
  komoditasUtama: string;
  jumlahAnggota: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'PETANI' | 'PEMBELI';
  kelompokTaniNama: string;
  isActive: boolean;
}

interface ProductData {
  id: string;
  nama: string;
  kategori: string;
  harga: number;
  satuan: string;
  stok: number;
  petaniNama: string;
  kelompokTaniNama: string;
  isTersedia: boolean;
}

// Initial mockup data reflecting real Minahasa Utara agricultural cooperatives
const initialKelompokTani: KelompokTaniData[] = [
  {
    id: 'kt-1',
    nama: 'Kelompok Tani Likupang Subur',
    desa: 'Marinsow',
    kecamatan: 'Likupang Timur',
    komoditasUtama: 'Kelapa & Kopra Putih',
    jumlahAnggota: 64,
  },
  {
    id: 'kt-2',
    nama: 'Kelompok Tani Kauditan Makmur',
    desa: 'Kauditan I',
    kecamatan: 'Kauditan',
    komoditasUtama: 'Jagung Pipil Kering',
    jumlahAnggota: 82,
  },
  {
    id: 'kt-3',
    nama: 'Kelompok Tani Airmadidi Sejahtera',
    desa: 'Sarongsong',
    kecamatan: 'Airmadidi',
    komoditasUtama: 'Kelapa Butir & VCO',
    jumlahAnggota: 53,
  },
  {
    id: 'kt-4',
    nama: 'Kelompok Tani Dimembe Bersatu',
    desa: 'Tetey',
    kecamatan: 'Dimembe',
    komoditasUtama: 'Jagung Hibrida & Sayuran',
    jumlahAnggota: 47,
  },
];

const initialUsers: UserData[] = [
  {
    id: 'usr-1',
    name: 'Lionel Roinsong',
    email: 'admin@sinarpagisejahtera.co.id',
    phone: '0812-4455-6677',
    role: 'ADMIN',
    kelompokTaniNama: 'Pengurus Pusat Koperasi',
    isActive: true,
  },
  {
    id: 'usr-2',
    name: 'Oma Martha Wagiu',
    email: 'martha.wagiu@petani.id',
    phone: '0852-1122-3344',
    role: 'PETANI',
    kelompokTaniNama: 'Kelompok Tani Likupang Subur',
    isActive: true,
  },
  {
    id: 'usr-3',
    name: 'Bpk. Hermanus Sumual',
    email: 'hermanus.sumual@petani.id',
    phone: '0821-9988-7766',
    role: 'PETANI',
    kelompokTaniNama: 'Kelompok Tani Kauditan Makmur',
    isActive: true,
  },
  {
    id: 'usr-4',
    name: 'PT Pangan Manado Nusantara',
    email: 'procurement@panganmanado.com',
    phone: '0811-3344-5566',
    role: 'PEMBELI',
    kelompokTaniNama: 'Mitra Pembeli Industri',
    isActive: true,
  },
];

const initialProducts: ProductData[] = [
  {
    id: 'prd-1',
    nama: 'Kopra Putih Berkualitas Ekspor (Grade A)',
    kategori: 'Kelapa',
    harga: 13500,
    satuan: 'kg',
    stok: 12500,
    petaniNama: 'Oma Martha Wagiu',
    kelompokTaniNama: 'Kelompok Tani Likupang Subur',
    isTersedia: true,
  },
  {
    id: 'prd-2',
    nama: 'Jagung Pipil Kering Kadar Air 14%',
    kategori: 'Jagung',
    harga: 5500,
    satuan: 'kg',
    stok: 34000,
    petaniNama: 'Bpk. Hermanus Sumual',
    kelompokTaniNama: 'Kelompok Tani Kauditan Makmur',
    isTersedia: true,
  },
  {
    id: 'prd-3',
    nama: 'Kelapa Butir Tua Pilihan (Grade Super)',
    kategori: 'Kelapa',
    harga: 3200,
    satuan: 'butir',
    stok: 8500,
    petaniNama: 'Bpk. Antonius Rori',
    kelompokTaniNama: 'Kelompok Tani Airmadidi Sejahtera',
    isTersedia: true,
  },
];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'kelompok-tani' | 'users' | 'products'>('overview');
  const [kelompokList, setKelompokList] = useState<KelompokTaniData[]>(initialKelompokTani);
  const [usersList, setUsersList] = useState<UserData[]>(initialUsers);
  const [productsList, setProductsList] = useState<ProductData[]>(initialProducts);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState<'none' | 'kelompok' | 'user' | 'product'>('none');

  // Form States
  const [newKelompok, setNewKelompok] = useState({
    nama: '',
    desa: '',
    kecamatan: '',
    komoditasUtama: 'Kelapa & Jagung',
    jumlahAnggota: 20,
  });

  const [newProduct, setNewProduct] = useState({
    nama: '',
    kategori: 'Kelapa',
    harga: 10000,
    satuan: 'kg',
    stok: 1000,
    petaniNama: 'Oma Martha Wagiu',
    kelompokTaniNama: 'Kelompok Tani Likupang Subur',
  });

  // Handle Add Kelompok Tani
  const handleAddKelompok = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKelompok.nama || !newKelompok.desa) return;

    const created: KelompokTaniData = {
      id: `kt-${Date.now()}`,
      nama: newKelompok.nama,
      desa: newKelompok.desa,
      kecamatan: newKelompok.kecamatan || 'Minahasa Utara',
      komoditasUtama: newKelompok.komoditasUtama,
      jumlahAnggota: Number(newKelompok.jumlahAnggota),
    };

    setKelompokList([created, ...kelompokList]);
    setShowAddModal('none');
    setNewKelompok({
      nama: '',
      desa: '',
      kecamatan: '',
      komoditasUtama: 'Kelapa & Jagung',
      jumlahAnggota: 20,
    });
  };

  // Handle Add Product
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.nama || !newProduct.harga) return;

    const created: ProductData = {
      id: `prd-${Date.now()}`,
      nama: newProduct.nama,
      kategori: newProduct.kategori,
      harga: Number(newProduct.harga),
      satuan: newProduct.satuan,
      stok: Number(newProduct.stok),
      petaniNama: newProduct.petaniNama,
      kelompokTaniNama: newProduct.kelompokTaniNama,
      isTersedia: true,
    };

    setProductsList([created, ...productsList]);
    setShowAddModal('none');
    setNewProduct({
      nama: '',
      kategori: 'Kelapa',
      harga: 10000,
      satuan: 'kg',
      stok: 1000,
      petaniNama: 'Oma Martha Wagiu',
      kelompokTaniNama: 'Kelompok Tani Likupang Subur',
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-br from-forest-accent to-forest-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Sistem Ekosistem Terpadu Minahasa Utara</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Dashboard Koperasi Sinar Pagi Sejahtera
            </h1>
            <p className="text-sm text-emerald-100 max-w-2xl leading-relaxed">
              Pusat kelola data gabungan kelompok tani, verifikasi petani anggota, dan monitoring pasokan komoditas hasil panen kelapa &amp; jagung.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal('kelompok')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-forest-accent font-bold text-xs hover:bg-emerald-50 transition shadow-sm cursor-pointer"
              type="button"
            >
              <Plus className="w-4 h-4" />
              <span>+ Kelompok Tani</span>
            </button>
            <button
              onClick={() => setShowAddModal('product')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-500/40 font-semibold text-xs transition cursor-pointer"
              type="button"
            >
              <Plus className="w-4 h-4" />
              <span>+ Produk Panen</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-forest-accent flex items-center justify-center shrink-0">
            <Sprout className="w-6 h-6 text-forest-accent" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kelompok Tani</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{kelompokList.length} Kelompok</p>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <span>Menaungi 10 Kecamatan</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-forest-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Petani Terdaftar</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{usersList.length} Pengguna</p>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" />
              <span>Semua akun aktif</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Produk Panen</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{productsList.length} Komoditas</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              <span>Siap dipasok ke pasar</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kapasitas Pasokan</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">55+ Ton</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              <span>Kopra &amp; Jagung Pipil</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-forest-accent text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          type="button"
        >
          Ringkasan Seluruh Data
        </button>

        <button
          onClick={() => setActiveTab('kelompok-tani')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'kelompok-tani'
              ? 'bg-forest-accent text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          type="button"
        >
          Kelola Kelompok Tani ({kelompokList.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'bg-forest-accent text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          type="button"
        >
          Petani &amp; Anggota ({usersList.length})
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'products'
              ? 'bg-forest-accent text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          type="button"
        >
          Katalog Produk Panen ({productsList.length})
        </button>
      </div>

      {/* TAB CONTENT 1: KELOMPOK TANI */}
      {(activeTab === 'overview' || activeTab === 'kelompok-tani') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sprout className="w-5 h-5 text-forest-accent" />
                <span>Daftar Kelompok Tani Minahasa Utara</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelompok tani binaan Koperasi Sinar Pagi Sejahtera di Minahasa Utara
              </p>
            </div>

            <button
              onClick={() => setShowAddModal('kelompok')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-forest-accent text-white font-semibold text-xs hover:bg-forest-800 transition cursor-pointer self-start sm:self-auto"
              type="button"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelompok</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Nama Kelompok Tani</th>
                  <th className="px-5 py-3.5">Wilayah (Desa &amp; Kec.)</th>
                  <th className="px-5 py-3.5">Komoditas Utama</th>
                  <th className="px-5 py-3.5 text-center">Jumlah Anggota</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kelompokList.map((kt) => (
                  <tr key={kt.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-forest-accent flex items-center justify-center font-bold text-xs">
                        {kt.nama.charAt(14) || 'K'}
                      </div>
                      <span>{kt.nama}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Desa {kt.desa}, Kec. {kt.kecamatan}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-forest-50 text-forest-accent font-semibold text-[11px] border border-forest-200/50">
                        {kt.komoditasUtama}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-800">
                      {kt.jumlahAnggota} Petani
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => alert(`Detail kelompok tani ${kt.nama} (ID: ${kt.id})`)}
                        className="text-forest-accent hover:text-forest-800 font-semibold cursor-pointer"
                        type="button"
                      >
                        Detail &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: PETANI & PENGGUNA */}
      {(activeTab === 'overview' || activeTab === 'users') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-forest-accent" />
                <span>Petani &amp; Anggota Terdaftar</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengguna dengan role Petani, Pembeli, dan Pengurus Koperasi
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Nama &amp; Kontak</th>
                  <th className="px-5 py-3.5">Role Akses</th>
                  <th className="px-5 py-3.5">Afiliasi Kelompok Tani</th>
                  <th className="px-5 py-3.5 text-center">Status Akun</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{user.email}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : user.role === 'PETANI'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-medium">
                      {user.kelompokTaniNama}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aktif</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: PRODUK KOMODITAS */}
      {(activeTab === 'overview' || activeTab === 'products') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-forest-accent" />
                <span>Katalog Pasokan Komoditas Panen</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Stok komoditas siap kirim dari kebun anggota ke pembeli industri
              </p>
            </div>

            <button
              onClick={() => setShowAddModal('product')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-forest-accent text-white font-semibold text-xs hover:bg-forest-800 transition cursor-pointer self-start sm:self-auto"
              type="button"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Nama Komoditas</th>
                  <th className="px-5 py-3.5">Kategori</th>
                  <th className="px-5 py-3.5">Harga Satuan</th>
                  <th className="px-5 py-3.5">Stok Siap Pasok</th>
                  <th className="px-5 py-3.5">Petani &amp; Kelompok Tani</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productsList.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {prod.nama}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {prod.kategori}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-forest-accent">
                      Rp {prod.harga.toLocaleString('id-ID')} / {prod.satuan}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {prod.stok.toLocaleString('id-ID')} {prod.satuan}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <p className="font-semibold text-slate-800">{prod.petaniNama}</p>
                      <p className="text-[10px] text-slate-400">{prod.kelompokTaniNama}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                        Tersedia
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH KELOMPOK TANI */}
      {showAddModal === 'kelompok' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sprout className="w-5 h-5 text-forest-accent" />
              <span>Tambah Kelompok Tani Baru</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Daftarkan kelompok tani baru di wilayah Minahasa Utara.
            </p>

            <form onSubmit={handleAddKelompok} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kelompok Tani
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelompok Tani Wori Jaya"
                  value={newKelompok.nama}
                  onChange={(e) => setNewKelompok({ ...newKelompok, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-forest-accent focus:ring-1 focus:ring-forest-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Desa / Kelurahan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Wori"
                    value={newKelompok.desa}
                    onChange={(e) => setNewKelompok({ ...newKelompok, desa: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-forest-accent focus:ring-1 focus:ring-forest-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kecamatan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Wori"
                    value={newKelompok.kecamatan}
                    onChange={(e) => setNewKelompok({ ...newKelompok, kecamatan: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-forest-accent focus:ring-1 focus:ring-forest-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Komoditas Utama
                  </label>
                  <select
                    value={newKelompok.komoditasUtama}
                    onChange={(e) => setNewKelompok({ ...newKelompok, komoditasUtama: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-forest-accent focus:ring-1 focus:ring-forest-accent bg-white"
                  >
                    <option value="Kelapa & Kopra Putih">Kelapa &amp; Kopra Putih</option>
                    <option value="Jagung Pipil Kering">Jagung Pipil Kering</option>
                    <option value="Kelapa & Jagung">Kelapa &amp; Jagung</option>
                    <option value="Hortikultura">Hortikultura</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Anggota Petani
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newKelompok.jumlahAnggota}
                    onChange={(e) => setNewKelompok({ ...newKelompok, jumlahAnggota: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-forest-accent focus:ring-1 focus:ring-forest-accent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal('none')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-forest-accent text-white font-bold text-xs hover:bg-forest-800 transition cursor-pointer"
                >
                  Simpan Kelompok Tani
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH PRODUK PANEN */}
      {showAddModal === 'product' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-forest-accent" />
              <span>Tambah Produk Komoditas Panen</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Catat komoditas panen petani yang siap dipasok ke pasar.
            </p>

            <form onSubmit={handleAddProduct} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Produk Komoditas
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopra Putih Kering Jemur"
                  value={newProduct.nama}
                  onChange={(e) => setNewProduct({ ...newProduct, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-forest-accent focus:ring-1 focus:ring-forest-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={newProduct.kategori}
                    onChange={(e) => setNewProduct({ ...newProduct, kategori: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-forest-accent focus:ring-1 focus:ring-forest-accent bg-white"
                  >
                    <option value="Kelapa">Kelapa &amp; Kopra</option>
                    <option value="Jagung">Jagung Pipil</option>
                    <option value="Olahan">Produk Olahan Tani</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Satuan
                  </label>
                  <select
                    value={newProduct.satuan}
                    onChange={(e) => setNewProduct({ ...newProduct, satuan: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-forest-accent focus:ring-1 focus:ring-forest-accent bg-white"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="karung">Karung (50 kg)</option>
                    <option value="butir">Butir (Kelapa)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Harga Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    value={newProduct.harga}
                    onChange={(e) => setNewProduct({ ...newProduct, harga: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-forest-accent focus:ring-1 focus:ring-forest-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Stok Siap Kirim
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProduct.stok}
                    onChange={(e) => setNewProduct({ ...newProduct, stok: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-forest-accent focus:ring-1 focus:ring-forest-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kelompok Tani Penghasil
                </label>
                <select
                  value={newProduct.kelompokTaniNama}
                  onChange={(e) => setNewProduct({ ...newProduct, kelompokTaniNama: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-forest-accent focus:ring-1 focus:ring-forest-accent bg-white"
                >
                  {kelompokList.map((kt) => (
                    <option key={kt.id} value={kt.nama}>
                      {kt.nama} ({kt.desa})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal('none')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-forest-accent text-white font-bold text-xs hover:bg-forest-800 transition cursor-pointer"
                >
                  Simpan Produk Panen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
