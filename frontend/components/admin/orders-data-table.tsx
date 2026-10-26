'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  DialogClose,
} from '@/components/ui/dialog';
import {
  Search,
  CheckCircle2,
  Clock,
  Package,
  Check,
  X,
  XCircle,
  RefreshCw,
  User,
  Filter,
  MoreVertical,
  ArrowUpDown,
  Trash2,
  Eye,
  Download,
  AlertTriangle,
  Loader2,
  Store,
  Truck,
  Calendar,
  ChevronDown,
  Printer,
  Copy,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  Square,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/context/toast-context';
import { DashboardKpiCards } from '@/components/admin/dashboard-kpi-cards';
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
  isDashboard?: boolean;
}

const STATUS_TABS = [
  { key: 'ALL', label: 'Semua', dot: 'bg-slate-400' },
  { key: 'MENUNGGU_PEMBAYARAN', label: 'Menunggu Bayar', dot: 'bg-slate-500' },
  { key: 'DIPROSES', label: 'Diproses', dot: 'bg-blue-600' },
  { key: 'SIAP_DIAMBIL', label: 'Siap Diambil', dot: 'bg-indigo-600' },
  { key: 'SELESAI', label: 'Selesai', dot: 'bg-emerald-600' },
  { key: 'DIBATALKAN', label: 'Dibatalkan', dot: 'bg-rose-600' },
];

const DATE_PRESETS = [
  { key: 'ALL', label: 'Semua Tanggal' },
  { key: 'TODAY', label: 'Hari Ini' },
  { key: 'WEEK', label: '7 Hari Terakhir' },
  { key: 'MONTH', label: '30 Hari Terakhir' },
];

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

/**
 * Komponen Timeline 4-Tahap Persis Referensi Gambar (Shipment Event)
 * Tahap 1: Dipesan (Package)
 * Tahap 2: Diproses Gudang (Store/Warehouse)
 * Tahap 3: Pengiriman / Siap (Truck)
 * Tahap 4: Sampai / Selesai (Check)
 */
