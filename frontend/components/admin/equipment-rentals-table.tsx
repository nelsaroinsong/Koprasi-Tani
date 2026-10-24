'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  CheckCircle2,
  Clock,
  Check,
  XCircle,
  X,
  RefreshCw,
  Loader2,
  User,
  Phone,
  MapPin,
  Calendar,
  Tractor,
  ExternalLink,
  ShieldCheck,
  Banknote,
  Printer,
  Copy,
  Download,
  AlertTriangle,
  MoreVertical,
  Eye,
  FileText,
  Wallet,
  ChevronDown,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/context/toast-context';
import type { EquipmentRentalOrder, EquipmentRentalStatus } from '@/lib/equipment-rentals';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

const STATUS_TABS: { key: string; label: string; dot: string }[] = [
  { key: 'ALL', label: 'Semua', dot: 'bg-slate-400' },
  { key: 'MENUNGGU_PERSETUJUAN_ADMIN', label: 'Perlu Approval', dot: 'bg-amber-500' },
  { key: 'DISETUJUI', label: 'Disetujui', dot: 'bg-blue-500' },
  { key: 'SIAP_DIAMBIL', label: 'Siap Diambil', dot: 'bg-indigo-500' },
  { key: 'SEDANG_DISEWA', label: 'Sedang Dipakai', dot: 'bg-purple-500' },
  { key: 'SELESAI', label: 'Selesai', dot: 'bg-emerald-500' },
  { key: 'DITOLAK', label: 'Ditolak / Batal', dot: 'bg-rose-500' },
];

/**
 * Komponen Timeline 4-Tahap Alur Sewa Alat (Persis Toko / Shipment Event)
 * Tahap 1: Diajukan (FileText)
 * Tahap 2: Disetujui (ShieldCheck) - atau Ditolak (XCircle)
 * Tahap 3: Siap Diambil / Di Pool Koperasi (Tractor)
 * Tahap 4: Selesai & Kembali (Check)
 */
