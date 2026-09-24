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
  ShoppingCart,
  CheckCircle2,
  Clock,
  Package,
  Check,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  DollarSign,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/context/toast-context';

export function OrdersDataTable() {
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
    { key: 'MENUNGGU_PEMBAYARAN', label: 'Menunggu Pembayaran' },
    { key: 'DIPROSES', label: 'Disiapkan / Diproses' },
    { key: 'SIAP_DIAMBIL', label: 'Siap Diambil' },
    { key: 'SELESAI', label: 'Selesai' },
    { key: 'DIBATALKAN', label: 'Dibatalkan' },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Header Info & Quick Stats Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              Transaksi & Pesanan Masuk Koperasi
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {stats.totalOrders} Pesanan Terdata
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pantau pembayaran cash/transfer dari pembeli, siapkan barang di gudang, dan serahkan komoditas panen.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/50 hover:border-emerald-300 text-slate-600 hover:text-emerald-800 text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-700' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Omset */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Total Uang Masuk</div>
          <div className="text-base sm:text-xl font-black text-emerald-800 mt-1">
            Rp {stats.totalOmset.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Seluruh pesanan sah koperasi</div>
        </div>

        {/* Menunggu Pembayaran */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-amber-600">Menunggu Pembayaran</div>
          <div className="text-base sm:text-xl font-black text-amber-700 mt-1">
            {stats.pendingCount} <span className="text-xs font-normal text-slate-500">Pesanan</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Perlu konfirmasi cash/transfer</div>
        </div>

        {/* Sedang Diproses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-blue-600">Disiapkan di Gudang</div>
          <div className="text-base sm:text-xl font-black text-blue-700 mt-1">
            {stats.diprosesCount} <span className="text-xs font-normal text-slate-500">Pesanan</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Lunas & siap diambil/kirim</div>
        </div>

        {/* Selesai */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Pesanan Selesai</div>
          <div className="text-base sm:text-xl font-black text-slate-800 mt-1">
            {stats.selesaiCount} <span className="text-xs font-normal text-slate-500">Pesanan</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Barang sudah diterima pembeli</div>
        </div>
      </div>

      {/* 2. Toolbar & Status Filter Tabs */}
      <div className="space-y-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                filterStatus === tab.key
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari no. pesanan, nama pembeli, atau nama produk..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs transition"
          />
        </div>
      </div>

      {/* 3. Shadcn Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-emerald-50/70 border-b border-emerald-100">
            <TableRow className="hover:bg-transparent border-emerald-100">
              <TableHead className="w-12 text-center text-emerald-950 font-bold text-xs py-3.5">
                No
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                No. Pesanan & Tanggal
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Pembeli
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs min-w-[180px]">
                Komoditas Dipesan
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Metode & Total Bayar
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Status Pesanan
              </TableHead>
              <TableHead className="text-right text-emerald-950 font-bold text-xs pr-4">
                Aksi & Verifikasi
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs">Memuat daftar pesanan koperasi...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ShoppingCart className="w-8 h-8 text-slate-300 stroke-1" />
                    <span className="text-xs font-bold text-slate-700">
                      Tidak ada pesanan yang sesuai dengan filter
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Pesanan dari pembeli di toko online akan otomatis muncul di sini.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((ord, index) => {
                const rowNumber = (pagination.currentPage - 1) * pagination.limit + (index + 1);

                return (
                  <TableRow
                    key={ord.id}
                    className="hover:bg-emerald-50/30 transition-colors border-slate-100"
                  >
                    {/* No */}
                    <TableCell className="text-center font-medium text-xs text-slate-400">
                      {rowNumber}
                    </TableCell>

                    {/* No. Pesanan & Tanggal */}
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900 font-mono">
                        {ord.orderNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(ord.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </TableCell>

                    {/* Pembeli */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 rounded-lg border border-slate-200 shrink-0">
                          <AvatarImage src={ord.pembeli?.avatarUrl || ''} alt={ord.pembeli?.name || ''} />
                          <AvatarFallback className="rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {ord.pembeli?.name ? ord.pembeli.name.charAt(0).toUpperCase() : 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {ord.pembeli?.name || 'Pelanggan'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {ord.pembeli?.phone || ord.pembeli?.email || '-'}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Komoditas Dipesan */}
                    <TableCell>
                      <div className="space-y-1">
                        {ord.items.map((it: any) => (
                          <div key={it.id} className="text-xs text-slate-800">
                            <span className="font-semibold">{it.namaProduk}</span>{' '}
                            <span className="text-slate-500 font-normal">
                              ({it.quantity} {it.satuan})
                            </span>
                          </div>
                        ))}
                      </div>
                    </TableCell>

                    {/* Metode & Total Bayar */}
                    <TableCell>
                      <div className="text-xs font-extrabold text-slate-900">
                        Rp {Number(ord.totalAmount).toLocaleString('id-ID')}
                      </div>
                      <div className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {ord.paymentMethod === 'CASH_KOPERASI' ? '💵 Cash di Koperasi' : '🏦 Transfer Koperasi'}
                      </div>
                    </TableCell>

                    {/* Status Pesanan */}
                    <TableCell>
                      {ord.status === 'MENUNGGU_PEMBAYARAN' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Menunggu Bayar</span>
                        </span>
                      )}
                      {ord.status === 'DIPROSES' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          <Package className="w-3 h-3 text-blue-600" />
                          <span>Disiapkan Gudang</span>
                        </span>
                      )}
                      {ord.status === 'SIAP_DIAMBIL' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          <Check className="w-3 h-3 text-indigo-600" />
                          <span>Siap Diambil/Kirim</span>
                        </span>
                      )}
                      {ord.status === 'SELESAI' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Selesai / Lunas</span>
                        </span>
                      )}
                      {ord.status === 'DIBATALKAN' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3 text-red-500" />
                          <span>Dibatalkan</span>
                        </span>
                      )}
                    </TableCell>

                    {/* Aksi & Verifikasi */}
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Terima Pembayaran Cash / Verifikasi */}
                        {ord.status === 'MENUNGGU_PEMBAYARAN' && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, 'DIPROSES')}
                            disabled={isUpdatingStatus}
                            className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                            title="Konfirmasi Pembayaran Diterima"
                          >
                            Terima Bayar
                          </button>
                        )}

                        {ord.status === 'DIPROSES' && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, 'SIAP_DIAMBIL')}
                            disabled={isUpdatingStatus}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                            title="Tandai Barang Siap Diambil"
                          >
                            Siap Diambil
                          </button>
                        )}

                        {ord.status === 'SIAP_DIAMBIL' && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, 'SELESAI')}
                            disabled={isUpdatingStatus}
                            className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                            title="Selesaikan Transaksi & Serahkan Barang"
                          >
                            Selesai
                          </button>
                        )}

                        {/* Tombol Detail Pesanan */}
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
                        >
                          Detail
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Shadcn Pagination */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Menampilkan{' '}
            <strong className="text-slate-800">
              {orders.length > 0 ? (pagination.currentPage - 1) * pagination.limit + 1 : 0}
            </strong>
            -
            <strong className="text-slate-800">
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
            </strong>{' '}
            dari <strong className="text-slate-800">{pagination.totalCount}</strong> pesanan
          </div>

          {pagination.totalPages > 1 && (
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLoading}
                  />
                </PaginationItem>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={pageNum === currentPage}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isLoading}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage >= pagination.totalPages || isLoading}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {/* Modal Detail Pesanan */}
      {selectedOrder && (
        <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-lg w-[95vw] p-0 bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold text-white font-mono">
                    {selectedOrder.orderNumber}
                  </DialogTitle>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    Dipesan pada {new Date(selectedOrder.createdAt).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                  </p>
                </div>

                <div className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-white border border-white/30">
                  {selectedOrder.status.replace('_', ' ')}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Info Pembeli */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Informasi Pembeli</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div>
                    Nama: <strong className="text-slate-900">{selectedOrder.pembeli?.name}</strong>
                  </div>
                  <div>
                    Kontak: <strong className="text-slate-900">{selectedOrder.pembeli?.phone || '-'}</strong>
                  </div>
                  <div className="col-span-2">
                    Alamat: <span className="text-slate-800">{selectedOrder.alamatKirim || selectedOrder.pembeli?.address || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Rincian Barang Dipesan */}
              <div>
                <div className="font-bold text-slate-800 mb-2">Daftar Komoditas:</div>
                <div className="space-y-2">
                  {selectedOrder.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{item.namaProduk}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.quantity} {item.satuan} × Rp {item.hargaPerSatuan.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          Setoran Petani: {item.petani?.name || 'Petani Binaan'}
                        </div>
                      </div>

                      <div className="font-black text-slate-900">
                        Rp {item.subtotal.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Tagihan */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between font-bold">
                <span className="text-emerald-950">Total Pembayaran ke Koperasi:</span>
                <span className="text-base font-black text-emerald-900">
                  Rp {selectedOrder.totalAmount.toLocaleString('id-ID')}
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
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
              {/* Tombol Batalkan Pesanan (Stok otomatis kembali) */}
              {selectedOrder.status !== 'DIBATALKAN' && selectedOrder.status !== 'SELESAI' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'DIBATALKAN')}
                  disabled={isUpdatingStatus}
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition cursor-pointer"
                >
                  Batalkan Pesanan (Balikkan Stok)
                </button>
              )}

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