function OrderEventTimeline({ status }: { status: string }) {
  const isCanceled = status === 'DIBATALKAN';

  let stepLevel = 1;
  if (status === 'DIPROSES') stepLevel = 2;
  else if (status === 'SIAP_DIAMBIL') stepLevel = 3;
  else if (status === 'SELESAI') stepLevel = 4;

  const milestones = [
    { num: 1, label: 'Dipesan', icon: Package },
    { num: 2, label: 'Diproses Gudang', icon: Store },
    { num: 3, label: 'Siap Diambil', icon: Truck },
    { num: 4, label: 'Selesai Diterima', icon: Check },
  ];

  return (
    <div className="flex items-center w-[140px] select-none">
      {milestones.map((m, idx) => {
        const Icon = m.icon;
        const isReached = !isCanceled && stepLevel >= m.num;
        const isCurrent = !isCanceled && stepLevel === m.num;
        const isNextLineFilled = !isCanceled && stepLevel > m.num;

        return (
          <React.Fragment key={m.num}>
            {/* Circle Node */}
            <div
              className={`relative flex items-center justify-center shrink-0 w-6 h-6 rounded-full transition-all duration-200 ${
                isCanceled && m.num === 1
                  ? 'bg-slate-900 text-white'
                  : isCanceled && m.num === 2
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isCanceled
                  ? 'bg-white border border-slate-200 text-slate-300'
                  : isReached
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-300'
              } ${isCurrent && m.num < 4 ? 'ring-2 ring-slate-900/15' : ''}`}
              title={`Tahap ${m.num}: ${m.label}`}
            >
              {isCanceled && m.num === 2 ? (
                <XCircle className="w-3.5 h-3.5" />
              ) : (
                <Icon
                  className={`w-3 h-3 ${
                    isReached || (isCanceled && m.num === 1)
                      ? 'text-white'
                      : 'text-slate-400'
                  }`}
                  strokeWidth={m.num === 4 ? 2.5 : 2}
                />
              )}
            </div>

            {/* Connecting Horizontal Line */}
            {idx < milestones.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-0.5 rounded-full ${
                  isCanceled && m.num === 1
                    ? 'bg-rose-300'
                    : isNextLineFilled
                    ? 'bg-slate-900'
                    : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function OrdersDataTable({
  hideCards = false,
  isDashboard = false,
}: OrdersDataTableProps) {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalEquipments: 0,
    totalOrders: 0,
    totalCategories: 0,
    totalHasilPetani: 0,
    totalOmset: 0,
    pendingCount: 0,
    diprosesCount: 0,
    siapDiambilCount: 0,
    selesaiCount: 0,
    dibatalkanCount: 0,
  });
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(() =>
    isDashboard ? 'MENUNGGU_PEMBAYARAN' : 'ALL'
  );
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // States untuk Hapus Tunggal & Hapus Masal
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus, datePreset, isDashboard, limit]);

  // Efek indeterminate untuk checkbox header
  const isAllSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const isSomeSelected = selectedOrders.length > 0 && !isAllSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  // Hitung range tanggal dari preset
  const dateRange = useMemo(() => {
    if (datePreset === 'ALL') return null;
    const now = new Date();
    const end = now.toISOString();

    if (datePreset === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      return { start, end };
    }
    if (datePreset === 'WEEK') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { start, end };
    }
    if (datePreset === 'MONTH') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return { start, end };
    }
    return null;
  }, [datePreset]);

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
        limit: String(limit),
      });

      if (debouncedSearch) {
        params.set('q', debouncedSearch);
      }

      const targetStatus = isDashboard ? 'MENUNGGU_PEMBAYARAN' : filterStatus;
      if (targetStatus !== 'ALL') {
        params.set('status', targetStatus);
      }

      if (dateRange) {
        params.set('startDate', dateRange.start);
        params.set('endDate', dateRange.end);
      }

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        if (data.stats) {
          setStats((prev) => ({
            ...prev,
            ...data.stats,
          }));
        }
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching admin orders:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, limit, debouncedSearch, filterStatus, dateRange, isDashboard]);

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
            ? {
                ...o,
                status: newStatus,
                isPaid: newStatus === 'SELESAI' ? true : newStatus === 'DIBATALKAN' ? false : o.isPaid,
              }
            : o
        )
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                isPaid: newStatus === 'SELESAI' ? true : newStatus === 'DIBATALKAN' ? false : prev.isPaid,
              }
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

  // Fungsi Ekspor CSV / Excel
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);

      let dataToExport: any[] = [];

      // Jika user memilih checkbox pesanan tertentu, ekspor pesanan terpilih
      if (selectedOrders.length > 0) {
        dataToExport = orders.filter((o) => selectedOrders.includes(o.id));
      } else {
        // Ambil seluruh data pesanan sesuai filter saat ini dari server
        try {
          const params = new URLSearchParams({ export: 'true' });
          if (debouncedSearch) params.set('q', debouncedSearch);
          const targetStatus = isDashboard ? 'MENUNGGU_PEMBAYARAN' : filterStatus;
          if (targetStatus !== 'ALL') params.set('status', targetStatus);
          if (dateRange) {
            params.set('startDate', dateRange.start);
            params.set('endDate', dateRange.end);
          }
          const res = await fetch(`/api/admin/orders?${params.toString()}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            dataToExport = data.orders;
          }
        } catch (fetchErr) {
          console.warn('Gagal fetch all untuk ekspor, fallback ke data saat ini:', fetchErr);
        }

        if (dataToExport.length === 0) {
          dataToExport = orders;
        }
      }

      if (dataToExport.length === 0) {
        showToast('Tidak ada data pesanan untuk diekspor');
        return;
      }

      const headers = [
        'Ticket ID',
        'Komoditas',
        'Pembayaran',
        'Pembeli',
        'Status',
        'Tanggal',
        'Total (Rp)',
      ];

      const STATUS_LABEL_MAP: Record<string, string> = {
        MENUNGGU_PEMBAYARAN: 'Menunggu Pembayaran',
        DIPROSES: 'Diproses Gudang',
        SIAP_DIAMBIL: 'Siap Diambil',
        SELESAI: 'Selesai Diterima',
        DIBATALKAN: 'Dibatalkan',
      };

      const escapeCell = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = dataToExport.map((o) => {
        const ticketId = o.orderNumber
          ? `#${o.orderNumber}`
          : `#${o.id ? o.id.slice(0, 8) : '-'}`;

        const komoditas =
          o.items && o.items.length > 0
            ? o.items
                .map(
                  (it: any) =>
                    `${it.namaProduk || 'Komoditas'}${
                      it.quantity
                        ? ` (${it.quantity} ${it.satuan || 'unit'})`
                        : ''
                    }`
                )
                .join('; ')
            : 'Komoditas Koperasi';

        const statusBayar = o.status === 'DIBATALKAN' || !o.isPaid ? 'Belum Lunas' : 'Lunas';
        const pembayaran = `Tunai Kasir (${statusBayar})`;

        const pembeli = o.pembeli?.name
          ? `${o.pembeli.name}${o.pembeli.phone ? ` (${o.pembeli.phone})` : ''}`
          : 'Pembeli Umum';

        const statusLabel = STATUS_LABEL_MAP[o.status] || o.status;

        const tanggal = o.createdAt
          ? new Date(o.createdAt).toISOString().split('T')[0]
          : '-';

        const totalRp = Number(o.totalAmount || 0);

        return [
          escapeCell(ticketId),
          escapeCell(komoditas),
          escapeCell(pembayaran),
          escapeCell(pembeli),
          escapeCell(statusLabel),
          escapeCell(tanggal),
          totalRp,
        ];
      });

      const csvContent = [
        headers.map((h) => `"${h}"`).join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\r\n');

      // Gunakan Blob dengan UTF-8 BOM (\uFEFF) agar Microsoft Excel membaca isi file dengan benar tanpa terpotong
      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `pesanan-koperasi-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Berhasil mengekspor ${dataToExport.length} pesanan ke Excel/CSV`);
    } catch (err) {
      console.error('Gagal mengekspor pesanan:', err);
      showToast('Gagal mengekspor pesanan');
    } finally {
      setIsExporting(false);
    }
  };

  // Fungsi Cetak Struk / Nota Pesanan
  const handlePrintReceipt = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup terblokir, izinkan popup browser untuk mencetak nota');
      return;
    }

    const itemsRows =
      order.items
        ?.map(
          (it: any) => `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px dashed #eee;">
          <strong>${it.namaProduk}</strong><br/>
          <small style="color: #666;">${it.quantity} ${it.satuan} × Rp ${Number(it.hargaPerSatuan).toLocaleString('id-ID')}</small>
        </td>
        <td style="padding: 6px 0; text-align: right; border-bottom: 1px dashed #eee; font-weight: bold;">
          Rp ${Number(it.subtotal).toLocaleString('id-ID')}
        </td>
      </tr>
    `
        )
        .join('') || '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Nota #${order.orderNumber} - Koperasi Tani</title>
          <style>
            body { font-family: monospace; font-size: 13px; max-width: 320px; margin: 20px auto; padding: 10px; color: #111; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .title { font-size: 16px; font-weight: bold; }
            .info { margin-bottom: 10px; line-height: 1.5; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px; }
            .total { border-top: 2px dashed #000; padding-top: 8px; font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #555; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">KOPERASI TANI KALAWAT</div>
            <div>Struk Resmi Transaksi Komoditas</div>
            <small>${new Date(order.createdAt).toLocaleString('id-ID')}</small>
          </div>
          <div class="info">
            <strong>No. Nota:</strong> #${order.orderNumber}<br/>
            <strong>Pembeli:</strong> ${order.pembeli?.name || 'Pelanggan Umum'}<br/>
            <strong>Pembayaran:</strong> Tunai Kasir
          </div>
          <table>
            ${itemsRows}
          </table>
          <div class="total">
            <span>TOTAL:</span>
            <span>Rp ${Number(order.totalAmount).toLocaleString('id-ID')}</span>
          </div>
          <div class="footer">
            <p>Terima kasih telah berbelanja komoditas langsung dari petani binaan Koperasi.</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Status Badge ringkas dengan dot berwarna
  const STATUS_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
    MENUNGGU_PEMBAYARAN: { label: 'Menunggu Bayar', cls: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
    DIPROSES: { label: 'Diproses', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
    SIAP_DIAMBIL: { label: 'Siap Diambil', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
    SELESAI: { label: 'Selesai', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    DIBATALKAN: { label: 'Dibatalkan', cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  };

  const renderStatusBadge = (status: string) => {
    const s = STATUS_BADGE[status] || { label: status, cls: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
    return (
      <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-[11.5px] font-medium whitespace-nowrap ${s.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  };

  // Pembayaran: koperasi hanya melayani Tunai Kasir
  const renderPayment = (order: any) => (
    <div className="space-y-0.5">
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-700">
        <Wallet className="w-3.5 h-3.5 text-slate-400" />
        Tunai Kasir
      </span>
      <div className="text-[11px] font-medium">
        {order.status === 'DIBATALKAN' || !order.isPaid ? (
          <span className="text-amber-600">Belum lunas</span>
        ) : (
          <span className="text-emerald-600">Lunas</span>
        )}
      </div>
    </div>
  );

  // Helper cek delay jika pesanan belum bayar > 24 jam
  const checkIsDelay = (order: any) => {
    if (order.status === 'MENUNGGU_PEMBAYARAN' || order.status === 'DIPROSES') {
      const createdTime = new Date(order.createdAt).getTime();
      const diffHours = (Date.now() - createdTime) / (1000 * 60 * 60);
      return diffHours > 24;
    }
    return false;
  };

  // Format tanggal ringkas
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Dashboard KPI Cards */}
      {!hideCards && <DashboardKpiCards />}

      {/* 2. Kravio Outer Double-Container Shell */}
      <div
        className="rounded-2xl border border-[#E5E7EB] p-1.5"
        style={HATCHED_BG_STYLE}
      >
        {/* Header: judul + tab status */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <ShoppingBag className="w-4 h-4 text-slate-600 stroke-[1.8]" />
            <h2 className="text-[13.5px] font-semibold text-slate-800 tracking-tight">
              Pesanan Toko
            </h2>
            <span className="h-5 px-1.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 tabular-nums flex items-center">
              {stats.totalOrders}
            </span>
          </div>
        </div>

        {!isDashboard && (
          <div className="px-3 pb-2 overflow-x-auto no-scrollbar">
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              {STATUS_TABS.map((tab) => {
                const isActive = filterStatus === tab.key;
                let count = stats.totalOrders;
                if (tab.key === 'MENUNGGU_PEMBAYARAN') count = stats.pendingCount;
                if (tab.key === 'DIPROSES') count = stats.diprosesCount;
                if (tab.key === 'SIAP_DIAMBIL') count = stats.siapDiambilCount;
                if (tab.key === 'SELESAI') count = stats.selesaiCount;
                if (tab.key === 'DIBATALKAN') count = stats.dibatalkanCount;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilterStatus(tab.key)}
                    className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {tab.key !== 'ALL' && (
                      <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />
                    )}
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10.5px] tabular-nums ${
                        isActive ? 'text-white/70' : 'text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Toolbar: cari, tanggal, aksi */}
        <div className="px-3 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ID pesanan, pembeli, komoditas..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-[#E5E7EB] rounded-lg placeholder:text-slate-400 text-slate-800 focus:outline-none focus:border-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {DATE_PRESETS.find((p) => p.key === datePreset)?.label || 'Semua Tanggal'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-44 rounded-xl p-1 bg-white border border-slate-200 shadow-lg z-50 text-xs"
              >
                {DATE_PRESETS.map((preset) => (
                  <DropdownMenuItem
                    key={preset.key}
                    onClick={() => setDatePreset(preset.key)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center justify-between ${
                      datePreset === preset.key
                        ? 'bg-slate-100 font-semibold text-slate-900'
                        : 'text-slate-600'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {datePreset === preset.key && <Check className="w-3.5 h-3.5" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {(filterStatus !== 'ALL' || datePreset !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus('ALL');
                  setDatePreset('ALL');
                  setSearchQuery('');
                }}
                className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-900 font-medium rounded-lg hover:bg-white transition cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{isExporting ? 'Mengekspor...' : 'Ekspor'}</span>
            </button>

            <button
              type="button"
              onClick={fetchOrders}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
              title="Segarkan data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-800' : ''}`} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
                  title="Opsi tabel"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 rounded-xl p-1 bg-white border border-slate-200 shadow-lg text-xs z-50"
              >
                <DropdownMenuItem
                  onClick={() => setSelectedOrders(orders.map((o) => o.id))}
                  className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-700"
                >
                  <Check className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pilih Semua di Halaman</span>
                </DropdownMenuItem>
                {selectedOrders.length > 0 && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setSelectedOrders([])}
                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-700"
                    >
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>Batalkan Pilihan</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 border-slate-100" />
                    <DropdownMenuItem
                      onClick={() => setIsBulkDeleteOpen(true)}
                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-rose-600"
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

        {/* Bulk Action Bar saat ada pesanan yang dipilih (Kravio White Card Style) */}
        {selectedOrders.length > 0 && (
          <div className="mb-2 px-3.5 py-2.5 bg-white rounded-xl border border-[#ECEEF2] shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs tabular-nums shadow-2xs">
                {selectedOrders.length}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-slate-800 tracking-tight">
                  {selectedOrders.length} pesanan dipilih
                </span>
                <span className="hidden sm:inline-block text-xs text-slate-400 font-normal">
                  • dari {orders.length} di halaman ini
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedOrders([])}
                className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Batalkan Pilihan</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
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
              <TableHeader className="bg-[#FAFBFD] border-b border-[#F1F3F5]">
                <TableRow className="border-[#F1F3F5] hover:bg-transparent">
                  <TableHead className="w-10 text-center py-3">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={orders.length > 0 && selectedOrders.length === orders.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 accent-slate-900 cursor-pointer transition"
                      aria-label="Pilih semua pesanan"
                    />
                  </TableHead>

                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">ID Pesanan</TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">Alur Pesanan</TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">Status</TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">Tanggal</TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">Komoditas</TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">Pembeli</TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">Pembayaran</TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap text-right">Total</TableHead>

                  {/* 9. Aksi Tiga Titik */}
                  <TableHead className="w-12 text-center py-3 pr-3" />
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-[#F3F4F6]">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-400">Memuat alur pengiriman pesanan...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Package className="w-6 h-6 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-600">
                          Tidak ada pesanan ditemukan
                        </span>
                        <span className="text-[11.5px] text-slate-400">
                          Coba sesuaikan kata kunci atau filter status di atas
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
                    const isDelayed = checkIsDelay(order);
                    const totalQty =
                      order.items?.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0) || 1;

                    return (
                      <TableRow
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`cursor-pointer transition-colors border-[#F3F4F6] ${
                          isSelected
                            ? 'bg-slate-100/70 hover:bg-slate-100/90 font-medium text-slate-900'
                            : 'hover:bg-[#F9FAFB]'
                        }`}
                      >
                        {/* Checkbox */}
                        <TableCell
                          className="text-center py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(order.id)}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 accent-slate-900 cursor-pointer transition"
                            aria-label={`Pilih pesanan #${order.orderNumber}`}
                          />
                        </TableCell>

                        {/* 1. ID Pesanan */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <span className="text-[12.5px] font-semibold text-slate-800 tabular-nums">
                            #{order.orderNumber}
                          </span>
                        </TableCell>

                        {/* 2. Alur Pesanan (Timeline) */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <OrderEventTimeline status={order.status} />
                        </TableCell>

                        {/* 3. Status Badge (klik untuk ubah status cepat) */}
                        <TableCell
                          className="py-3 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.status === 'SELESAI' || order.status === 'DIBATALKAN' ? (
                            <div
                              className="inline-block cursor-default select-none opacity-95"
                              title={
                                order.status === 'SELESAI'
                                  ? 'Pesanan telah selesai & lunas (status permanen)'
                                  : 'Pesanan telah dibatalkan (status permanen)'
                              }
                            >
                              {renderStatusBadge(order.status)}
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="cursor-pointer hover:opacity-85 transition"
                                  title="Klik untuk ubah status ke tahap berikutnya"
                                >
                                  {renderStatusBadge(order.status)}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="start"
                                className="w-52 rounded-xl p-1 bg-white border border-slate-200 shadow-xl z-50 text-xs"
                              >
                                <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Progres Alur Pesanan
                                </DropdownMenuLabel>

                                {order.status === 'MENUNGGU_PEMBAYARAN' && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(order.id, 'DIPROSES')}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-blue-700 hover:bg-blue-50 font-medium"
                                  >
                                    <Store className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Kirim ke Gudang (Kemas)</span>
                                  </DropdownMenuItem>
                                )}

                                {order.status === 'DIPROSES' && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(order.id, 'SIAP_DIAMBIL')}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-indigo-700 hover:bg-indigo-50 font-medium"
                                  >
                                    <Truck className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Komoditas Siap Diambil</span>
                                  </DropdownMenuItem>
                                )}

                                {order.status === 'SIAP_DIAMBIL' && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(order.id, 'SELESAI')}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 font-semibold"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                                    <span>Terima Tunai & Selesaikan</span>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator className="my-1 border-slate-100" />

                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(order.id, 'DIBATALKAN')}
                                  className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Batalkan Pesanan</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>

                        {/* 4. Expected Date (dengan Tag Delay jika tertahan > 24 jam) */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] text-slate-600">
                              {formatDate(order.createdAt)}
                            </span>
                            {isDelayed && (
                              <span
                                className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold"
                                title="Tertahan lebih dari 24 jam"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Tertunda
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* 5. Order Items */}
                        <TableCell className="py-3">
                          <div
                            className="text-[12.5px] font-medium text-slate-800 truncate max-w-[190px]"
                            title={itemsSummary}
                          >
                            {itemsSummary}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {order.items?.length || 1} item • {totalQty} unit
                          </div>
                        </TableCell>

                        {/* 6. Pembeli */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6 rounded-full border border-slate-200 shrink-0">
                              <AvatarImage
                                src={order.pembeli?.avatarUrl || ''}
                                alt={buyerName}
                              />
                              <AvatarFallback className="text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {buyerInitial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="truncate max-w-[130px]">
                              <div className="text-[12.5px] font-medium text-slate-800 truncate">
                                {buyerName}
                              </div>
                              {order.pembeli?.phone && (
                                <a
                                  href={`https://wa.me/${order.pembeli.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10.5px] text-emerald-600 hover:underline flex items-center gap-0.5"
                                >
                                  <span>{order.pembeli.phone}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* 7. Pembayaran (Tunai Kasir) */}
                        <TableCell className="py-3 whitespace-nowrap">
                          {renderPayment(order)}
                        </TableCell>

                        {/* 8. Total */}
                        <TableCell className="py-3 whitespace-nowrap text-right">
                          <span className="text-[12.5px] font-semibold text-slate-900 tabular-nums">
                            Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                          </span>
                        </TableCell>

                        {/* 9. Aksi Tiga Titik */}
                        <TableCell
                          className="py-3 text-center pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer mx-auto"
                                title="Menu Aksi Pesanan"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-52 rounded-xl p-1 bg-white border border-slate-200 shadow-xl text-xs z-50 space-y-0.5"
                            >
                              <DropdownMenuItem
                                onClick={() => setSelectedOrder(order)}
                                className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-700 hover:bg-slate-100 font-medium"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Lihat Tracking Detail</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handlePrintReceipt(order)}
                                className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-700 hover:bg-slate-100"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-500" />
                                <span>Cetak Struk / Nota</span>
                              </DropdownMenuItem>

                              {!['SELESAI', 'DIBATALKAN'].includes(order.status) && (
                                <>
                                  <DropdownMenuSeparator className="my-1 border-slate-100" />

                                  <DropdownMenuLabel className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    Progres Alur
                                  </DropdownMenuLabel>

                                  {order.status === 'MENUNGGU_PEMBAYARAN' && (
                                    <DropdownMenuItem
                                      onClick={() => handleUpdateStatus(order.id, 'DIPROSES')}
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-blue-700 hover:bg-blue-50 font-medium"
                                    >
                                      <Store className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Kirim ke Gudang</span>
                                    </DropdownMenuItem>
                                  )}

                                  {order.status === 'DIPROSES' && (
                                    <DropdownMenuItem
                                      onClick={() => handleUpdateStatus(order.id, 'SIAP_DIAMBIL')}
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-indigo-700 hover:bg-indigo-50 font-medium"
                                    >
                                      <Truck className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>Siap Diambil di Kasir</span>
                                    </DropdownMenuItem>
                                  )}

                                  {order.status === 'SIAP_DIAMBIL' && (
                                    <DropdownMenuItem
                                      onClick={() => handleUpdateStatus(order.id, 'SELESAI')}
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 font-semibold"
                                    >
                                      <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                                      <span>Terima Tunai & Selesaikan</span>
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(order.id, 'DIBATALKAN')}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Batalkan Pesanan</span>
                                  </DropdownMenuItem>
                                </>
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

          {/* Footer Pagination Persis Gambar 3 & Gambar 4 */}
          <div className="px-4 py-3 border-t border-[#F1F3F5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
            <div className="flex items-center gap-3">
              <div>
                Menampilkan{' '}
                <strong className="text-slate-800 font-semibold">
                  {orders.length > 0 ? (currentPage - 1) * limit + 1 : 0}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-800 font-semibold">
                  {Math.min(currentPage * limit, pagination.totalCount)}
                </strong>{' '}
                dari{' '}
                <strong className="text-slate-800 font-semibold">
                  {pagination.totalCount}
                </strong>{' '}
                total pesanan masuk
              </div>

              {/* Limit Dropdown Persis Gambar 4 */}
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px] text-slate-400">Limit:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition cursor-pointer shadow-2xs"
              >
                Sebelumnya
              </button>
              <span className="px-2 text-slate-600 font-semibold tabular-nums">
                {currentPage} / {pagination.totalPages || 1}
              </span>
              <button
                type="button"
                disabled={currentPage >= pagination.totalPages || isLoading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 px-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition cursor-pointer shadow-2xs"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detail & Tracking Timeline Modal */}
      {selectedOrder && (
        <Dialog
          open={Boolean(selectedOrder)}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
        >
          <DialogContent
            showCloseButton={false}
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
            data-lenis-prevent-touch="true"
            className="sm:max-w-xl w-[95vw] gap-0 p-0 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          >
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Detail Pesanan
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <DialogTitle className="text-[17px] font-semibold text-slate-900 tabular-nums tracking-tight">
                      #{selectedOrder.orderNumber}
                    </DialogTitle>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedOrder.orderNumber);
                        showToast('Nomor pesanan disalin ke clipboard');
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      title="Salin Nomor Pesanan"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(selectedOrder.createdAt).toLocaleDateString('id-ID', {
                      dateStyle: 'full',
                    })}
                  </p>
                </div>

                {/* Badge Status & Tombol Tutup Bersih & Rapi */}
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  {renderStatusBadge(selectedOrder.status)}
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer border border-slate-200/80 shadow-2xs"
                      title="Tutup dialog"
                      aria-label="Tutup"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </DialogClose>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div
              data-lenis-prevent="true"
              data-lenis-prevent-wheel="true"
              data-lenis-prevent-touch="true"
              className="px-5 py-5 space-y-5 overflow-y-auto flex-1 min-h-0 text-xs overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
              {/* Stepper Timeline Horizontal */}
              {(() => {
                const status = selectedOrder.status;
                const isCanceled = status === 'DIBATALKAN';
                const level =
                  status === 'SELESAI' ? 4 : status === 'SIAP_DIAMBIL' ? 3 : status === 'DIPROSES' ? 2 : 1;
                const steps = [
                  { label: 'Dipesan', desc: 'Checkout masuk', icon: Package },
                  { label: 'Gudang', desc: 'Disiapkan kasir', icon: Store },
                  { label: 'Siap Diambil', desc: 'Di kasir koperasi', icon: Truck },
                  { label: 'Selesai', desc: 'Diterima pembeli', icon: Check },
                ];
                return (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[12.5px] font-semibold text-slate-800">Alur Pesanan</h3>
                      <span className="text-[11px] text-slate-400">
                        {isCanceled ? 'Pesanan dibatalkan' : `Tahap ${level} dari 4`}
                      </span>
                    </div>
                    <ol className="grid grid-cols-4">
                      {steps.map((s, i) => {
                        const num = i + 1;
                        const Icon = isCanceled && num === 2 ? XCircle : s.icon;
                        const done = !isCanceled && level >= num;
                        const current = !isCanceled && level === num;
                        const canceledNode = isCanceled && num === 2;
                        const lineFilled = !isCanceled ? level > num : num === 1;
                        return (
                          <li key={s.label} className="relative flex flex-col items-center text-center">
                            {i < steps.length - 1 && (
                              <span
                                className={`absolute top-4 left-1/2 w-full h-0.5 ${
                                  lineFilled
                                    ? isCanceled
                                      ? 'bg-rose-200'
                                      : 'bg-slate-900'
                                    : 'bg-slate-200'
                                }`}
                              />
                            )}
                            <span
                              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition ${
                                canceledNode
                                  ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                                  : done || (isCanceled && num === 1)
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-white text-slate-300 ring-1 ring-slate-200'
                              } ${current && num < 4 ? 'ring-4 ring-slate-900/10' : ''}`}
                            >
                              <Icon className="w-4 h-4" strokeWidth={num === 4 ? 2.5 : 2} />
                            </span>
                            <span
                              className={`mt-2 text-[11.5px] font-semibold ${
                                canceledNode
                                  ? 'text-rose-600'
                                  : done || (isCanceled && num === 1)
                                  ? 'text-slate-900'
                                  : 'text-slate-400'
                              }`}
                            >
                              {canceledNode ? 'Dibatalkan' : s.label}
                            </span>
                            <span className="text-[10.5px] text-slate-400 mt-0.5 leading-tight px-1">
                              {canceledNode ? 'Pesanan dihentikan' : s.desc}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })()}

              {/* Info Pembeli & Serah Terima */}
              <section className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <h3 className="text-[12px] font-semibold text-slate-800">Pembeli & Serah Terima</h3>
                </div>
                <dl className="divide-y divide-slate-100">
                  <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-slate-500">Nama</dt>
                    <dd className="font-medium text-slate-900">
                      {selectedOrder.pembeli?.name || 'Pembeli Umum'}
                    </dd>
                  </div>
                  <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-slate-500">No. Telp / WA</dt>
                    <dd className="font-medium">
                      {selectedOrder.pembeli?.phone ? (
                        <a
                          href={`https://wa.me/${selectedOrder.pembeli.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline inline-flex items-center gap-1"
                          title="Hubungi via WhatsApp"
                        >
                          {selectedOrder.pembeli.phone}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </dd>
                  </div>
                  <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-slate-500">Pembayaran</dt>
                    <dd className="font-medium text-slate-900 flex items-center gap-2">
                      Tunai Kasir
                      {selectedOrder.status === 'DIBATALKAN' || !selectedOrder.isPaid ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10.5px] font-semibold">
                          Belum lunas
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold">
                          Lunas
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-slate-500">Titik Ambil</dt>
                    <dd className="font-medium text-slate-900 leading-relaxed">
                      {selectedOrder.alamatKirim || 'Kantor & Gudang Koperasi (Ambil Langsung)'}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Rincian Komoditas + Total */}
              <section className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                    <h3 className="text-[12px] font-semibold text-slate-800">Komoditas Dipesan</h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {selectedOrder.items?.length || 0} item
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {selectedOrder.items?.map((item: any) => (
                    <li key={item.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-[12.5px]">
                          {item.namaProduk}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                          {item.quantity} {item.satuan} × Rp{' '}
                          {Number(item.hargaPerSatuan).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">
                          Petani mitra:{' '}
                          <span className="text-emerald-700 font-medium">
                            {item.petani?.name || 'Petani Binaan Koperasi'}
                          </span>
                        </div>
                      </div>
                      <div className="font-semibold text-slate-900 tabular-nums text-right text-[12.5px] shrink-0">
                        Rp {Number(item.subtotal).toLocaleString('id-ID')}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Total Pesanan</span>
                  <span className="text-[15px] font-bold text-slate-900 tabular-nums">
                    Rp {Number(selectedOrder.totalAmount).toLocaleString('id-ID')}
                  </span>
                </div>
              </section>

              {selectedOrder.catatan && (
                <section className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 text-slate-700">
                  <span className="font-semibold text-amber-800 block mb-0.5">Catatan Pembeli</span>
                  {selectedOrder.catatan}
                </section>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handlePrintReceipt(selectedOrder)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Cetak Struk / Nota</span>
              </button>

              <div className="flex items-center gap-2">
                {['MENUNGGU_PEMBAYARAN', 'DIPROSES', 'SIAP_DIAMBIL'].includes(selectedOrder.status) && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'DIBATALKAN')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Batalkan</span>
                  </button>
                )}

                {selectedOrder.status === 'MENUNGGU_PEMBAYARAN' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'DIPROSES')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Kirim ke Gudang (Kemas)</span>
                  </button>
                )}

                {selectedOrder.status === 'DIPROSES' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'SIAP_DIAMBIL')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Komoditas Siap Diambil</span>
                  </button>
                )}

                {selectedOrder.status === 'SIAP_DIAMBIL' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'SELESAI')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>Terima Tunai & Selesaikan</span>
                  </button>
                )}

                {selectedOrder.status === 'SELESAI' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>Transaksi telah selesai & lunas</span>
                  </span>
                )}

                {selectedOrder.status === 'DIBATALKAN' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-medium">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Pesanan telah dibatalkan</span>
                  </span>
                )}
              </div>
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
                Data pesanan akan dihapus permanen dari sistem koperasi dan stok komoditas akan dikembalikan bila belum selesai.
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
                Tindakan ini tidak dapat dibatalkan. Data transaksi akan dihapus dari riwayat pesanan koperasi.
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
                  <span>Hapus Pesanan</span>
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