function RentalEventTimeline({ status }: { status: EquipmentRentalStatus }) {
  const isRejected = status === 'DITOLAK' || status === 'DIBATALKAN';

  let stepLevel = 1;
  if (status === 'DISETUJUI') stepLevel = 2;
  else if (status === 'SIAP_DIAMBIL' || status === 'SEDANG_DISEWA') stepLevel = 3;
  else if (status === 'SELESAI') stepLevel = 4;

  const milestones = [
    { num: 1, label: 'Diajukan', icon: FileText },
    { num: 2, label: 'Disetujui', icon: ShieldCheck },
    { num: 3, label: 'Siap Diambil', icon: Tractor },
    { num: 4, label: 'Selesai', icon: Check },
  ];

  return (
    <div className="flex items-center w-[140px] select-none">
      {milestones.map((m, idx) => {
        const Icon = m.icon;
        const isReached = !isRejected && stepLevel >= m.num;
        const isCurrent = !isRejected && stepLevel === m.num;
        const isNextLineFilled = !isRejected && stepLevel > m.num;

        return (
          <React.Fragment key={m.num}>
            {/* Circle Node */}
            <div
              className={`relative flex items-center justify-center shrink-0 w-6 h-6 rounded-full transition-all duration-200 ${
                isRejected && m.num === 1
                  ? 'bg-slate-900 text-white'
                  : isRejected && m.num === 2
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isRejected
                  ? 'bg-white border border-slate-200 text-slate-300'
                  : isReached
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-300'
              } ${isCurrent && m.num < 4 ? 'ring-2 ring-slate-900/15' : ''}`}
              title={`Tahap ${m.num}: ${m.label}`}
            >
              {isRejected && m.num === 2 ? (
                <XCircle className="w-3.5 h-3.5" />
              ) : (
                <Icon
                  className={`w-3 h-3 ${
                    isReached || (isRejected && m.num === 1)
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
                  isRejected && m.num === 1
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

export function EquipmentRentalsTable() {
  const { showToast } = useToast();

  const [rentals, setRentals] = useState<EquipmentRentalOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedRentals, setSelectedRentals] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selected Rental for Detail Modal
  const [selectedRental, setSelectedRental] = useState<EquipmentRentalOrder | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus]);

  // Fetch Rentals from Admin API
  const fetchRentals = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/equipment-rentals');
      const data = await res.json();
      if (res.ok && Array.isArray(data.rentals)) {
        setRentals(data.rentals);
      }
    } catch (err: any) {
      console.error('Error fetching admin rentals:', err);
      showToast('Tidak dapat mengambil daftar pengajuan sewa alat.');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  // Filter & Search data on client
  const filteredRentals = useMemo(() => {
    let result = rentals;

    if (filterStatus !== 'ALL') {
      if (filterStatus === 'DITOLAK') {
        result = result.filter(
          (r) => r.status === 'DITOLAK' || r.status === 'DIBATALKAN'
        );
      } else {
        result = result.filter((r) => r.status === filterStatus);
      }
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.rentalCode.toLowerCase().includes(q) ||
          r.userName.toLowerCase().includes(q) ||
          (r.userPhone && r.userPhone.includes(q)) ||
          r.userEmail.toLowerCase().includes(q) ||
          (r.lokasiLahan && r.lokasiLahan.toLowerCase().includes(q)) ||
          r.items.some((it) => it.nama.toLowerCase().includes(q))
      );
    }

    return result;
  }, [rentals, filterStatus, debouncedSearch]);

  // Status counts for tabs
  const stats = useMemo(() => {
    const total = rentals.length;
    let pendingApproval = 0;
    let approved = 0;
    let ready = 0;
    let rented = 0;
    let completed = 0;
    let rejected = 0;

    for (const r of rentals) {
      if (r.status === 'MENUNGGU_PERSETUJUAN_ADMIN') pendingApproval++;
      else if (r.status === 'DISETUJUI') approved++;
      else if (r.status === 'SIAP_DIAMBIL') ready++;
      else if (r.status === 'SEDANG_DISEWA') rented++;
      else if (r.status === 'SELESAI') completed++;
      else if (r.status === 'DITOLAK' || r.status === 'DIBATALKAN') rejected++;
    }

    return { total, pendingApproval, approved, ready, rented, completed, rejected };
  }, [rentals]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRentals.length / itemsPerPage) || 1;
  const paginatedRentals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRentals.slice(start, start + itemsPerPage);
  }, [filteredRentals, currentPage, itemsPerPage]);

  // Checkbox indeterminate logic
  const isAllSelected =
    paginatedRentals.length > 0 &&
    paginatedRentals.every((r) => selectedRentals.includes(r.id));
  const isSomeSelected =
    selectedRentals.length > 0 && !isAllSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRentals((prev) =>
        prev.filter((id) => !paginatedRentals.some((r) => r.id === id))
      );
    } else {
      const pageIds = paginatedRentals.map((r) => r.id);
      setSelectedRentals((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedRentals((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Update Status Pengajuan Sewa
  const handleUpdateStatus = async (
    rentalId: string,
    newStatus: EquipmentRentalStatus
  ) => {
    try {
      setIsUpdatingStatus(true);
      const res = await fetch('/api/admin/equipment-rentals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rentalId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Status sewa alat berhasil diperbarui.');
        fetchRentals();
        if (selectedRental && selectedRental.id === rentalId) {
          setSelectedRental(data.rental);
        }
      } else {
        showToast(data.error || 'Gagal mengubah status sewa alat.');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Tidak dapat menghubungi server.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Status Badge Helper persis dengan Toko Online
  const renderStatusBadge = (status: EquipmentRentalStatus) => {
    const config: Record<
      EquipmentRentalStatus,
      { label: string; cls: string; dot: string }
    > = {
      MENUNGGU_PERSETUJUAN_ADMIN: {
        label: 'Perlu Approval',
        cls: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      },
      DISETUJUI: {
        label: 'Disetujui',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
      },
      SIAP_DIAMBIL: {
        label: 'Siap Diambil',
        cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dot: 'bg-indigo-500',
      },
      SEDANG_DISEWA: {
        label: 'Sedang Dipakai',
        cls: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
      },
      SELESAI: {
        label: 'Selesai',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      },
      DITOLAK: {
        label: 'Ditolak',
        cls: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      },
      DIBATALKAN: {
        label: 'Dibatalkan',
        cls: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      },
    };

    const s = config[status] || {
      label: status,
      cls: 'bg-slate-50 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-[11.5px] font-medium whitespace-nowrap ${s.cls}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  };

  // Helper cek delay jika pengajuan belum diapprove > 24 jam
  const checkIsDelay = (rental: EquipmentRentalOrder) => {
    if (rental.status === 'MENUNGGU_PERSETUJUAN_ADMIN') {
      const createdTime = new Date(rental.createdAt).getTime();
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

  // Fungsi Ekspor CSV / Excel menggunakan Blob + UTF-8 BOM
  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      const dataToExport =
        selectedRentals.length > 0
          ? rentals.filter((r) => selectedRentals.includes(r.id))
          : filteredRentals;

      if (dataToExport.length === 0) {
        showToast('Tidak ada data sewa untuk diekspor');
        return;
      }

      const headers = [
        'No. Sewa',
        'Pemohon',
        'No. HP',
        'Unit Alat & Durasi',
        'Jadwal Mulai',
        'Lokasi Lahan',
        'Status',
        'Total Tagihan (Rp)',
      ];

      const escapeCell = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = dataToExport.map((r) => {
        const code = `#${r.rentalCode}`;
        const pemohon = r.userName || 'Penyewa Umum';
        const hp = r.userPhone || '-';
        const alat =
          r.items
            ?.map(
              (it) =>
                `${it.nama} (${it.jumlahUnit} unit • ${it.durasi} ${it.satuanSewa}${
                  it.includeOperator ? ' + Operator' : ''
                })`
            )
            .join('; ') || 'Alat Pertanian';
        const jadwal = r.startDate || '-';
        const lokasi = r.lokasiLahan || 'Kantor Koperasi';
        const statusLabel =
          r.status === 'MENUNGGU_PERSETUJUAN_ADMIN'
            ? 'Perlu Approval'
            : r.status === 'DISETUJUI'
            ? 'Disetujui'
            : r.status === 'SIAP_DIAMBIL'
            ? 'Siap Diambil'
            : r.status === 'SEDANG_DISEWA'
            ? 'Sedang Dipakai'
            : r.status === 'SELESAI'
            ? 'Selesai'
            : 'Ditolak/Batal';
        const total = Number(r.totalEstimasi || 0);

        return [
          escapeCell(code),
          escapeCell(pemohon),
          escapeCell(hp),
          escapeCell(alat),
          escapeCell(jadwal),
          escapeCell(lokasi),
          escapeCell(statusLabel),
          total,
        ];
      });

      const csvContent = [
        headers.map((h) => `"${h}"`).join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\r\n');

      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `sewa-alat-koperasi-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Berhasil mengekspor ${dataToExport.length} data sewa alat`);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekspor data sewa alat');
    } finally {
      setIsExporting(false);
    }
  };

  // Cetak Surat Bukti & Perjanjian Sewa Alat
  const handlePrintReceipt = (rental: EquipmentRentalOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Izinkan popup browser untuk mencetak surat jalan / bukti sewa');
      return;
    }

    const itemsRows =
      rental.items
        ?.map(
          (it) => `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px dashed #eee;">
          <strong>${it.nama}</strong><br/>
          <small style="color: #666;">${it.jumlahUnit} unit × ${it.durasi} ${it.satuanSewa} ${
            it.includeOperator ? '• (Termasuk Operator)' : '• (Mandiri)'
          }</small>
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
          <title>Bukti Sewa #${rental.rentalCode} - Koperasi Tani</title>
          <style>
            body { font-family: monospace; font-size: 13px; max-width: 360px; margin: 20px auto; padding: 10px; color: #111; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .title { font-size: 16px; font-weight: bold; }
            .subtitle { font-size: 11px; color: #555; }
            .info { margin-bottom: 10px; line-height: 1.5; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px; }
            .total { border-top: 2px dashed #000; padding-top: 8px; font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; }
            .signatures { display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px; text-align: center; }
            .sign-box { width: 45%; }
            .sign-line { margin-top: 45px; border-top: 1px solid #333; }
            .footer { text-align: center; margin-top: 25px; font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">KOPERASI TANI SINAR PAGI</div>
            <div class="subtitle">Unit Usaha Jasa Sewa Mesin Pertanian</div>
            <div style="margin-top: 5px; font-weight: bold;">SURAT BUKTI SEWA ALAT</div>
          </div>

          <div class="info">
            <div><strong>No. Sewa:</strong> #${rental.rentalCode}</div>
            <div><strong>Pemohon:</strong> ${rental.userName}</div>
            <div><strong>No. HP/WA:</strong> ${rental.userPhone || '-'}</div>
            <div><strong>Mulai Sewa:</strong> ${rental.startDate}</div>
            <div><strong>Lokasi:</strong> ${rental.lokasiLahan || 'Kantor Koperasi'}</div>
            <div><strong>Status:</strong> ${rental.status}</div>
          </div>

          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 4px;">Unit Mesin / Alat</th>
                <th style="text-align: right; padding-bottom: 4px;">Biaya</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="total">
            <span>TOTAL ESTIMASI:</span>
            <span>Rp ${Number(rental.totalEstimasi).toLocaleString('id-ID')}</span>
          </div>

          <div class="signatures">
            <div class="sign-box">
              <div>Petugas Koperasi</div>
              <div class="sign-line">( ..................... )</div>
            </div>
            <div class="sign-box">
              <div>Penyewa Alat</div>
              <div class="sign-line">( ${rental.userName} )</div>
            </div>
          </div>

          <div class="footer">
            Harap mengembalikan unit tepat waktu dalam kondisi bersih dan terawat.<br/>
            Terima kasih telah bermitra dengan Koperasi Tani.
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Kravio Outer Double-Container Shell (Persis Toko) */}
      <div
        className="rounded-2xl border border-[#E5E7EB] p-1.5"
        style={HATCHED_BG_STYLE}
      >
        {/* Header: judul + total count */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Tractor className="w-4 h-4 text-slate-600 stroke-[1.8]" />
            <h2 className="text-[13.5px] font-semibold text-slate-800 tracking-tight">
              Persetujuan & Pengajuan Sewa Alat
            </h2>
            <span className="h-5 px-1.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 tabular-nums flex items-center">
              {stats.total}
            </span>
          </div>
        </div>

        {/* Tab Status Segmented Pills */}
        <div className="px-3 pb-2 overflow-x-auto no-scrollbar">
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {STATUS_TABS.map((tab) => {
              const isActive = filterStatus === tab.key;
              let count = stats.total;
              if (tab.key === 'MENUNGGU_PERSETUJUAN_ADMIN') count = stats.pendingApproval;
              if (tab.key === 'DISETUJUI') count = stats.approved;
              if (tab.key === 'SIAP_DIAMBIL') count = stats.ready;
              if (tab.key === 'SEDANG_DISEWA') count = stats.rented;
              if (tab.key === 'SELESAI') count = stats.completed;
              if (tab.key === 'DITOLAK') count = stats.rejected;

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

        {/* Toolbar: cari, reset, ekspor, refresh */}
        <div className="px-3 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode sewa, pemohon, alat, lokasi..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-[#E5E7EB] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              />
            </div>

            {(searchQuery || filterStatus !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus('ALL');
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
              onClick={fetchRentals}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
              title="Segarkan data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-800' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Inner Card Tabel Data Sewa Alat */}
        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 text-center py-3">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 accent-slate-900 cursor-pointer transition"
                      aria-label="Pilih semua data di halaman ini"
                    />
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    No. Sewa
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Alur Sewa
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Status
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Jadwal Mulai & Lokasi
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Unit Alat & Durasi
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Pemohon
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap text-right">
                    Total Estimasi
                  </TableHead>
                  <TableHead className="w-12 py-3 text-center pr-3">
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-400">
                          Memuat data pengajuan sewa alat...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedRentals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Tractor className="w-6 h-6 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-600">
                          Tidak ada pengajuan sewa ditemukan
                        </span>
                        <span className="text-[11.5px] text-slate-400">
                          Coba sesuaikan kata kunci atau filter status di atas
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRentals.map((rental) => {
                    const isSelected = selectedRentals.includes(rental.id);
                    const isDelayed = checkIsDelay(rental);
                    const buyerName = rental.userName || 'Penyewa Umum';
                    const buyerInitial = buyerName.charAt(0).toUpperCase();

                    const itemsSummary =
                      rental.items?.map((it) => `${it.nama} (${it.jumlahUnit} unit)`).join(', ') ||
                      'Unit Alat Pertanian';

                    return (
                      <TableRow
                        key={rental.id}
                        onClick={() => setSelectedRental(rental)}
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
                            onChange={() => handleToggleSelect(rental.id)}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 accent-slate-900 cursor-pointer transition"
                            aria-label={`Pilih sewa #${rental.rentalCode}`}
                          />
                        </TableCell>

                        {/* 1. ID Pengajuan Sewa */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <span className="text-[12.5px] font-semibold text-slate-800 tabular-nums">
                            #{rental.rentalCode}
                          </span>
                        </TableCell>

                        {/* 2. Alur Sewa Timeline (Milestone) */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <RentalEventTimeline status={rental.status} />
                        </TableCell>

                        {/* 3. Status Badge (klik untuk alur maju cepat) */}
                        <TableCell
                          className="py-3 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {['SELESAI', 'DITOLAK', 'DIBATALKAN'].includes(rental.status) ? (
                            <div
                              className="inline-block cursor-default select-none opacity-95"
                              title={
                                rental.status === 'SELESAI'
                                  ? 'Sewa telah selesai & lunas (status permanen)'
                                  : 'Sewa telah ditolak/dibatalkan (status permanen)'
                              }
                            >
                              {renderStatusBadge(rental.status)}
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="cursor-pointer hover:opacity-85 transition"
                                  title="Klik untuk ubah status ke tahap berikutnya"
                                >
                                  {renderStatusBadge(rental.status)}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="start"
                                className="w-56 rounded-xl p-1 bg-white border border-slate-200 shadow-xl z-50 text-xs"
                              >
                                <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Progres Alur Sewa
                                </DropdownMenuLabel>

                                {rental.status === 'MENUNGGU_PERSETUJUAN_ADMIN' && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(rental.id, 'DISETUJUI')}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-blue-700 hover:bg-blue-50 font-medium"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Setujui (Approve)</span>
                                  </DropdownMenuItem>
                                )}

                                {rental.status === 'DISETUJUI' && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(rental.id, 'SIAP_DIAMBIL')}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-indigo-700 hover:bg-indigo-50 font-medium"
                                  >
                                    <Tractor className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Unit Siap di Koperasi</span>
                                  </DropdownMenuItem>
                                )}

                                {rental.status === 'SIAP_DIAMBIL' && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(rental.id, 'SEDANG_DISEWA')}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-purple-700 hover:bg-purple-50 font-medium"
                                  >
                                    <Tractor className="w-3.5 h-3.5 text-purple-600" />
                                    <span>Serahkan Unit ke Penyewa</span>
                                  </DropdownMenuItem>
                                )}

                                {rental.status === 'SEDANG_DISEWA' && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(rental.id, 'SELESAI')}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 font-semibold"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                                    <span>Unit Kembali & Selesai</span>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator className="my-1 border-slate-100" />

                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(rental.id, 'DITOLAK')}
                                  className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Tolak / Batalkan</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>

                        {/* 4. Jadwal Mulai & Lokasi (dengan Tag Delay jika unapproved > 24 jam) */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] text-slate-800 font-medium">
                              {rental.startDate}
                            </span>
                            {isDelayed && (
                              <span
                                className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold"
                                title="Menunggu approval lebih dari 24 jam"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Tertunda
                              </span>
                            )}
                          </div>
                          <div
                            className="text-[11px] text-slate-400 truncate max-w-[170px] mt-0.5"
                            title={rental.lokasiLahan || 'Kantor Koperasi'}
                          >
                            {rental.lokasiLahan || 'Kantor & Pool Koperasi'}
                          </div>
                        </TableCell>

                        {/* 5. Unit Alat & Durasi */}
                        <TableCell className="py-3">
                          <div
                            className="text-[12.5px] font-medium text-slate-800 truncate max-w-[200px]"
                            title={itemsSummary}
                          >
                            {itemsSummary}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {rental.items?.map((it) => `${it.durasi} ${it.satuanSewa}`).join(', ') || '1 hari'}
                            {rental.items?.some((it) => it.includeOperator) && (
                              <span className="ml-1 text-emerald-600 font-medium">
                                • +Operator
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* 6. Pemohon */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6 rounded-full border border-slate-200 shrink-0">
                              <AvatarFallback className="text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {buyerInitial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="truncate max-w-[130px]">
                              <div className="text-[12.5px] font-medium text-slate-800 truncate">
                                {buyerName}
                              </div>
                              {rental.userPhone && (
                                <a
                                  href={`https://wa.me/${rental.userPhone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10.5px] text-emerald-600 hover:underline flex items-center gap-0.5"
                                >
                                  <span>{rental.userPhone}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* 7. Total Tagihan */}
                        <TableCell className="py-3 whitespace-nowrap text-right">
                          <div className="text-[12.5px] font-semibold text-slate-900 tabular-nums">
                            Rp {Number(rental.totalEstimasi).toLocaleString('id-ID')}
                          </div>
                          <div className="text-[11px] font-medium">
                            {rental.isPaid || rental.status === 'SELESAI' ? (
                              <span className="text-emerald-600">Lunas</span>
                            ) : (
                              <span className="text-amber-600">Belum lunas</span>
                            )}
                          </div>
                        </TableCell>

                        {/* 8. Menu Aksi Tiga Titik */}
                        <TableCell
                          className="py-3 text-center pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer mx-auto"
                                title="Menu Aksi Pengajuan Sewa"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 rounded-xl p-1 bg-white border border-slate-200 shadow-xl text-xs z-50 space-y-0.5"
                            >
                              <DropdownMenuItem
                                onClick={() => setSelectedRental(rental)}
                                className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-700 hover:bg-slate-100 font-medium"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Lihat Tracking Detail</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handlePrintReceipt(rental)}
                                className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-700 hover:bg-slate-100"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-500" />
                                <span>Cetak Surat Jalan / Bukti</span>
                              </DropdownMenuItem>

                              {!['SELESAI', 'DITOLAK', 'DIBATALKAN'].includes(rental.status) && (
                                <>
                                  <DropdownMenuSeparator className="my-1 border-slate-100" />
                                  <DropdownMenuLabel className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    Progres Alur
                                  </DropdownMenuLabel>

                                  {rental.status === 'MENUNGGU_PERSETUJUAN_ADMIN' && (
                                    <DropdownMenuItem
                                      onClick={() => handleUpdateStatus(rental.id, 'DISETUJUI')}
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-blue-700 hover:bg-blue-50 font-medium"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Setujui (Approve)</span>
                                    </DropdownMenuItem>
                                  )}

                                  {rental.status === 'DISETUJUI' && (
                                    <DropdownMenuItem
                                      onClick={() => handleUpdateStatus(rental.id, 'SIAP_DIAMBIL')}
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-indigo-700 hover:bg-indigo-50 font-medium"
                                    >
                                      <Tractor className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>Unit Siap di Koperasi</span>
                                    </DropdownMenuItem>
                                  )}

                                  {rental.status === 'SIAP_DIAMBIL' && (
                                    <DropdownMenuItem
                                      onClick={() => handleUpdateStatus(rental.id, 'SEDANG_DISEWA')}
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-purple-700 hover:bg-purple-50 font-medium"
                                    >
                                      <Tractor className="w-3.5 h-3.5 text-purple-600" />
                                      <span>Serahkan Unit ke Penyewa</span>
                                    </DropdownMenuItem>
                                  )}

                                  {rental.status === 'SEDANG_DISEWA' && (
                                    <DropdownMenuItem
                                      onClick={() => handleUpdateStatus(rental.id, 'SELESAI')}
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 font-semibold"
                                    >
                                      <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                                      <span>Unit Kembali & Selesai</span>
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(rental.id, 'DITOLAK')}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Tolak / Batalkan</span>
                                  </DropdownMenuItem>
                                </>
                              )}
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

          {/* Baris Bawah: Pagination */}
          <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
            <div className="flex items-center gap-2">
              <span>
                Menampilkan{' '}
                <strong className="text-slate-800">
                  {filteredRentals.length === 0
                    ? 0
                    : (currentPage - 1) * itemsPerPage + 1}
                </strong>
                -
                <strong className="text-slate-800">
                  {Math.min(currentPage * itemsPerPage, filteredRentals.length)}
                </strong>{' '}
                dari <strong className="text-slate-800">{filteredRentals.length}</strong> data
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px] text-slate-400">Limit:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
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
              <span className="px-2 text-xs font-semibold text-slate-700 tabular-nums">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 px-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition cursor-pointer shadow-2xs"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Detail Pengajuan Sewa (Persis Berdasar Toko Online) */}
      {selectedRental && (
        <Dialog
          open={Boolean(selectedRental)}
          onOpenChange={(open) => !open && setSelectedRental(null)}
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
                    Detail Sewa Alat
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <DialogTitle className="text-[17px] font-semibold text-slate-900 tabular-nums tracking-tight">
                      #{selectedRental.rentalCode}
                    </DialogTitle>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedRental.rentalCode);
                        showToast('Nomor sewa disalin ke clipboard');
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      title="Salin Nomor Sewa"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Diajukan pada{' '}
                    {new Date(selectedRental.createdAt).toLocaleDateString('id-ID', {
                      dateStyle: 'full',
                    })}
                  </p>
                </div>

                {/* Badge Status & Tombol Tutup Bersih & Rapi */}
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  {renderStatusBadge(selectedRental.status)}
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
                const status = selectedRental.status;
                const isRejected = status === 'DITOLAK' || status === 'DIBATALKAN';
                const level =
                  status === 'SELESAI'
                    ? 4
                    : status === 'SIAP_DIAMBIL' || status === 'SEDANG_DISEWA'
                    ? 3
                    : status === 'DISETUJUI'
                    ? 2
                    : 1;

                const steps = [
                  { label: 'Diajukan', desc: 'Permohonan masuk', icon: FileText },
                  { label: 'Disetujui', desc: 'Verifikasi admin', icon: ShieldCheck },
                  { label: 'Siap Diambil', desc: 'Di pool koperasi', icon: Tractor },
                  { label: 'Selesai', desc: 'Unit dikembalikan', icon: Check },
                ];

                return (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[12.5px] font-semibold text-slate-800">
                        Alur Pengajuan & Penggunaan Sewa
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {isRejected ? 'Pengajuan ditolak/dibatalkan' : `Tahap ${level} dari 4`}
                      </span>
                    </div>

                    <ol className="grid grid-cols-4">
                      {steps.map((s, i) => {
                        const num = i + 1;
                        const Icon = isRejected && num === 2 ? XCircle : s.icon;
                        const done = !isRejected && level >= num;
                        const current = !isRejected && level === num;
                        const rejectedNode = isRejected && num === 2;
                        const lineFilled = !isRejected ? level > num : num === 1;

                        return (
                          <li
                            key={s.label}
                            className="relative flex flex-col items-center text-center"
                          >
                            {i < steps.length - 1 && (
                              <span
                                className={`absolute top-4 left-1/2 w-full h-0.5 ${
                                  lineFilled
                                    ? isRejected
                                      ? 'bg-rose-200'
                                      : 'bg-slate-900'
                                    : 'bg-slate-200'
                                }`}
                              />
                            )}
                            <span
                              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition ${
                                rejectedNode
                                  ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                                  : done || (isRejected && num === 1)
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-white text-slate-300 ring-1 ring-slate-200'
                              } ${current && num < 4 ? 'ring-4 ring-slate-900/10' : ''}`}
                            >
                              <Icon className="w-4 h-4" strokeWidth={num === 4 ? 2.5 : 2} />
                            </span>
                            <span
                              className={`mt-2 text-[11.5px] font-semibold ${
                                rejectedNode
                                  ? 'text-rose-600'
                                  : done || (isRejected && num === 1)
                                  ? 'text-slate-900'
                                  : 'text-slate-400'
                              }`}
                            >
                              {rejectedNode ? 'Ditolak' : s.label}
                            </span>
                            <span className="text-[10.5px] text-slate-400 mt-0.5 leading-tight px-1">
                              {rejectedNode ? 'Pengajuan dihentikan' : s.desc}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })()}

              {/* Info Pemohon & Titik Pengambilan */}
              <section className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <h3 className="text-[12px] font-semibold text-slate-800">
                    Pemohon & Titik Serah Terima
                  </h3>
                </div>

                <dl className="divide-y divide-slate-100">
                  <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-slate-500">Nama Pemohon</dt>
                    <dd className="font-medium text-slate-900">
                      {selectedRental.userName || 'Penyewa Umum'}
                    </dd>
                  </div>

                  <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-slate-500">No. Telp / WA</dt>
                    <dd className="font-medium">
                      {selectedRental.userPhone ? (
                        <a
                          href={`https://wa.me/${selectedRental.userPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline inline-flex items-center gap-1"
                          title="Hubungi via WhatsApp"
                        >
                          {selectedRental.userPhone}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </dd>
                  </div>

                  <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="font-medium text-slate-900">
                      {selectedRental.userEmail || '-'}
                    </dd>
                  </div>

                  <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-slate-500">Jadwal Mulai</dt>
                    <dd className="font-medium text-slate-900">
                      {selectedRental.startDate}
                    </dd>
                  </div>

                  <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-slate-500">Lokasi Lahan</dt>
                    <dd className="font-medium text-slate-900 leading-relaxed">
                      {selectedRental.lokasiLahan || 'Kantor & Pool Koperasi'}
                    </dd>
                  </div>

                  <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-slate-500">Pembayaran</dt>
                    <dd className="font-medium text-slate-900 flex items-center gap-2">
                      Tunai Kasir
                      {selectedRental.isPaid || selectedRental.status === 'SELESAI' ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold">
                          Lunas
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10.5px] font-semibold">
                          Belum lunas
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Rincian Unit Alat yang Disewa */}
              <section className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tractor className="w-3.5 h-3.5 text-slate-500" />
                    <h3 className="text-[12px] font-semibold text-slate-800">
                      Unit Mesin / Alat yang Disewa
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {selectedRental.items?.length || 0} unit
                  </span>
                </div>

                <ul className="divide-y divide-slate-100">
                  {selectedRental.items?.map((item, idx) => (
                    <li
                      key={idx}
                      className="px-4 py-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-[12.5px]">
                          {item.nama}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                          {item.jumlahUnit} unit × {item.durasi} {item.satuanSewa} (Rp{' '}
                          {Number(item.hargaSewa).toLocaleString('id-ID')}/{item.satuanSewa})
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>
                            Operator:{' '}
                            <strong className={item.includeOperator ? 'text-emerald-700' : 'text-slate-600'}>
                              {item.includeOperator ? 'Ya (+ Operator Terlatih)' : 'Mandiri'}
                            </strong>
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
                  <span className="text-slate-600 font-medium">Total Estimasi Biaya</span>
                  <span className="text-[15px] font-bold text-slate-900 tabular-nums">
                    Rp {Number(selectedRental.totalEstimasi).toLocaleString('id-ID')}
                  </span>
                </div>
              </section>

              {/* Catatan Pemohon jika ada */}
              {selectedRental.catatan && (
                <section className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 text-slate-700">
                  <span className="font-semibold text-amber-800 block mb-0.5">
                    Catatan Pemohon
                  </span>
                  {selectedRental.catatan}
                </section>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handlePrintReceipt(selectedRental)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Cetak Surat Jalan / Bukti</span>
              </button>

              <div className="flex items-center gap-2">
                {['MENUNGGU_PERSETUJUAN_ADMIN', 'DISETUJUI', 'SIAP_DIAMBIL'].includes(
                  selectedRental.status
                ) && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedRental.id, 'DITOLAK')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tolak / Batalkan</span>
                  </button>
                )}

                {selectedRental.status === 'MENUNGGU_PERSETUJUAN_ADMIN' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedRental.id, 'DISETUJUI')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Setujui (Approve)</span>
                  </button>
                )}

                {selectedRental.status === 'DISETUJUI' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedRental.id, 'SIAP_DIAMBIL')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Tractor className="w-3.5 h-3.5" />
                    <span>Unit Siap di Koperasi</span>
                  </button>
                )}

                {selectedRental.status === 'SIAP_DIAMBIL' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedRental.id, 'SEDANG_DISEWA')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Tractor className="w-3.5 h-3.5" />
                    <span>Serahkan Unit ke Penyewa</span>
                  </button>
                )}

                {selectedRental.status === 'SEDANG_DISEWA' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedRental.id, 'SELESAI')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>Unit Kembali & Selesai</span>
                  </button>
                )}

                {selectedRental.status === 'SELESAI' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>Sewa unit telah selesai & lunas</span>
                  </span>
                )}

                {(selectedRental.status === 'DITOLAK' ||
                  selectedRental.status === 'DIBATALKAN') && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-medium">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Pengajuan sewa telah ditolak/dibatalkan</span>
                  </span>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
