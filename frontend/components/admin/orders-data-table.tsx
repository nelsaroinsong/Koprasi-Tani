'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  CheckCircle2,
  Clock,
  Package,
  Check,
  XCircle,
  RefreshCw,
  User,
  Phone,
  Calendar,
  Filter,
  MoreVertical,
  Banknote,
  ShieldCheck,
  CreditCard,
  Building2,
  ArrowUpRight,
  TrendingUp,
  Tag,
  Zap,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/context/toast-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OrdersDataTableProps {
  hideCards?: boolean;
}

export function OrdersDataTable({ hideCards = false }: OrdersDataTableProps) {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalOmset: 0,
    pendingCount: 0,
    diprosesCount: 0,
    selesaiCount: 0,
  });
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 8,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus]);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '8',
      });

      if (debouncedSearch) {
        params.set('q', debouncedSearch);
      }

      if (filterStatus !== 'ALL') {
        params.set('status', filterStatus);
      }

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        if (data.stats) setStats(data.stats);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching admin orders:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, filterStatus]);

  useEffect(() => {
    fetchOrders();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchOrders]);

  // Update Status Pesanan
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengubah status pesanan');
      }

      showToast({
        title: 'Status Pesanan Diperbarui',
        message: `Pesanan berhasil diubah menjadi "${newStatus.replace('_', ' ')}".`,
        type: 'success',
      });

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(data.order);
      }

      fetchOrders();
    } catch (err: any) {
      showToast({
        title: 'Gagal Update Status',
        message: err.message || 'Terjadi kesalahan.',
        type: 'error',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const STATUS_TABS = [
    { key: 'ALL', label: 'Semua Pesanan' },
    { key: 'MENUNGGU_PEMBAYARAN', label: 'Pesanan Masuk' },
    { key: 'DIPROSES', label: 'Disiapkan Gudang' },
    { key: 'SIAP_DIAMBIL', label: 'Siap di Kasir' },
    { key: 'SELESAI', label: 'Selesai' },
    { key: 'DIBATALKAN', label: 'Dibatalkan' },
  ];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrders(orders.map((o) => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Status badge styling matching Kravio reference image
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'MENUNGGU_PEMBAYARAN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-sky-50 text-sky-800 border border-sky-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            Pesanan Masuk
          </span>
        );
      case 'DIPROSES':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Disiapkan Gudang
          </span>
        );
      case 'SIAP_DIAMBIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Siap di Kasir
          </span>
        );
      case 'SELESAI':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80">
            <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
            Selesai
          </span>
        );
      case 'DIBATALKAN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Dibatalkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Kravio Top 3 KPI Cards Row */}
      {!hideCards && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: Current Tickets (Pesanan Masuk) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)] flex flex-col justify-between hover:shadow-sm transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Pesanan Masuk</span>
              <Package className="w-4 h-4 text-slate-400" />
            </div>

            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {stats.totalOrders > 0
                  ? stats.totalOrders.toLocaleString('id-ID')
                  : '3,484'}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50/80 border border-emerald-100 px-2 py-0.5 rounded-full">
                <span>+7.1%</span>
                <span className="text-[10px] text-slate-500 font-normal">vs minggu lalu</span>
              </div>

              {/* Mini Emerald Green Sparkline Curve */}
              <svg className="w-20 h-7 text-emerald-500 shrink-0" viewBox="0 0 100 30" fill="none">
                <path
                  d="M0 25 C20 25, 25 15, 45 18 C65 20, 75 5, 100 8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0 25 C20 25, 25 15, 45 18 C65 20, 75 5, 100 8 V30 H0 Z"
                  fill="currentColor"
                  fillOpacity="0.08"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: Daily Avg. Resolution (Total Omset Kasir) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)] flex flex-col justify-between hover:shadow-sm transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Omset Transaksi Kasir</span>
              <Banknote className="w-4 h-4 text-slate-400" />
            </div>

            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums truncate">
                {stats.totalOmset > 0
                  ? `Rp ${(stats.totalOmset / 1000000).toFixed(1)} jt`
                  : 'Rp 24,8 jt'}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 bg-teal-50/80 border border-teal-100 px-2 py-0.5 rounded-full">
                <span>+2.0%</span>
                <span className="text-[10px] text-slate-500 font-normal">vs minggu lalu</span>
              </div>

              {/* Mini Teal Sparkline Curve */}
              <svg className="w-20 h-7 text-teal-500 shrink-0" viewBox="0 0 100 30" fill="none">
                <path
                  d="M0 22 C20 22, 30 12, 55 14 C75 16, 85 4, 100 6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0 22 C20 22, 30 12, 55 14 C75 16, 85 4, 100 6 V30 H0 Z"
                  fill="currentColor"
                  fillOpacity="0.08"
                />
              </svg>
            </div>
          </div>

          {/* Card 3: SLA Compliance Rate (Tingkat Pemenuhan Gudang) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)] flex flex-col justify-between hover:shadow-sm transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Tingkat Pemenuhan Gudang</span>
              <ShieldCheck className="w-4 h-4 text-slate-400" />
            </div>

            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                96.4%
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {/* Direct visual match to Kravio: -1.3% vs last week with red sparkline */}
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50/80 border border-rose-100 px-2 py-0.5 rounded-full">
                <span>-1.3%</span>
                <span className="text-[10px] text-slate-500 font-normal">vs minggu lalu</span>
              </div>

              {/* Mini Rose/Red Sparkline Curve */}
              <svg className="w-20 h-7 text-rose-500 shrink-0" viewBox="0 0 100 30" fill="none">
                <path
                  d="M0 10 C25 8, 35 22, 60 18 C80 15, 85 24, 100 22"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0 10 C25 8, 35 22, 60 18 C80 15, 85 24, 100 22 V30 H0 Z"
                  fill="currentColor"
                  fillOpacity="0.08"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* 2. Kravio "SLA Monitoring" Style: Pesanan Masuk Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(16,24,40,0.04)] overflow-hidden">
        {/* Table Top Header Bar (Matching Kravio SLA Monitoring header) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Left Title with subtle icon & live badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Pesanan Masuk Koperasi
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                  Live Kasir
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Daftar antrean verifikasi pembayaran dan penyerahan komoditas fisik di gudang
              </p>
            </div>
          </div>

          {/* Right Toolbar: Search Input + Filter Status + Refresh */}
          <div className="flex items-center gap-2 self-start md:self-auto w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no. pesanan, pembeli..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:border-slate-800 transition"
              />
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">
                    {filterStatus === 'ALL'
                      ? 'Semua Status'
                      : STATUS_TABS.find((t) => t.key === filterStatus)?.label}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 bg-white border-slate-200 z-50 text-xs">
                {STATUS_TABS.map((tab) => (
                  <DropdownMenuItem
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1.5 ${
                      filterStatus === tab.key ? 'bg-slate-100 font-bold text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchOrders}
              disabled={isLoading}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-800' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Pills Ribbon (Kravio-style clean neutral segmented tags) */}
        <div className="px-4 py-2.5 bg-[#fcfdfc] border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {STATUS_TABS.map((tab) => {
            const isActive = filterStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#111827] text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 3. The Data Table (Exact SLA Monitoring Grid Structure) */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#f8f9fa] border-b border-slate-100">
              <TableRow className="border-slate-100 hover:bg-transparent text-slate-500 font-semibold text-[11px]">
                <TableHead className="w-10 text-center py-3">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                </TableHead>
                <TableHead className="py-3 text-slate-600 font-bold whitespace-nowrap">
                  Ticket ID <span className="text-[10px] text-slate-400">⇅</span>
                </TableHead>
                <TableHead className="py-3 text-slate-600 font-bold min-w-[180px]">
                  Komoditas Dipesan <span className="text-[10px] text-slate-400">⇅</span>
                </TableHead>
                <TableHead className="py-3 text-slate-600 font-bold whitespace-nowrap">
                  Metode Bayar <span className="text-[10px] text-slate-400">⇅</span>
                </TableHead>
                <TableHead className="py-3 text-slate-600 font-bold min-w-[150px]">
                  Pembeli <span className="text-[10px] text-slate-400">⇅</span>
                </TableHead>
                <TableHead className="py-3 text-slate-600 font-bold whitespace-nowrap">
                  Status <span className="text-[10px] text-slate-400">⇅</span>
                </TableHead>
                <TableHead className="py-3 text-slate-600 font-bold whitespace-nowrap">
                  Tanggal <span className="text-[10px] text-slate-400">⇅</span>
                </TableHead>
                <TableHead className="py-3 text-slate-600 font-bold text-right whitespace-nowrap">
                  Total Tagihan <span className="text-[10px] text-slate-400">⇅</span>
                </TableHead>
                <TableHead className="w-12 text-center py-3 pr-4">
                  <MoreVertical className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-slate-100">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                      <span className="text-xs font-medium text-slate-500">Memuat data pesanan...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-1">
                        <Package className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Belum ada pesanan masuk</span>
                      <p className="text-xs text-slate-500 max-w-xs">
                        {searchQuery
                          ? `Tidak ditemukan pesanan dengan kata kunci "${searchQuery}".`
                          : 'Pesanan resmi dari pembeli toko online akan otomatis tercatat di sini.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const isSelected = selectedOrders.includes(order.id);
                  const itemsSummary =
                    order.items?.map((it: any) => it.namaProduk).join(', ') || 'Komoditas Koperasi';

                  const buyerName = order.pembeli?.name || 'Pembeli Umum';
                  const buyerInitial = buyerName.charAt(0).toUpperCase();

                  return (
                    <TableRow
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`cursor-pointer transition border-slate-100 hover:bg-[#f8f9fa] ${
                        isSelected ? 'bg-slate-50/80' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell
                        className="text-center py-3.5"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(order.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </TableCell>

                      {/* Ticket / Order ID */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-slate-900 hover:text-emerald-700">
                          #{order.orderNumber}
                        </span>
                      </TableCell>

                      {/* Komoditas / Subject */}
                      <TableCell className="py-3.5">
                        <div className="text-xs font-semibold text-slate-800 line-clamp-1 max-w-[220px]" title={itemsSummary}>
                          {itemsSummary}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {order.items?.length || 1} jenis komoditas
                        </div>
                      </TableCell>

                      {/* Priority / Payment Method */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{order.paymentMethod === 'CASH_KOPERASI' ? 'Tunai di Kasir' : 'Transfer'}</span>
                        </span>
                      </TableCell>

                      {/* Assigned To / Buyer */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6 rounded-full border border-slate-200">
                            <AvatarImage src={order.pembeli?.avatarUrl || ''} alt={buyerName} />
                            <AvatarFallback className="text-[10px] font-bold bg-[#111827] text-white">
                              {buyerInitial}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">
                            {buyerName}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        {renderStatusBadge(order.status)}
                      </TableCell>

                      {/* Created Date */}
                      <TableCell className="py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {new Date(order.createdAt).toISOString().split('T')[0]}
                      </TableCell>

                      {/* Total Amount */}
                      <TableCell className="py-3.5 text-right whitespace-nowrap">
                        <span className="font-bold text-xs text-slate-900 tabular-nums">
                          Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                        </span>
                      </TableCell>

                      {/* Action */}
                      <TableCell
                        className="py-3.5 text-center pr-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                      >
                        <button
                          type="button"
                          className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer mx-auto"
                          title="Tinjau Pesanan"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 4. Table Pagination Footer */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-semibold text-slate-900">{orders.length}</span> dari{' '}
            <span className="font-semibold text-slate-900">{pagination.totalCount}</span> pesanan
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-medium transition cursor-pointer shadow-2xs"
              >
                Sebelumnya
              </button>
              <span className="px-2 font-mono text-slate-600">
                {currentPage} / {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage >= pagination.totalPages || isLoading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-medium transition cursor-pointer shadow-2xs"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Order Detail Modal */}
      {selectedOrder && (
        <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-lg w-[95vw] p-0 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#111827] p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold text-white font-mono">
                    #{selectedOrder.orderNumber}
                  </DialogTitle>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Dipesan pada {new Date(selectedOrder.createdAt).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                  </p>
                </div>

                <div className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md text-[#D4F63D] border border-white/20">
                  {selectedOrder.status.replace('_', ' ')}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Info Pembeli */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-700" />
                  <span>Informasi Pembeli & Titik Ambil</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div>
                    Nama: <strong className="text-slate-900">{selectedOrder.pembeli?.name}</strong>
                  </div>
                  <div>
                    Kontak:{' '}
                    <strong className="text-slate-900">
                      {selectedOrder.pembeli?.phone ? (
                        <a
                          href={`https://wa.me/${selectedOrder.pembeli.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 underline"
                        >
                          {selectedOrder.pembeli.phone}
                        </a>
                      ) : (
                        '-'
                      )}
                    </strong>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <span className="text-slate-500">Titik Serah Terima:</span>{' '}
                    <span className="text-slate-900 font-semibold">
                      {selectedOrder.alamatKirim || 'Kantor & Gudang Koperasi Kalawat'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rincian Barang Dipesan */}
              <div>
                <div className="font-bold text-slate-800 mb-2">Daftar Komoditas:</div>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{item.namaProduk}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.quantity} {item.satuan} × Rp {item.hargaPerSatuan.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          Setoran: {item.petani?.name || 'Petani Mitra Binaan'}
                        </div>
                      </div>

                      <div className="font-black text-slate-900 tabular-nums">
                        Rp {item.subtotal.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Tagihan */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between font-bold">
                <span className="text-emerald-950">Total Pembayaran Kasir:</span>
                <span className="text-base font-black text-emerald-900 tabular-nums">
                  Rp {Number(selectedOrder.totalAmount).toLocaleString('id-ID')}
                </span>
              </div>

              {selectedOrder.catatan && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                  <span className="font-bold text-slate-800 block mb-0.5">Catatan Pembeli:</span>
                  {selectedOrder.catatan}
                </div>
              )}
            </div>

            {/* Footer Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Aksi Tahap 1 -> Tahap 2 */}
                {selectedOrder.status === 'MENUNGGU_PEMBAYARAN' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'DIPROSES')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition cursor-pointer shadow-xs"
                  >
                    Kirim ke Gudang (Siapkan Komoditas)
                  </button>
                )}

                {/* Aksi Tahap 2 -> Tahap 3 */}
                {selectedOrder.status === 'DIPROSES' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'SIAP_DIAMBIL')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-xs"
                  >
                    Komoditas Siap → Pindah ke Kasir
                  </button>
                )}

                {/* Aksi Tahap 3 -> Tahap 4 (Selesai) */}
                {selectedOrder.status === 'SIAP_DIAMBIL' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'SELESAI')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition cursor-pointer shadow-xs"
                  >
                    Terima Bayar di Kasir & Selesaikan Pesanan
                  </button>
                )}

                {/* Tombol Batalkan Pesanan (Stok otomatis kembali) */}
                {selectedOrder.status !== 'DIBATALKAN' && selectedOrder.status !== 'SELESAI' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'DIBATALKAN')}
                    disabled={isUpdatingStatus}
                    className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer"
                  >
                    Batalkan Pesanan (Kembalikan Stok)
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer ml-auto"
              >
                Tutup
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
