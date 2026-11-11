'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import LocationMapPreview from '@/components/LocationMapPreview';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
import {
  Tractor,
  ArrowRight,
  Search,
  Filter,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Phone,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wrench,
  Loader2,
  Check,
  X,
  MessageCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  Info,
  LayoutGrid,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowUpRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { EquipmentItem } from '@/lib/equipments';
import initialEquipmentsData from '@/data/equipments.json';
import {
  getRentalCart,
  addToRentalCart,
  updateRentalCartItem,
  removeRentalCartItem,
  clearRentalCart,
  calculateRentalCartTotal,
  calculateRentalItemTotal,
  type RentalCartItem,
} from '@/lib/rental-cart';
import { getPrimaryImage } from '@/lib/utils';

const getCategoryIcon = (categoryName: string) => {
  const norm = categoryName.toLowerCase().trim();
  if (norm === 'semua' || norm === 'semua alat') return '/api/images/categories/semua-alat.jpg';
  if (norm.includes('kelapa')) return '/api/images/categories/kelapa.jpg';
  if (norm.includes('jagung')) return '/api/images/categories/jagung.jpg';
  if (norm.includes('turunan')) return '/api/images/categories/turunan.jpg';
  if (norm.includes('olahan')) return '/api/images/categories/olahan.jpg';
  return '/api/images/categories/alat.jpg';
};

// Kategori akan dimuat dinamis dari data admin kelola kategori

// In-Memory Module Cache untuk Navigasi Cepat (SWR Pattern)
let cachedEquipmentsCatalog: EquipmentItem[] | null = null;

function SewaAlatContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State Data (Instant rendering dari cache in-memory atau seed lokal)
  const [equipments, setEquipments] = useState<EquipmentItem[]>(
    () => cachedEquipmentsCatalog || (initialEquipmentsData as EquipmentItem[]) || []
  );
  const [isLoading, setIsLoading] = useState(() => !cachedEquipmentsCatalog);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>(
    () => searchParams.get('kategori') || 'SEMUA'
  );
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(
    () => searchParams.get('onlyAvailable') === 'true'
  );
  const [operatorOnly, setOperatorOnly] = useState<boolean>(
    () => searchParams.get('operatorOnly') === 'true'
  );
  const [minPrice, setMinPrice] = useState<number>(() => {
    const p = Number(searchParams.get('minPrice'));
    return !isNaN(p) && p > 50000 ? p : 50000;
  });
  const [maxPrice, setMaxPrice] = useState<number>(() => {
    const p = Number(searchParams.get('maxPrice'));
    return !isNaN(p) && p < 2500000 && p > 50000 ? p : 2500000;
  });
  const [sortBy, setSortBy] = useState<string>(
    () => searchParams.get('sortBy') || 'default'
  );

  const [categories, setCategories] = useState<{ id: string; name: string; imageUrl?: string; isActive?: boolean }[]>([]);

  // Sinkronisasi filter saat query params berubah (misal kembali dari /sewa-alat/filter)
  useEffect(() => {
    const kat = searchParams.get('kategori') || 'SEMUA';
    setSelectedKategori(kat);
    setOnlyAvailable(searchParams.get('onlyAvailable') === 'true');
    setOperatorOnly(searchParams.get('operatorOnly') === 'true');

    const minP = Number(searchParams.get('minPrice'));
    setMinPrice(!isNaN(minP) && minP > 50000 ? minP : 50000);

    const maxP = Number(searchParams.get('maxPrice'));
    setMaxPrice(!isNaN(maxP) && maxP < 2500000 && maxP > 50000 ? maxP : 2500000);

    setSortBy(searchParams.get('sortBy') || 'default');
  }, [searchParams]);

  // Fetch Kategori Sewa Alat dari Data Kelola Kategori Admin
  useEffect(() => {
    fetch('/api/equipment-categories')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      })
      .catch((err) => console.error('Error fetching equipment categories:', err));
  }, []);

  // Filter Kategori Aktif
  const activeCategories = useMemo(() => {
    return categories.filter((c) => c.isActive !== false);
  }, [categories]);

  const inactiveCatNames = useMemo(() => {
    return new Set(
      categories
        .filter((c) => c.isActive === false)
        .map((c) => c.name.toLowerCase().trim())
    );
  }, [categories]);

  // Jika URL memfilter kategori yang sedang dinonaktifkan admin, reset ke SEMUA
  useEffect(() => {
    if (categories.length > 0 && selectedKategori !== 'SEMUA') {
      const isInactive = inactiveCatNames.has(selectedKategori.toLowerCase().trim());
      if (isInactive) {
        setSelectedKategori('SEMUA');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('kategori');
        const query = params.toString();
        router.replace(query ? `/sewa-alat?${query}` : '/sewa-alat', { scroll: false });
      }
    }
  }, [categories, selectedKategori, inactiveCatNames, searchParams, router]);

  // Daftar Tabs Kategori Dinamis sesuai Admin (Hanya kategori aktif)
  const dynamicKategoriTabs = useMemo(() => {
    const tabs: { key: string; label: string; imageUrl?: string }[] = [
      { key: 'SEMUA', label: 'Semua', imageUrl: '/api/images/categories/semua-alat.jpg' },
    ];
    if (activeCategories.length > 0) {
      activeCategories.forEach((cat) => {
        tabs.push({
          key: cat.name,
          label: cat.name,
          imageUrl: cat.imageUrl,
        });
      });
    } else {
      const unique = Array.from(new Set(equipments.map((e) => e.kategori).filter(Boolean)));
      unique.forEach((cat) => {
        tabs.push({ key: cat, label: cat });
      });
    }
    return tabs;
  }, [activeCategories, equipments]);

  // Quick Booking Modal State (Shortcut dari card)
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [durasi, setDurasi] = useState('1');
  const [jumlahUnit, setJumlahUnit] = useState(1);
  const [includeOperator, setIncludeOperator] = useState(false);
  const [lokasiLahan, setLokasiLahan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccessResult, setBookingSuccessResult] = useState<{
    rentalCode: string;
    waUrl: string;
    totalEstimasi: number;
  } | null>(null);

  useEffect(() => {
    if (user?.address) {
      setLokasiLahan(user.address);
    }
  }, [user]);

  // Fetch Equipments from API (SWR Pattern dengan silent background refresh)
  const fetchEquipments = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      const res = await fetch('/api/equipments');
      const data = await res.json();
      if (res.ok && Array.isArray(data.equipments)) {
        setEquipments(data.equipments);
        cachedEquipmentsCatalog = data.equipments;
      }
    } catch (err) {
      console.error('Error fetching equipments:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipments(Boolean(cachedEquipmentsCatalog));
  }, [fetchEquipments]);

  // Filter Data Komprehensif (Kategori, Ketersediaan, Operator, Rentang Biaya, Pencarian, & Urutan)
  const filteredEquipments = useMemo(() => {
    let list = equipments.filter((item) => {
      // Saring kategori yang dinonaktifkan admin
      if (item.kategori && inactiveCatNames.has(item.kategori.toLowerCase().trim())) {
        return false;
      }
      const matchKategori =
        selectedKategori === 'SEMUA' ||
        (item.kategori && item.kategori.toLowerCase().trim() === selectedKategori.toLowerCase().trim());
      const matchAvailable = !onlyAvailable || item.isTersedia;
      const matchOperator = !operatorOnly || (item.biayaOperator !== null && item.biayaOperator !== undefined);
      const price = Number(item.hargaSewa) || 0;
      const matchMinPrice = price >= minPrice;
      const matchMaxPrice = maxPrice >= 2500000 || price <= maxPrice;
      const matchSearch =
        !searchQuery.trim() ||
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.spesifikasi && item.spesifikasi.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.deskripsi && item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchKategori && matchAvailable && matchOperator && matchMinPrice && matchMaxPrice && matchSearch;
    });

    if (sortBy === 'termurah') {
      list.sort((a, b) => (Number(a.hargaSewa) || 0) - (Number(b.hargaSewa) || 0));
    } else if (sortBy === 'termahal') {
      list.sort((a, b) => (Number(b.hargaSewa) || 0) - (Number(a.hargaSewa) || 0));
    } else if (sortBy === 'terbaru') {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === 'terpopuler') {
      list.sort((a, b) => {
        const popB = Number((b as any).rentalCount || b.unitDisewa || b.stokUnit || 0);
        const popA = Number((a as any).rentalCount || a.unitDisewa || a.stokUnit || 0);
        if (popB !== popA) return popB - popA;
        return (Number(b.hargaSewa) || 0) - (Number(a.hargaSewa) || 0);
      });
    }

    return list;
  }, [equipments, selectedKategori, onlyAvailable, operatorOnly, minPrice, maxPrice, searchQuery, sortBy, inactiveCatNames]);

  const hasActiveFilters =
    selectedKategori !== 'SEMUA' ||
    onlyAvailable ||
    operatorOnly ||
    minPrice > 50000 ||
    maxPrice < 2500000 ||
    sortBy !== 'default';

  // Masukkan langsung ke keranjang sewa multi-alat saat tombol '+ Sewa Alat' ditekan
  const handleAddToCartDirectly = (item: EquipmentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.isTersedia) return;
    addToRentalCart({
      equipmentId: item.id,
      nama: item.nama,
      kategori: item.kategori,
      hargaSewa: item.hargaSewa,
      satuanSewa: item.satuanSewa,
      biayaOperator: item.biayaOperator,
      includeOperator: false,
      stokUnit: item.stokUnit || 1,
      jumlahUnit: 1,
      durasi: 1,
      imageUrl: item.imageUrl,
      kontakPj: item.kontakPj,
    });
    showToast({
      title: 'Masuk Keranjang Sewa',
      message: `${item.nama} berhasil ditambahkan ke keranjang sewa alat!`,
      type: 'success',
    });
  };

  // Buka Modal Booking Cepat (Dengan Validasi Auth)
  const handleOpenBooking = (item: EquipmentItem) => {
    if (!user) {
      showToast({
        title: 'Perlu Masuk Akun',
        message: 'Silakan masuk akun terlebih dahulu untuk mengajukan sewa alat.',
        type: 'info',
      });
      router.push('/login?callbackUrl=/sewa-alat');
      return;
    }

    if (user.role === 'PETANI' && !user.isVerified) {
      showToast({
        title: 'Akun Petani Perlu Verifikasi',
        message: 'Akun Petani Anda sedang dalam antrean verifikasi pengurus koperasi.',
        type: 'warning',
      });
      router.push('/verifikasi-petani');
      return;
    }

    if (!user.isOnboarded && user.role !== 'ADMIN') {
      router.push('/onboarding');
      return;
    }

    setSelectedEquipment(item);
    setBookingSuccessResult(null);
    setStartDate(new Date().toISOString().split('T')[0]);
    setDurasi('1');
    setJumlahUnit(1);
    setIncludeOperator(false);
    setLokasiLahan(user?.address || '');
    setCatatan('');
    setIsBookingOpen(true);
  };

  // Tambahkan Unit dari Modal Cepat ke Keranjang Multi-Alat
  const handleAddQuickToCart = () => {
    if (!selectedEquipment) return;
    addToRentalCart({
      equipmentId: selectedEquipment.id,
      nama: selectedEquipment.nama,
      kategori: selectedEquipment.kategori,
      hargaSewa: selectedEquipment.hargaSewa,
      satuanSewa: selectedEquipment.satuanSewa,
      biayaOperator: selectedEquipment.biayaOperator,
      includeOperator,
      stokUnit: selectedEquipment.stokUnit,
      jumlahUnit,
      durasi: Number(durasi) || 1,
      imageUrl: selectedEquipment.imageUrl,
      kontakPj: selectedEquipment.kontakPj,
    });
    setIsBookingOpen(false);
    showToast({
      title: 'Ditambahkan ke Keranjang Sewa',
      message: `${jumlahUnit} unit ${selectedEquipment.nama} berhasil dimasukkan. Anda dapat memilih alat lainnya.`,
      type: 'success',
    });
  };

  // Hitung Total Estimasi Biaya Modal Cepat
  const calculatedTotal = useMemo(() => {
    if (!selectedEquipment) return 0;
    const durasiNumber = Math.max(1, Number(durasi) || 1);
    const qty = Math.max(1, Number(jumlahUnit) || 1);
    const hargaDasar = selectedEquipment.hargaSewa * durasiNumber * qty;
    const biayaOperatorTotal =
      includeOperator && selectedEquipment.biayaOperator
        ? selectedEquipment.biayaOperator * durasiNumber * qty
        : 0;
    return hargaDasar + biayaOperatorTotal;
  }, [selectedEquipment, durasi, jumlahUnit, includeOperator]);

  // Submit Booking Cepat (Single Unit)
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;

    if (!startDate) {
      showToast({
        title: 'Tanggal Belum Dipilih',
        message: 'Silakan pilih tanggal rencana penggunaan alat.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmittingBooking(true);
      const res = await fetch('/api/equipments/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: selectedEquipment.id,
          startDate,
          durasi: Number(durasi) || 1,
          jumlahUnit,
          includeOperator,
          lokasiLahan,
          catatan,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBookingSuccessResult({
          rentalCode: data.rentalCode,
          waUrl: data.waUrl,
          totalEstimasi: data.totalEstimasi,
        });
        showToast({
          title: 'Pengajuan Siap',
          message: 'Detail booking telah disiapkan. Silakan kirim pesan ke WhatsApp PJ Koperasi.',
          type: 'success',
        });
      } else {
        showToast({
          title: 'Gagal Mengajukan Sewa',
          message: data.error || 'Terjadi gangguan saat memproses booking.',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Kesalahan Sistem',
        message: 'Gagal mengajukan sewa alat pertanian.',
        type: 'error',
      });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      {/* App Header with Dedicated Sewa Alat Sub-Navbar */}
      <AppHeader
        activePage="sewa-alat"
        selectedKategori={selectedKategori}
        onSelectKategori={(kategori) => {
          setSelectedKategori(kategori);
          setSortBy('default');
          const params = new URLSearchParams(searchParams.toString());
          if (kategori === 'SEMUA') {
            params.delete('kategori');
          } else {
            params.set('kategori', kategori);
          }
          params.delete('sortBy');
          const query = params.toString();
          router.replace(query ? `/sewa-alat?${query}` : '/sewa-alat', { scroll: false });
        }}
        sortBy={sortBy}
        onSelectSort={(newSort) => {
          setSortBy(newSort);
          if (newSort !== 'default') {
            setSelectedKategori('SEMUA');
          }
          const params = new URLSearchParams(searchParams.toString());
          if (newSort === 'default') {
            params.delete('sortBy');
          } else {
            params.set('sortBy', newSort);
            params.delete('kategori');
          }
          const query = params.toString();
          router.replace(query ? `/sewa-alat?${query}` : '/sewa-alat', { scroll: false });
        }}
        categories={
          activeCategories.length > 0
            ? activeCategories
            : dynamicKategoriTabs.filter((t) => t.key !== 'SEMUA').map((t) => ({ id: t.key, name: t.label }))
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5 pb-24 lg:pb-12">
        {/* Search Bar matching Gambar 1 (Clean Rounded Pill with Magnifying Glass & Filter Button) */}
        <div className="relative w-full max-w-2xl mx-auto mb-5 sm:mb-6">
          <div className="relative flex items-center bg-white border border-[#cfd6c9] focus-within:border-[#233414] focus-within:ring-2 focus-within:ring-[#233414]/15 rounded-full shadow-xs transition-all h-11 sm:h-12 px-4">
            <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#68785b] shrink-0 mr-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari traktor, kultivator, drone, pemipil..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-[#1a2610] placeholder:text-[#68785b] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-5 h-5 rounded-full bg-[#EAEDE7] hover:bg-[#cfd6c9] text-[#233414] flex items-center justify-center transition cursor-pointer shrink-0"
                title="Bersihkan"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Category Section - Mobile Mode (UI seperti Toko dengan Image Generate 3D & Filter Icon di Paling Kiri) */}
        <div className="mb-6 md:hidden">
          <div className="mb-3 px-1">
            <h2 className="text-sm font-bold text-[#1a2610] tracking-tight">
              Kategori Sewa Alat
            </h2>
          </div>

          <div className="flex items-start gap-2.5 overflow-x-auto pb-2 no-scrollbar px-1">
            {/* 1. Tombol Filter Mode Mobile: Di Paling Kiri, Icon Saja (Membuka /sewa-alat/filter) */}
            <button
              type="button"
              onClick={() => {
                const p = new URLSearchParams();
                if (selectedKategori && selectedKategori !== 'SEMUA') p.set('kategori', selectedKategori);
                if (onlyAvailable) p.set('onlyAvailable', 'true');
                if (operatorOnly) p.set('operatorOnly', 'true');
                if (minPrice && minPrice > 50000) p.set('minPrice', String(minPrice));
                if (maxPrice && maxPrice < 2500000) p.set('maxPrice', String(maxPrice));
                if (sortBy && sortBy !== 'default') p.set('sortBy', sortBy);
                router.push(`/sewa-alat/filter?${p.toString()}`);
              }}
              className="flex flex-col items-center group shrink-0 focus:outline-none cursor-pointer"
              aria-label="Filter Alat"
              title="Buka Filter Alat"
            >
              <div
                className={`w-15 h-15 rounded-2xl p-1.5 flex items-center justify-center transition-all relative ${
                  hasActiveFilters
                    ? 'bg-[#1a2610] text-[#D4F63D] border-2 border-[#1a2610] shadow-xs'
                    : 'bg-white hover:bg-[#EAEDE7] border border-[#dce1d6] text-[#233414] shadow-2xs'
                }`}
              >
                <SlidersHorizontal className="w-5.5 h-5.5" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#D4F63D] border-2 border-white ring-1 ring-[#1a2610]" />
                )}
              </div>
              <span
                className={`text-[11px] text-center mt-1.5 transition-colors leading-tight ${
                  hasActiveFilters
                    ? 'text-[#1a2610] font-bold'
                    : 'text-[#526046] font-medium group-hover:text-[#1a2610]'
                }`}
              >
                Filter
              </span>
            </button>

            {/* 2. Kartu Kategori Sewa Alat: UI Seperti Toko dengan Image Generate 3D */}
            {dynamicKategoriTabs.map((tab) => {
              const isSelected = selectedKategori.toLowerCase().trim() === tab.key.toLowerCase().trim();
              const iconSrc = tab.imageUrl || getCategoryIcon(tab.key);

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedKategori(tab.key)}
                  className="flex flex-col items-center group shrink-0 focus:outline-none cursor-pointer"
                >
                  <div
                    className={`w-15 h-15 rounded-2xl p-1.5 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-white border-2 border-[#233414] shadow-xs'
                        : 'bg-[#f4f5f1] hover:bg-[#EAEDE7] border border-[#dce1d6] group-hover:border-[#b8c4ae]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={iconSrc}
                      alt={tab.label}
                      className={`w-full h-full object-contain rounded-xl transition-transform duration-200 ${
                        isSelected ? 'scale-105' : 'group-hover:scale-105'
                      }`}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getCategoryIcon(tab.key);
                      }}
                    />
                  </div>
                  <span
                    className={`text-[11px] text-center mt-1.5 transition-colors max-w-[70px] truncate leading-tight ${
                      isSelected
                        ? 'text-[#233414] font-bold'
                        : 'text-[#526046] font-medium group-hover:text-[#1a2610]'
                    }`}
                    title={tab.label}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filter Chips (Mode Mobile & Desktop) */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-3 px-1 no-scrollbar text-xs">
            <span className="text-[11px] font-bold text-[#526046] uppercase shrink-0">Filter Aktif:</span>
            {selectedKategori !== 'SEMUA' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#dce1d6] text-xs font-semibold text-[#1a2610] shadow-2xs shrink-0">
                <span>{selectedKategori}</span>
                <button
                  type="button"
                  onClick={() => setSelectedKategori('SEMUA')}
                  className="hover:text-red-600 cursor-pointer"
                  title="Hapus filter kategori"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {onlyAvailable && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2f2c8] border border-[#c9e39e] text-xs font-bold text-[#233414] shadow-2xs shrink-0">
                <CheckCircle2 className="w-3 h-3 text-[#344d15]" />
                <span>Siap Pakai</span>
                <button
                  type="button"
                  onClick={() => setOnlyAvailable(false)}
                  className="hover:text-red-600 cursor-pointer"
                  title="Hapus filter siap pakai"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {operatorOnly && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#dce1d6] text-xs font-semibold text-[#1a2610] shadow-2xs shrink-0">
                <UserCheck className="w-3 h-3 text-[#344d15]" />
                <span>Dengan Operator</span>
                <button
                  type="button"
                  onClick={() => setOperatorOnly(false)}
                  className="hover:text-red-600 cursor-pointer"
                  title="Hapus filter operator"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(minPrice > 50000 || maxPrice < 2500000) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#dce1d6] text-xs font-semibold text-[#1a2610] shadow-2xs shrink-0">
                <span>
                  {minPrice >= 1000000 ? `Rp ${(minPrice / 1000000).toFixed(1)}jt` : `Rp ${Math.round(minPrice / 1000)}rb`} -{' '}
                  {maxPrice >= 2500000
                    ? '2.5jt+'
                    : maxPrice >= 1000000
                    ? `Rp ${(maxPrice / 1000000).toFixed(1)}jt`
                    : `Rp ${Math.round(maxPrice / 1000)}rb`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice(50000);
                    setMaxPrice(2500000);
                  }}
                  className="hover:text-red-600 cursor-pointer"
                  title="Hapus filter tarif"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {sortBy !== 'default' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#dce1d6] text-xs font-semibold text-[#1a2610] shadow-2xs shrink-0">
                <span>
                  Urut:{' '}
                  {sortBy === 'termurah'
                    ? 'Tarif Terendah'
                    : sortBy === 'termahal'
                    ? 'Tarif Tertinggi'
                    : sortBy === 'terbaru'
                    ? 'Alat Terbaru'
                    : sortBy === 'terpopuler'
                    ? 'Terpopuler'
                    : sortBy}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('default');
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('sortBy');
                    const query = params.toString();
                    router.replace(query ? `/sewa-alat?${query}` : '/sewa-alat', { scroll: false });
                  }}
                  className="hover:text-red-600 cursor-pointer"
                  title="Reset urutan"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedKategori('SEMUA');
                setOnlyAvailable(false);
                setOperatorOnly(false);
                setMinPrice(50000);
                setMaxPrice(2500000);
                setSortBy('default');
                router.replace('/sewa-alat', { scroll: false });
              }}
              className="text-[11px] text-[#526046] hover:text-red-600 font-semibold underline shrink-0 cursor-pointer ml-1"
            >
              Reset Semua
            </button>
          </div>
        )}

        {/* State Kosong / Grid Alat */}
        {filteredEquipments.length === 0 ? (
          <div className="bg-white border border-[#dce1d6] rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center flex flex-col items-center justify-center min-h-[240px] sm:min-h-[300px]">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#f4f5f1] border border-[#dce1d6] text-[#233414] flex items-center justify-center mb-3 sm:mb-4">
              <Tractor className="w-5 h-5 sm:w-6 sm:h-6 text-[#344d15]" />
            </div>
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-[#1a2610]">
              Tidak ada alat pertanian yang cocok
            </h3>
            <p className="text-xs sm:text-[13px] text-[#526046] mt-1 max-w-sm mb-4 leading-relaxed">
              Silakan gunakan kata kunci pencarian lain atau ubah filter kategori.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedKategori('SEMUA');
                setOnlyAvailable(false);
              }}
              className="py-2 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          /* Grid Sewa Alat - Taste Skill Cards Matching Gambar 3 */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {filteredEquipments.map((item) => {
              const isOutOfStock = !item.isTersedia || (item.stokTersedia !== undefined && item.stokTersedia <= 0);
              const remainingStock = item.stokTersedia !== undefined ? item.stokTersedia : (item.isTersedia ? (item.stokUnit || 1) : 0);

              return (
                <article
                  key={item.id}
                  onClick={() => router.push(`/sewa-alat/${item.id}`)}
                  className={`border rounded-[20px] sm:rounded-[24px] p-1 sm:p-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_rgba(35,52,20,0.09)] transition-all duration-300 flex flex-col group cursor-pointer h-full relative overflow-hidden ${
                    isOutOfStock
                      ? 'grayscale opacity-75 bg-[#f4f5f1] border-[#d5dccf]'
                      : 'bg-white border-[#e2e7dc] hover:border-[#344d15]'
                  }`}
                  title={
                    isOutOfStock
                      ? `Unit "${item.nama}" sedang disewa / stok kosong di koperasi`
                      : `Klik untuk melihat detail lengkap unit "${item.nama}"`
                  }
                >
                  {/* Top Header Text Section (Title & Subtitle on top, tight 1px-1.5px interlinear gap, balanced breathing space to image) */}
                  <div className="px-2.5 pt-2 pb-2 sm:px-3 sm:pt-2.5 sm:pb-2.5">
                    <h3
                      className="text-xs sm:text-base lg:text-[17px] font-bold text-[#1a2610] tracking-tight leading-snug pb-0.5 mb-1 sm:mb-1.5 line-clamp-1 group-hover:text-[#344d15] transition-colors"
                      title={item.nama}
                    >
                      {item.nama}
                    </h3>

                    <p className="text-[10px] sm:text-xs text-[#73826a] font-medium mt-[1px] sm:mt-[1.5px] leading-tight truncate">
                      {item.kategori || 'Alsintan'} • {item.kondisi || 'Sangat Baik'}
                    </p>
                  </div>

                  {/* Middle / Bottom Canvas: Ultra-Thin Minimalist Rounded Inner Image Container */}
                  <div className="relative w-full aspect-[4/3.8] sm:aspect-[4/3.5] rounded-[17px] sm:rounded-[21px] overflow-hidden bg-[#eef1eb] shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        getPrimaryImage(
                          item.imageUrl,
                          'https://picsum.photos/seed/sewa-alat-koperasi/600/600'
                        )
                      }
                      alt={item.nama}
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
                        isOutOfStock ? 'grayscale opacity-75' : ''
                      }`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://picsum.photos/seed/sewa-alat-koperasi/600/600';
                      }}
                    />

                    {/* Dark Gradient Overlay for bottom text & circular button pop */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

                    {/* Bottom Overlay: Price on Left, Circular Button ↗ on Right (Exact match to Gambar 3) */}
                    <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 flex items-end justify-between z-10 gap-2">
                      {/* Price: e.g. "$275" in Gambar 3 */}
                      <div className="flex flex-col text-white drop-shadow-xs min-w-0">
                        <div className="flex items-baseline gap-0.5 leading-none">
                          <span className="text-xs sm:text-base lg:text-lg font-extrabold tracking-tight tabular-nums text-white">
                            Rp {Number(item.hargaSewa).toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] sm:text-[11px] font-normal text-white/80 shrink-0">
                            /{item.satuanSewa || 'hari'}
                          </span>
                        </div>
                        <span className="text-[8px] sm:text-[10px] text-white/75 font-medium mt-1 truncate">
                          {item.biayaOperator ? '+Biaya Operator' : 'Operator Bebas'}
                        </span>
                      </div>

                      {/* Circular Action Button with ArrowUpRight ↗ (Exact match to Gambar 3) */}
                      <div
                        className="w-7 h-7 sm:w-9 sm:h-9 lg:w-10.5 lg:h-10.5 rounded-full bg-white text-[#1a2610] shadow-md flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-[#233414] group-hover:text-white shrink-0"
                        title="Buka Detail Alat"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5 stroke-[2.2]" />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* DIALOG 2: SHORTCUT QUICK BOOKING MODAL (DARI TOMBOL CARD) */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-lg w-full max-h-[92dvh] sm:max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-white border border-[#dce1d6] min-w-0">
          <DialogHeader className="shrink-0 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[#dce1d6] bg-white z-10">
            <DialogTitle className="text-sm sm:text-base font-bold text-[#1a2610] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tractor className="w-5 h-5 text-[#233414] shrink-0" />
                <span className="truncate">Pengajuan Sewa Alat</span>
              </div>
              {selectedEquipment && !bookingSuccessResult && (
                <button
                  type="button"
                  onClick={() => {
                    setIsBookingOpen(false);
                    router.push(`/sewa-alat/${selectedEquipment.id}`);
                  }}
                  className="text-xs font-semibold text-[#233414] hover:text-[#344d15] hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                >
                  <span>Info Detail</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedEquipment && !bookingSuccessResult && (
            <form onSubmit={handleSubmitBooking} className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 space-y-4 min-w-0 max-w-full">
                {/* Info Unit Terpilih */}
              <div className="p-3 bg-[#f4f5f1] border border-[#dce1d6] rounded-2xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border border-[#cfd6c9]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {selectedEquipment.imageUrl ? (
                    <img
                      src={getPrimaryImage(selectedEquipment.imageUrl)}
                      alt={selectedEquipment.nama}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Tractor className="w-6 h-6 text-[#344d15] m-auto mt-3" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[#1a2610] text-xs sm:text-sm truncate">
                    {selectedEquipment.nama}
                  </div>
                  <div className="text-[11px] text-[#233414] font-semibold mt-0.5 tabular-nums">
                    Rp {selectedEquipment.hargaSewa.toLocaleString('id-ID')} / {selectedEquipment.satuanSewa}
                  </div>
                  <div className="text-[10px] text-[#5b6950] font-medium">
                    Kondisi: {selectedEquipment.kondisi} • Stok: {selectedEquipment.stokUnit} unit
                  </div>
                </div>
              </div>

              {/* Tanggal, Durasi, dan Jumlah Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-start">
                <CustomDatePicker
                  label="Mulai Tanggal"
                  required
                  value={startDate}
                  onChange={setStartDate}
                />

                <div>
                  <label className="block font-bold text-[#1a2610] mb-1">
                    Durasi ({selectedEquipment.satuanSewa})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={durasi}
                    onChange={(e) => setDurasi(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl text-[#1a2610] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414] font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1a2610] mb-1">
                    Jumlah Unit (Max: {selectedEquipment.stokUnit || 1})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedEquipment.stokUnit || 99}
                    required
                    value={jumlahUnit}
                    onChange={(e) =>
                      setJumlahUnit(
                        Math.max(
                          1,
                          Math.min(
                            selectedEquipment.stokUnit || 99,
                            Number(e.target.value) || 1
                          )
                        )
                      )
                    }
                    className="w-full px-2.5 py-2 bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl text-[#1a2610] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414] font-bold tabular-nums"
                  />
                </div>
              </div>

              {/* Opsi Layanan Operator */}
              {selectedEquipment.biayaOperator ? (
                <div className="p-3 bg-[#f4f5f1] border border-[#dce1d6] rounded-xl">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeOperator}
                      onChange={(e) => setIncludeOperator(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#233414] text-[#233414] focus:ring-[#233414] border-[#cfd6c9] mt-0.5 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-[#1a2610]">
                        Gunakan Tenaga Operator Koperasi (+ Rp{' '}
                        {selectedEquipment.biayaOperator.toLocaleString('id-ID')} /{' '}
                        {selectedEquipment.satuanSewa})
                      </div>
                      <div className="text-[10px] text-[#526046] mt-0.5">
                        Disediakan kru terlatih koperasi untuk mengoperasikan mesin di lahan perkebunan Anda.
                      </div>
                    </div>
                  </label>
                </div>
              ) : null}

              {/* Lokasi Lahan Kebun dengan Preview Maps & Deteksi GPS */}
              <LocationMapPreview
                value={lokasiLahan}
                onChange={setLokasiLahan}
                required={false}
              />

              {/* Catatan Tambahan */}
              <div>
                <label className="block font-bold text-[#1a2610] mb-1">
                  Catatan Kebutuhan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Kebutuhan implemen bajak rotary, kondisi tanah berbatu, jam operasional..."
                  className="w-full px-3 py-2 bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl text-[#1a2610] placeholder:text-[#68785b] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414]"
                />
              </div>

              {/* Rincian Perhitungan Biaya */}
              <div className="p-3.5 rounded-2xl bg-[#f4f5f1] border border-[#dce1d6] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#526046]">
                  <span>
                    Tarif Sewa Pokok ({jumlahUnit} unit × {durasi} {selectedEquipment.satuanSewa}):
                  </span>
                  <span className="font-semibold text-[#1a2610] tabular-nums">
                    Rp{' '}
                    {(
                      selectedEquipment.hargaSewa *
                      (Number(durasi) || 1) *
                      jumlahUnit
                    ).toLocaleString('id-ID')}
                  </span>
                </div>

                {includeOperator && selectedEquipment.biayaOperator ? (
                  <div className="flex items-center justify-between text-[11px] text-[#526046]">
                    <span>
                      Jasa Operator ({jumlahUnit} unit × {durasi} {selectedEquipment.satuanSewa}):
                    </span>
                    <span className="font-semibold text-[#1a2610] tabular-nums">
                      Rp{' '}
                      {(
                        selectedEquipment.biayaOperator *
                        (Number(durasi) || 1) *
                        jumlahUnit
                      ).toLocaleString('id-ID')}
                    </span>
                  </div>
                ) : null}

                <div className="pt-2 border-t border-[#cfd6c9] flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1a2610]">Total Estimasi Sewa:</span>
                  <span className="font-black text-sm text-[#233414] tabular-nums">
                    Rp {calculatedTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              </div>

              <DialogFooter className="shrink-0 px-4 sm:px-5 py-3 border-t border-[#dce1d6] bg-white/95 backdrop-blur-sm z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pb-[max(14px,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={handleAddQuickToCart}
                  className="py-2.5 px-3.5 rounded-xl border border-[#c9e39e] bg-[#e2f2c8] text-[#233414] hover:bg-[#d5ebae] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-[#233414]" />
                  <span>+ Tambah ke Keranjang Sewa (Banyak)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBookingOpen(false)}
                    className="py-2.5 px-3 border border-[#cfd6c9] bg-white hover:bg-[#EAEDE7] text-[#526046] rounded-xl font-semibold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBooking}
                    className="py-2.5 px-4 bg-[#233414] hover:bg-[#344d15] text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingBooking ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4F63D]" />
                        <span>Menyiapkan...</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 text-[#D4F63D]" />
                        <span>Sewa Unit Ini</span>
                      </>
                    )}
                  </button>
                </div>
              </DialogFooter>
            </form>
          )}

          {/* Sukses Booking Dialog */}
          {bookingSuccessResult && (
            <div className="flex-1 overflow-y-auto px-5 py-8 text-center space-y-3 pb-[max(16px,env(safe-area-inset-bottom))]">
              <div className="w-12 h-12 rounded-2xl bg-[#e2f2c8] border border-[#c9e39e] text-[#233414] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1a2610]">
                Pengajuan Sewa Siap Dikirim!
              </h3>
              <p className="text-xs text-[#526046] max-w-sm mx-auto">
                Kode Pengajuan: <span className="font-mono font-bold text-[#1a2610]">{bookingSuccessResult.rentalCode}</span>
                <br />
                Total Estimasi: <span className="font-bold text-[#233414] tabular-nums">Rp {bookingSuccessResult.totalEstimasi.toLocaleString('id-ID')}</span>
              </p>
              <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
                <a
                  href={bookingSuccessResult.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#D4F63D]" />
                  <span>Kirim ke WhatsApp Pengurus</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsBookingOpen(false);
                    setBookingSuccessResult(null);
                  }}
                  className="py-2 text-xs font-semibold text-[#5b6950] hover:text-[#1a2610] transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SewaAlatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center font-sans">
          <div className="w-6 h-6 border-2 border-[#233414] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SewaAlatContent />
    </Suspense>
  );
}
