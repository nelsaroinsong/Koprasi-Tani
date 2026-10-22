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
  Dialog,
  DialogContent,
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
  Filter,
  MoreVertical,
  Tag,
  Zap,
  Gauge,
  ArrowUpDown,
  Trash2,
  Eye,
  Download,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/context/toast-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface OrdersDataTableProps {
  hideCards?: boolean;
}

const STATUS_TABS = [
  { key: 'ALL', label: 'Semua Status' },
  { key: 'MENUNGGU_PEMBAYARAN', label: 'Pesanan Masuk' },
  { key: 'DIPROSES', label: 'Disiapkan Gudang' },
  { key: 'SIAP_DIAMBIL', label: 'Siap di Kasir' },
  { key: 'SELESAI', label: 'Selesai' },
  { key: 'DIBATALKAN', label: 'Dibatalkan' },
];

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

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
    limit: 10,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // States untuk Hapus Tunggal & Hapus Masal
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus]);

  // Efek indeterminate untuk checkbox header
  const isAllSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const isSomeSelected = selectedOrders.length > 0 && !isAllSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

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
        limit: '10',
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

      showToast(data.message || 'Status pesanan berhasil diperbarui');

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus, isPaid: newStatus === 'SELESAI' ? true : o.isPaid }
            : o
        )
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any) =>
          prev
            ? { ...prev, status: newStatus, isPaid: newStatus === 'SELESAI' ? true : prev.isPaid }
            : null
        );
      }

      fetchOrders();
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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

  // Fungsi Hapus Masal (Bulk Delete)
  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) return;
    try {
      setIsDeleting(true);
      const res = await fetch('/api/admin/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedOrders }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus pesanan terpilih');
      }

      showToast({
        title: 'Pesanan Dihapus',
        message: data.message || `${selectedOrders.length} pesanan berhasil dihapus`,
        type: 'success',
      });

      setSelectedOrders([]);
      setIsBulkDeleteOpen(false);
      fetchOrders();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menghapus',
        message: err.message || 'Terjadi kesalahan saat menghapus pesanan',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Fungsi Hapus Tunggal
  const handleSingleDelete = async () => {
    if (!orderToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/orders/${orderToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus pesanan');
      }

      showToast({
        title: 'Pesanan Dihapus',
        message: data.message || `Pesanan #${orderToDelete.orderNumber} berhasil dihapus`,
        type: 'success',
      });

      setSelectedOrders((prev) => prev.filter((id) => id !== orderToDelete.id));
      if (selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
      }
      setOrderToDelete(null);
      fetchOrders();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menghapus',
        message: err.message || 'Terjadi kesalahan saat menghapus pesanan',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Fungsi Ekspor CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      showToast('Tidak ada data pesanan untuk diekspor');
      return;
    }

    const headers = [
      'Ticket ID',
      'Komoditas',
      'Metode Pembayaran',
      'Pembeli',
      'Status',
      'Tanggal',
      'Total (Rp)',
    ];

    const rows = orders.map((o) => [
      `#${o.orderNumber}`,
      `"${(o.items?.map((it: any) => it.namaProduk).join('; ') || 'Komoditas Koperasi').replace(/"/g, '""')}"`,
      o.paymentMethod === 'CASH_KOPERASI' ? 'Tunai Kasir' : 'Transfer',
      `"${(o.pembeli?.name || 'Pembeli Umum').replace(/"/g, '""')}"`,
      o.status,
      new Date(o.createdAt).toISOString().split('T')[0],
      Number(o.totalAmount),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `pesanan-koperasi-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Daftar pesanan berhasil diekspor ke CSV');
  };

  // Signal bars indicator matching Priority column in Kravio reference image
  const renderMethodPriority = (paymentMethod: string, totalAmount: number) => {
    const isHigh = totalAmount >= 250000;
    const isMedium = totalAmount >= 75000 && totalAmount < 250000;

    return (
      <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
        <span className="inline-flex items-end gap-[2px] h-3">
          <span
            className={`w-[2.5px] h-1.5 rounded-full ${
              isHigh ? 'bg-rose-500' : isMedium ? 'bg-amber-400' : 'bg-amber-300'
            }`}
          />
          <span
            className={`w-[2.5px] h-2.5 rounded-full ${
              isHigh ? 'bg-rose-500' : isMedium ? 'bg-amber-400' : 'bg-slate-200'
            }`}
          />
          <span
            className={`w-[2.5px] h-3.5 rounded-full ${
              isHigh ? 'bg-rose-500' : 'bg-slate-200'
            }`}
          />
        </span>
        <span>{paymentMethod === 'CASH_KOPERASI' ? 'Tunai Kasir' : 'Transfer'}</span>
      </span>
    );
  };

  // Clean unbordered status indicator matching Kravio reference image (In Review, Delivered, In Progress)
  const renderStatusIndicator = (status: string) => {
    switch (status) {
      case 'MENUNGGU_PEMBAYARAN':
        return (
          <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
            <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </span>
            <span>Pesanan Masuk</span>
          </span>
        );
      case 'DIPROSES':
        return (
          <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Disiapkan Gudang</span>
          </span>
        );
      case 'SIAP_DIAMBIL':
        return (
          <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Siap di Kasir</span>
          </span>
        );
      case 'SELESAI':
        return (
          <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
            <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5] shrink-0" />
            <span>Selesai</span>
          </span>
        );
      case 'DIBATALKAN':
        return (
          <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-500">
            <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Dibatalkan</span>
          </span>
        );
      default:
        return <span className="text-[12.5px] text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Kravio Top 3 KPI Cards (Double-Container with Diagonal Hatched Outer Shell) */}
      {!hideCards && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Pesanan Masuk (Current Tickets style) */}
          <div
            className="rounded-2xl border border-[#E5E7EB] p-1.5"
            style={HATCHED_BG_STYLE}
          >
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-[13px] font-medium text-slate-700">
                Pesanan Masuk
              </span>
              <Tag className="w-4 h-4 text-slate-500 stroke-[1.75]" />
            </div>

            <div className="bg-white rounded-xl border border-[#ECEEF2] px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-end justify-between gap-3">
              <div>
                <div className="text-[28px] leading-none font-semibold tracking-tight text-slate-900 tabular-nums">
                  {stats.totalOrders > 0
                    ? stats.totalOrders.toLocaleString('id-ID')
                    : '3,484'}
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[12px]">
                  <span className="font-semibold text-emerald-600">+7.1%</span>
                  <span className="text-slate-400">vs minggu lalu</span>
                </div>
              </div>

              {/* Angular Polyline Area Chart (Emerald) */}
              <svg
                className="w-28 h-11 shrink-0 overflow-visible"
                viewBox="0 0 110 42"
                fill="none"
              >
                <defs>
                  <linearGradient id="sparkGreen1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M2 34 L18 16 L34 26 L54 8 L72 28 L88 14 L108 30 L108 42 L2 42 Z"
                  fill="url(#sparkGreen1)"
                />
                <path
                  d="M2 34 L18 16 L34 26 L54 8 L72 28 L88 14 L108 30"
                  stroke="#10B981"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: Omset Transaksi Kasir (Daily Avg. Resolution style) */}
          <div
            className="rounded-2xl border border-[#E5E7EB] p-1.5"
            style={HATCHED_BG_STYLE}
          >
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-[13px] font-medium text-slate-700">
                Omset Transaksi Kasir
              </span>
              <Zap className="w-4 h-4 text-slate-500 stroke-[1.75]" />
            </div>

            <div className="bg-white rounded-xl border border-[#ECEEF2] px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[28px] leading-none font-semibold tracking-tight text-slate-900 tabular-nums truncate">
                  {stats.totalOmset > 0
                    ? stats.totalOmset >= 1000000
                      ? `Rp ${(stats.totalOmset / 1000000).toFixed(1)} jt`
                      : `Rp ${stats.totalOmset.toLocaleString('id-ID')}`
                    : '486'}
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[12px]">
                  <span className="font-semibold text-emerald-600">+2%</span>
                  <span className="text-slate-400">vs minggu lalu</span>
                </div>
              </div>

              {/* Angular Polyline Area Chart (Emerald) */}
              <svg
                className="w-28 h-11 shrink-0 overflow-visible"
                viewBox="0 0 110 42"
                fill="none"
              >
                <defs>
                  <linearGradient id="sparkGreen2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M2 35 L20 22 L38 29 L56 15 L74 23 L92 10 L108 20 L108 42 L2 42 Z"
                  fill="url(#sparkGreen2)"
                />
                <path
                  d="M2 35 L20 22 L38 29 L56 15 L74 23 L92 10 L108 20"
                  stroke="#10B981"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 3: Tingkat Pemenuhan Gudang (SLA Compliance Rate style) */}
          <div
            className="rounded-2xl border border-[#E5E7EB] p-1.5"
            style={HATCHED_BG_STYLE}
          >
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-[13px] font-medium text-slate-700">
                Tingkat Pemenuhan Gudang
              </span>
              <Gauge className="w-4 h-4 text-slate-500 stroke-[1.75]" />
            </div>

            <div className="bg-white rounded-xl border border-[#ECEEF2] px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-end justify-between gap-3">
              <div>
                <div className="text-[28px] leading-none font-semibold tracking-tight text-slate-900 tabular-nums">
                  92%
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[12px]">
                  <span className="font-semibold text-rose-500">-1.3%</span>
                  <span className="text-slate-400">vs minggu lalu</span>
                </div>
              </div>

              {/* Angular Polyline Area Chart (Rose/Red) */}
              <svg
                className="w-28 h-11 shrink-0 overflow-visible"
                viewBox="0 0 110 42"
                fill="none"
              >
                <defs>
                  <linearGradient id="sparkRose3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M2 24 L20 34 L38 14 L56 30 L74 10 L92 22 L108 34 L108 42 L2 42 Z"
                  fill="url(#sparkRose3)"
                />
                <path
                  d="M2 24 L20 34 L38 14 L56 30 L74 10 L92 22 L108 34"
                  stroke="#F43F5E"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* 2. Kravio "SLA Monitoring" Double-Container Table */}
      <div
        className="rounded-2xl border border-[#E5E7EB] p-1.5"
        style={HATCHED_BG_STYLE}
      >
        {/* Outer Hatched Header Bar */}
        <div className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-600 stroke-[1.8]" />
            <h2 className="text-[13.5px] font-semibold text-slate-800 tracking-tight">
              Pesanan Masuk
            </h2>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pesanan..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-[#E5E7EB] rounded-lg placeholder:text-slate-400 text-slate-800 focus:outline-none focus:border-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition"
              />
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {filterStatus === 'ALL'
                      ? 'Filter'
                      : STATUS_TABS.find((t) => t.key === filterStatus)?.label}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 rounded-xl p-1 bg-white border-slate-200 shadow-lg z-50 text-xs"
              >
                {STATUS_TABS.map((tab) => (
                  <DropdownMenuItem
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1.5 ${
                      filterStatus === tab.key
                        ? 'bg-slate-100 font-semibold text-slate-900'
                        : 'text-slate-600'
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
              className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
              title="Segarkan Data Tabel"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-800' : ''}`} />
            </button>

            {/* Three Dots Menu Tabel */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
                  title="Menu Opsi Tabel"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 rounded-xl p-1 bg-white border border-slate-200 shadow-lg text-xs z-50"
              >
                <DropdownMenuItem
                  onClick={fetchOrders}
                  className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-700 hover:bg-slate-100"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Segarkan Tabel</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportCSV}
                  className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-700 hover:bg-slate-100"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ekspor CSV</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 border-slate-100" />
                <DropdownMenuItem
                  onClick={() => setSelectedOrders(orders.map((o) => o.id))}
                  className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-700 hover:bg-slate-100"
                >
                  <Check className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pilih Semua di Halaman</span>
                </DropdownMenuItem>
                {selectedOrders.length > 0 && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setSelectedOrders([])}
                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-700 hover:bg-slate-100"
                    >
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>Batalkan Pilihan (0)</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 border-slate-100" />
                    <DropdownMenuItem
                      onClick={() => setIsBulkDeleteOpen(true)}
                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Hapus Terpilih ({selectedOrders.length})</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bulk Action Bar saat ada pesanan yang dipilih */}
        {selectedOrders.length > 0 && (
          <div className="mx-3 mb-2.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-[11px]">
                {selectedOrders.length}
              </span>
              <span className="font-medium text-slate-100">
                {selectedOrders.length} pesanan dipilih
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedOrders([])}
                className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer font-medium"
              >
                Batalkan Pilihan
              </button>
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua Terpilih ({selectedOrders.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Inner White Table Box */}
        <div className="bg-white rounded-xl border border-[#ECEEF2] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white border-b border-[#F1F3F5]">
                <TableRow className="border-[#F1F3F5] hover:bg-transparent">
                  <TableHead className="w-10 text-center py-3">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={orders.length > 0 && selectedOrders.length === orders.length}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-[#18181B] cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="py-3 text-[12px] font-normal text-slate-400 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      Ticket ID <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    </span>
                  </TableHead>
                  <TableHead className="py-3 text-[12px] font-normal text-slate-400 min-w-[180px]">
                    <span className="inline-flex items-center gap-1">
                      Komoditas <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    </span>
                  </TableHead>
                  <TableHead className="py-3 text-[12px] font-normal text-slate-400 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      Metode <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    </span>
                  </TableHead>
                  <TableHead className="py-3 text-[12px] font-normal text-slate-400 min-w-[150px]">
                    <span className="inline-flex items-center gap-1">
                      Pembeli <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    </span>
                  </TableHead>
                  <TableHead className="py-3 text-[12px] font-normal text-slate-400 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      Status <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    </span>
                  </TableHead>
                  <TableHead className="py-3 text-[12px] font-normal text-slate-400 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      Tanggal <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    </span>
                  </TableHead>
                  <TableHead className="py-3 text-[12px] font-normal text-slate-400 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      Total <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    </span>
                  </TableHead>
                  <TableHead className="w-10 text-center py-3 pr-3" />
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-[#F3F4F6]">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-400">Memuat pesanan...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Package className="w-5 h-5 text-slate-300" />
                        <span className="text-xs font-medium text-slate-500">
                          Belum ada pesanan masuk
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const isSelected = selectedOrders.includes(order.id);
                    const itemsSummary =
                      order.items?.map((it: any) => it.namaProduk).join(', ') ||
                      'Komoditas Koperasi';

                    const buyerName = order.pembeli?.name || 'Pembeli Umum';
                    const buyerInitial = buyerName.charAt(0).toUpperCase();

                    return (
                      <TableRow
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`cursor-pointer transition border-[#F3F4F6] ${
                          isSelected ? 'bg-slate-50/80 hover:bg-slate-100/70' : 'hover:bg-[#F9FAFB]'
                        }`}
                      >
                        <TableCell
                          className="text-center py-3.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(order.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 accent-[#18181B] cursor-pointer"
                          />
                        </TableCell>

                        <TableCell className="py-3.5 whitespace-nowrap text-[12.5px] font-medium text-slate-600">
                          #{order.orderNumber}
                        </TableCell>

                        <TableCell className="py-3.5">
                          <div
                            className="text-[12.5px] font-medium text-slate-800 truncate max-w-[230px]"
                            title={itemsSummary}
                          >
                            {itemsSummary}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 whitespace-nowrap">
                          {renderMethodPriority(
                            order.paymentMethod,
                            Number(order.totalAmount)
                          )}
                        </TableCell>

                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5.5 h-5.5 rounded-full border border-slate-200">
                              <AvatarImage
                                src={order.pembeli?.avatarUrl || ''}
                                alt={buyerName}
                              />
                              <AvatarFallback className="text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {buyerInitial}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[12.5px] font-medium text-slate-700 truncate max-w-[130px]">
                              {buyerName}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 whitespace-nowrap">
                          {renderStatusIndicator(order.status)}
                        </TableCell>

                        <TableCell className="py-3.5 whitespace-nowrap text-[12.5px] text-slate-600">
                          {new Date(order.createdAt).toISOString().split('T')[0]}
                        </TableCell>

                        <TableCell className="py-3.5 whitespace-nowrap text-[12.5px] font-medium text-slate-700 tabular-nums">
                          Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                        </TableCell>

                        <TableCell
                          className="py-3.5 text-center pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer mx-auto"
                                title="Aksi Pesanan"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-xl p-1 bg-white border border-slate-200 shadow-lg text-xs z-50"
                            >
                              <DropdownMenuItem
                                onClick={() => setSelectedOrder(order)}
                                className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-700 hover:bg-slate-100"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Lihat Detail</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1 border-slate-100" />
                              <DropdownMenuLabel className="px-2.5 py-1 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                                Ubah Status
                              </DropdownMenuLabel>
                              {order.status !== 'DIPROSES' && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(order.id, 'DIPROSES')}
                                  className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-amber-700 hover:bg-amber-50"
                                >
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Disiapkan Gudang</span>
                                </DropdownMenuItem>
                              )}
                              {order.status !== 'SIAP_DIAMBIL' && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(order.id, 'SIAP_DIAMBIL')}
                                  className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-blue-700 hover:bg-blue-50"
                                >
                                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Siap di Kasir</span>
                                </DropdownMenuItem>
                              )}
                              {order.status !== 'SELESAI' && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(order.id, 'SELESAI')}
                                  className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Tandai Selesai</span>
                                </DropdownMenuItem>
                              )}
                              {order.status !== 'DIBATALKAN' && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(order.id, 'DIBATALKAN')}
                                  className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-600 hover:bg-slate-100"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Batalkan Pesanan</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="my-1 border-slate-100" />
                              <DropdownMenuItem
                                onClick={() => setOrderToDelete(order)}
                                className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Hapus Pesanan</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 bg-white border-t border-[#F1F3F5] flex items-center justify-between text-xs text-slate-500">
            <span>
              Halaman {currentPage} dari {Math.max(1, pagination.totalPages)}
              {pagination.totalCount > 0 && (
                <span className="text-slate-400 ml-1.5 font-normal">
                  (Total {pagination.totalCount} pesanan)
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-medium transition cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={currentPage >= pagination.totalPages || isLoading}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-medium transition cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Order Detail Modal */}
      {selectedOrder && (
        <Dialog
          open={Boolean(selectedOrder)}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
        >
          <DialogContent className="max-w-lg w-[95vw] p-0 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#18181B] p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold text-white font-mono">
                    #{selectedOrder.orderNumber}
                  </DialogTitle>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Dipesan pada{' '}
                    {new Date(selectedOrder.createdAt).toLocaleDateString('id-ID', {
                      dateStyle: 'full',
                    })}
                  </p>
                </div>

                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/15">
                  {selectedOrder.status.replace('_', ' ')}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-700" />
                  <span>Informasi Pembeli & Titik Ambil</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div>
                    Nama:{' '}
                    <strong className="text-slate-900">
                      {selectedOrder.pembeli?.name}
                    </strong>
                  </div>
                  <div>
                    Kontak:{' '}
                    <strong className="text-slate-900">
                      {selectedOrder.pembeli?.phone ? (
                        <a
                          href={`https://wa.me/${selectedOrder.pembeli.phone.replace(
                            /\D/g,
                            ''
                          )}`}
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
                      {selectedOrder.alamatKirim ||
                        'Kantor & Gudang Koperasi Kalawat'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-800 mb-2">
                  Daftar Komoditas:
                </div>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {item.namaProduk}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.quantity} {item.satuan} × Rp{' '}
                          {item.hargaPerSatuan.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          Setoran: {item.petani?.name || 'Petani Mitra Binaan'}
                        </div>
                      </div>

                      <div className="font-bold text-slate-900 tabular-nums">
                        Rp {item.subtotal.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-bold">
                <span className="text-slate-700">Total Pembayaran Kasir:</span>
                <span className="text-base font-bold text-slate-900 tabular-nums">
                  Rp {Number(selectedOrder.totalAmount).toLocaleString('id-ID')}
                </span>
              </div>

              {selectedOrder.catatan && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                  <span className="font-bold text-slate-800 block mb-0.5">
                    Catatan Pembeli:
                  </span>
                  {selectedOrder.catatan}
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectedOrder.status === 'MENUNGGU_PEMBAYARAN' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStatus(selectedOrder.id, 'DIPROSES')
                    }
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition cursor-pointer"
                  >
                    Kirim ke Gudang (Siapkan Komoditas)
                  </button>
                )}

                {selectedOrder.status === 'DIPROSES' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStatus(selectedOrder.id, 'SIAP_DIAMBIL')
                    }
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer"
                  >
                    Komoditas Siap → Pindah ke Kasir
                  </button>
                )}

                {selectedOrder.status === 'SIAP_DIAMBIL' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStatus(selectedOrder.id, 'SELESAI')
                    }
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer"
                  >
                    Terima Bayar di Kasir & Selesaikan Pesanan
                  </button>
                )}

                {selectedOrder.status !== 'DIBATALKAN' &&
                  selectedOrder.status !== 'SELESAI' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(selectedOrder.id, 'DIBATALKAN')
                      }
                      disabled={isUpdatingStatus}
                      className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer"
                    >
                      Batalkan Pesanan
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => setOrderToDelete(selectedOrder)}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Pesanan</span>
                </button>
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

      {/* 4. Modal Konfirmasi Hapus Masal (Bulk Delete) */}
      <Dialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => !open && !isDeleting && setIsBulkDeleteOpen(false)}
      >
        <DialogContent className="max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="space-y-1.5 flex-1">
              <DialogTitle className="text-base font-bold text-slate-900">
                Hapus {selectedOrders.length} Pesanan Terpilih?
              </DialogTitle>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus{' '}
                <strong className="text-slate-800 font-semibold">{selectedOrders.length} pesanan</strong>?
                Data pesanan akan dihapus permanen dari sistem koperasi dan stok komoditas akan dikembalikan ke gudang bila pesanan belum selesai.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsBulkDeleteOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleBulkDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Semua</span>
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Modal Konfirmasi Hapus 1 Pesanan */}
      <Dialog
        open={Boolean(orderToDelete)}
        onOpenChange={(open) => !open && !isDeleting && setOrderToDelete(null)}
      >
        <DialogContent className="max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="space-y-1.5 flex-1">
              <DialogTitle className="text-base font-bold text-slate-900">
                Hapus Pesanan #{orderToDelete?.orderNumber}?
              </DialogTitle>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus pesanan{' '}
                <strong className="text-slate-800 font-semibold">#{orderToDelete?.orderNumber}</strong>{' '}
                atas nama <strong className="text-slate-800 font-semibold">{orderToDelete?.pembeli?.name || 'Pembeli Umum'}</strong>?
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setOrderToDelete(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleSingleDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus</span>
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
