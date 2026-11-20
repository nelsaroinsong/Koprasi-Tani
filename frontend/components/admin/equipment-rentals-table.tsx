'use client';

import { ReasonConfirmDialog } from '@/components/admin/reason-confirm-dialog';
import { waLink } from '@/lib/utils';
import { notifyAdminDataChanged, useRefetchOnNewActivity } from '@/components/admin/admin-notifications';
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
  Trash2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/context/toast-context';
import type { EquipmentRentalOrder, EquipmentRentalStatus } from '@/lib/equipment-rentals';
import { computePaymentDeadline, type PaymentDeadlineMode } from '@/lib/rental-schedule';
import { DP_PERSEN, rincianTagihan } from '@/lib/rental-policy';
import {
  RentalInspectionDialog,
  type InspectionPayload,
  type InspectionType,
} from '@/components/admin/rental-inspection-dialog';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

const STATUS_TABS: { key: string; label: string; dot: string }[] = [
  { key: 'ALL', label: 'Semua', dot: 'bg-slate-400' },
  { key: 'MENUNGGU_PERSETUJUAN_ADMIN', label: 'Perlu Approval', dot: 'bg-amber-500' },
  { key: 'DISETUJUI', label: 'Menunggu DP', dot: 'bg-blue-500' },
  { key: 'DIKONFIRMASI', label: 'DP Lunas (Terkunci)', dot: 'bg-cyan-500' },
  { key: 'SIAP_DIAMBIL', label: 'Siap Diambil (Lunas)', dot: 'bg-indigo-500' },
  { key: 'SEDANG_DISEWA', label: 'Sedang Dipakai', dot: 'bg-purple-500' },
  { key: 'SELESAI', label: 'Selesai', dot: 'bg-emerald-500' },
  { key: 'KADALUARSA', label: 'Batas Bayar Lewat', dot: 'bg-rose-400' },
  { key: 'DITOLAK', label: 'Ditolak / Batal', dot: 'bg-rose-500' },
];

/**
 * Komponen Timeline 4-Tahap Alur Sewa Alat (Persis Toko / Shipment Event)
 * Tahap 1: Diajukan (FileText)
 * Tahap 2: Disetujui & Diberikan Batas Bayar (ShieldCheck) - atau Ditolak/Kadaluarsa (XCircle)
 * Tahap 3: Lunas Tunai Kasir & Siap Diambil (Tractor)
 * Tahap 4: Selesai & Kembali (Check)
 */
/** "2026-11-21" -> "21 Nov 2026" (tanggal kalender, tanpa geser zona waktu) */
function formatDateOnlyId(dateOnly?: string | null) {
  if (!dateOnly) return '-';
  const [y, m, d] = dateOnly.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return dateOnly;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
}

function RentalEventTimeline({ status }: { status: EquipmentRentalStatus }) {
  const isRejected = status === 'DITOLAK' || status === 'DIBATALKAN' || status === 'KADALUARSA';

  let stepLevel = 1;
  if (status === 'DISETUJUI' || status === 'DIKONFIRMASI') stepLevel = 2;
  else if (status === 'SIAP_DIAMBIL' || status === 'SEDANG_DISEWA') stepLevel = 3;
  else if (status === 'SELESAI') stepLevel = 4;

  const milestones = [
    { num: 1, label: 'Diajukan', icon: FileText },
    { num: 2, label: 'Disetujui', icon: ShieldCheck },
    { num: 3, label: 'Serah Terima', icon: Tractor },
    { num: 4, label: 'Selesai & Kembali', icon: Check },
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
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [selectedRentals, setSelectedRentals] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Modal konfirmasi hapus data sewa
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [rentalToDelete, setRentalToDelete] = useState<EquipmentRentalOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selected Rental for Detail Modal
  const [selectedRental, setSelectedRental] = useState<EquipmentRentalOrder | null>(null);
  // Konfirmasi tolak / batalkan sewa (dengan alasan untuk penyewa)
  const [rejectTarget, setRejectTarget] = useState<{
    rental: EquipmentRentalOrder;
    status: EquipmentRentalStatus;
  } | null>(null);
  // Jam berjalan untuk penanda "lewat batas" di dialog detail
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Modal Persetujuan Sewa & Penetapan Batas Bayar Kasir
  const [rentalToApprove, setRentalToApprove] = useState<EquipmentRentalOrder | null>(null);
  const [deadlineChoice, setDeadlineChoice] = useState<PaymentDeadlineMode>('H_MINUS_1');
  const [customDeadlineDate, setCustomDeadlineDate] = useState<string>('');

  // Modal Kasir: Terima Tunai & Kunci Unit
  const [rentalForCashier, setRentalForCashier] = useState<EquipmentRentalOrder | null>(null);
  const [cashierNotes, setCashierNotes] = useState<string>('Diterima tunai di loket kasir kantor koperasi');
  // DP = terima uang muka (-> DIKONFIRMASI), LUNAS = terima pelunasan penuh (-> SIAP_DIAMBIL)
  const [cashierMode, setCashierMode] = useState<'DP' | 'LUNAS'>('DP');
  const [receiptInfo, setReceiptInfo] = useState<{ label: string; amount: number } | null>(null);
  // Cek kondisi saat serah terima / pengembalian
  const [inspectionTarget, setInspectionTarget] = useState<{
    rental: EquipmentRentalOrder;
    type: InspectionType;
  } | null>(null);

  // Modal Cetak Kuitansi Kasir
  const [rentalForReceipt, setRentalForReceipt] = useState<EquipmentRentalOrder | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus, datePreset]);

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

  // Pesanan/data baru masuk -> tabel memuat ulang otomatis
  useRefetchOnNewActivity('pesananSewa', fetchRentals);

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

    if (dateRange) {
      const startMs = new Date(dateRange.start).getTime();
      const endMs = new Date(dateRange.end).getTime();
      result = result.filter((r) => {
        const itemTime = new Date(r.createdAt).getTime();
        return itemTime >= startMs && itemTime <= endMs;
      });
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
  }, [rentals, filterStatus, debouncedSearch, dateRange]);

  // Status counts for tabs
  const stats = useMemo(() => {
    const total = rentals.length;
    let pendingApproval = 0;
    let approved = 0;
    let confirmed = 0;
    let ready = 0;
    let rented = 0;
    let completed = 0;
    let expired = 0;
    let rejected = 0;

    for (const r of rentals) {
      if (r.status === 'MENUNGGU_PERSETUJUAN_ADMIN') pendingApproval++;
      else if (r.status === 'DISETUJUI') approved++;
      else if (r.status === 'DIKONFIRMASI') confirmed++;
      else if (r.status === 'SIAP_DIAMBIL') ready++;
      else if (r.status === 'SEDANG_DISEWA') rented++;
      else if (r.status === 'SELESAI') completed++;
      else if (r.status === 'KADALUARSA') expired++;
      else if (r.status === 'DITOLAK' || r.status === 'DIBATALKAN') rejected++;
    }

    return { total, pendingApproval, approved, confirmed, ready, rented, completed, expired, rejected };
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

  // Fungsi Hapus Masal (Bulk Delete)
  const handleBulkDelete = async () => {
    if (selectedRentals.length === 0) return;
    try {
      setIsDeleting(true);
      const res = await fetch('/api/admin/equipment-rentals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rentalIds: selectedRentals }),
      });
      notifyAdminDataChanged();

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengarsipkan sewa terpilih');
      }

      showToast(data.message || `${selectedRentals.length} sewa diarsipkan`);
      setSelectedRentals([]);
      setIsBulkDeleteOpen(false);
      fetchRentals();
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan saat mengarsipkan data sewa');
    } finally {
      setIsDeleting(false);
    }
  };

  // Fungsi Hapus Tunggal (Single Delete)
  const handleSingleDelete = async () => {
    if (!rentalToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch('/api/admin/equipment-rentals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rentalIds: [rentalToDelete.id] }),
      });
      notifyAdminDataChanged();

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengarsipkan data sewa');
      }

      showToast(data.message || `Sewa #${rentalToDelete.rentalCode} diarsipkan`);
      setSelectedRentals((prev) => prev.filter((id) => id !== rentalToDelete.id));
      if (selectedRental?.id === rentalToDelete.id) {
        setSelectedRental(null);
      }
      setRentalToDelete(null);
      fetchRentals();
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan saat mengarsipkan data sewa');
    } finally {
      setIsDeleting(false);
    }
  };

  // Update Status Pengajuan Sewa
  const handleUpdateStatus = async (
    rentalId: string,
    newStatus: EquipmentRentalStatus,
    extraData?: {
      isPaid?: boolean;
      paymentDeadline?: string;
      deadlineMode?: PaymentDeadlineMode;
      cashierNotes?: string;
      rejectedReason?: string;
    } & Partial<InspectionPayload>
  ): Promise<boolean> => {
    // Menolak / membatalkan tidak bisa diurungkan: buka dialog konfirmasi + alasan dulu
    if ((newStatus === 'DITOLAK' || newStatus === 'DIBATALKAN') && !extraData?.rejectedReason) {
      const target = rentals.find((r) => r.id === rentalId) || selectedRental;
      if (target) setRejectTarget({ rental: target, status: newStatus });
      return false;
    }
    try {
      setIsUpdatingStatus(true);
      const res = await fetch('/api/admin/equipment-rentals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rentalId,
          status: newStatus,
          ...extraData,
        }),
      });
      notifyAdminDataChanged();

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Status sewa alat berhasil diperbarui.');
        fetchRentals();
        if (selectedRental && selectedRental.id === rentalId) {
          setSelectedRental(data.rental);
        }
        return true;
      }
      showToast(data.error || 'Gagal mengubah status sewa alat.');
      return false;
    } catch (err: any) {
      console.error(err);
      showToast('Tidak dapat menghubungi server.');
      return false;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Tandai DP sudah dikembalikan tunai (pembatalan yang berhak refund)
  const handleDpRefunded = async (rental: EquipmentRentalOrder) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch('/api/admin/equipment-rentals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rental.id, action: 'DP_REFUNDED' }),
      });
      notifyAdminDataChanged();
      const data = await res.json();
      showToast(data.message || data.error || 'Selesai.');
      if (res.ok) {
        fetchRentals();
        if (selectedRental?.id === rental.id) setSelectedRental(data.rental);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openCashier = (rental: EquipmentRentalOrder, mode: 'DP' | 'LUNAS') => {
    setCashierMode(mode);
    setCashierNotes(mode === 'DP' ? 'DP tunai diterima di kasir koperasi' : 'Pelunasan tunai di kasir koperasi');
    setRentalForCashier(rental);
  };

  const needsDpRefund = (r: EquipmentRentalOrder) =>
    Boolean(r.dpPaidAt) && !r.dpForfeited && !r.dpRefundedAt && (r.status === 'DIBATALKAN' || r.status === 'DITOLAK');

  const handleSubmitInspection = async (payload: InspectionPayload) => {
    if (!inspectionTarget) return;
    const { rental, type } = inspectionTarget;
    const ok = await handleUpdateStatus(rental.id, type === 'SERAH_TERIMA' ? 'SEDANG_DISEWA' : 'SELESAI', payload);
    if (ok) setInspectionTarget(null);
  };

  // Pratinjau batas bayar (dihitung ulang di server dengan aturan yang sama)
  const customDeadlineIso =
    customDeadlineDate && !isNaN(new Date(customDeadlineDate).getTime())
      ? new Date(customDeadlineDate).toISOString()
      : null;
  const previewDeadline = (mode: PaymentDeadlineMode) =>
    rentalToApprove
      ? computePaymentDeadline(rentalToApprove.startDate, mode, customDeadlineIso).toLocaleString('id-ID', {
          timeZone: 'Asia/Makassar',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WITA'
      : '';

  const handleConfirmApproval = async () => {
    if (!rentalToApprove) return;
    await handleUpdateStatus(rentalToApprove.id, 'DISETUJUI', {
      deadlineMode: deadlineChoice,
      ...(deadlineChoice === 'CUSTOM' && customDeadlineIso ? { paymentDeadline: customDeadlineIso } : {}),
    });
    setRentalToApprove(null);
  };

  const handleConfirmCashierPayment = async () => {
    if (!rentalForCashier) return;
    const target = rentalForCashier;
    const tagihan = rincianTagihan(target);
    const isDp = cashierMode === 'DP';
    const amount = isDp ? tagihan.dp : tagihan.sisaPelunasan;
    const ok = await handleUpdateStatus(target.id, isDp ? 'DIKONFIRMASI' : 'SIAP_DIAMBIL', {
      ...(isDp ? {} : { isPaid: true }),
      cashierNotes,
    });
    if (!ok) return;
    setRentalForCashier(null);
    setReceiptInfo({ label: isDp ? `DP ${DP_PERSEN}% Sewa Alat` : 'Pelunasan Sewa Alat', amount });
    setRentalForReceipt({
      ...target,
      status: isDp ? 'DIKONFIRMASI' : 'SIAP_DIAMBIL',
      isPaid: !isDp,
      paidAt: new Date().toISOString(),
      cashierNotes,
    });
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
        label: 'Menunggu DP',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
      },
      DIKONFIRMASI: {
        label: 'DP Lunas (Terkunci)',
        cls: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        dot: 'bg-cyan-500',
      },
      SIAP_DIAMBIL: {
        label: 'Siap Diambil (Lunas)',
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
      KADALUARSA: {
        label: 'Batas Bayar Lewat',
        cls: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      },
      DITOLAK: {
        label: 'Ditolak',
        cls: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      },
      DIBATALKAN: {
        label: 'Dibatalkan',
        cls: 'bg-stone-50 text-stone-700 border-stone-200',
        dot: 'bg-stone-400',
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
              if (tab.key === 'DIKONFIRMASI') count = stats.confirmed;
              if (tab.key === 'SIAP_DIAMBIL') count = stats.ready;
              if (tab.key === 'SEDANG_DISEWA') count = stats.rented;
              if (tab.key === 'SELESAI') count = stats.completed;
              if (tab.key === 'KADALUARSA') count = stats.expired;
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

        {/* Toolbar: cari, tanggal, reset, ekspor, refresh, menu aksi */}
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

            {/* Filter Tanggal Preset */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 px-2.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {datePreset === 'ALL'
                      ? 'Semua Tanggal'
                      : datePreset === 'TODAY'
                      ? 'Hari Ini'
                      : datePreset === 'WEEK'
                      ? '7 Hari Terakhir'
                      : '30 Hari Terakhir'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-40 rounded-xl p-1 bg-white border border-slate-200 shadow-lg text-xs z-50"
              >
                <DropdownMenuItem
                  onClick={() => setDatePreset('ALL')}
                  className="cursor-pointer rounded-lg px-2.5 py-1.5"
                >
                  Semua Tanggal
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDatePreset('TODAY')}
                  className="cursor-pointer rounded-lg px-2.5 py-1.5"
                >
                  Hari Ini
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDatePreset('WEEK')}
                  className="cursor-pointer rounded-lg px-2.5 py-1.5"
                >
                  7 Hari Terakhir
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDatePreset('MONTH')}
                  className="cursor-pointer rounded-lg px-2.5 py-1.5"
                >
                  30 Hari Terakhir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {(searchQuery || filterStatus !== 'ALL' || datePreset !== 'ALL') && (
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
              onClick={fetchRentals}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
              title="Segarkan data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-800' : ''}`}
              />
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
                className="w-52 rounded-xl p-1 bg-white border border-slate-200 shadow-lg text-xs z-50"
              >
                <DropdownMenuItem
                  onClick={() => {
                    const pageIds = paginatedRentals.map((r) => r.id);
                    setSelectedRentals((prev) => Array.from(new Set([...prev, ...pageIds])));
                  }}
                  className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-slate-700"
                >
                  <Check className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pilih Semua di Halaman</span>
                </DropdownMenuItem>
                {selectedRentals.length > 0 && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setSelectedRentals([])}
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
                      <span>Arsipkan Terpilih ({selectedRentals.length})</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bulk Action Bar saat ada sewa alat yang dipilih (Kravio White Card Style) */}
        {selectedRentals.length > 0 && (
          <div className="mb-2 px-3.5 py-2.5 bg-white rounded-xl border border-[#ECEEF2] shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs tabular-nums shadow-2xs">
                {selectedRentals.length}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-slate-800 tracking-tight">
                  {selectedRentals.length} pesanan dipilih
                </span>
                <span className="hidden sm:inline-block text-xs text-slate-400 font-normal">
                  • dari {paginatedRentals.length} di halaman ini
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedRentals([])}
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
                <span>Arsipkan Terpilih ({selectedRentals.length})</span>
              </button>
            </div>
          </div>
        )}

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
                                <div className="space-y-0.5">
                                  <button
                                    type="button"
                                    className="cursor-pointer hover:opacity-85 transition"
                                    title="Klik untuk ubah status ke tahap berikutnya"
                                  >
                                    {renderStatusBadge(rental.status)}
                                  </button>
                                  {rental.status === 'DISETUJUI' && rental.paymentDeadline && (
                                    <div className="flex items-center gap-1 text-[10px]">
                                      <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                      {new Date(rental.paymentDeadline).getTime() < Date.now() ? (
                                        <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-1 rounded text-[9.5px]">
                                          Lewat Batas
                                        </span>
                                      ) : (
                                        <span className="text-blue-700 font-semibold tabular-nums text-[10px]">
                                          Batas: {new Date(rental.paymentDeadline).toLocaleString('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
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
                                    onClick={() => setRentalToApprove(rental)}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-blue-700 hover:bg-blue-50 font-medium"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Setujui & Beri Batas Bayar</span>
                                  </DropdownMenuItem>
                                )}

                                {rental.status === 'DISETUJUI' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => openCashier(rental, 'DP')}
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 font-semibold"
                                    >
                                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Terima DP {DP_PERSEN}%</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => openCashier(rental, 'LUNAS')}
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50"
                                    >
                                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Terima Lunas Penuh</span>
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {rental.status === 'DIKONFIRMASI' && (
                                  <DropdownMenuItem
                                    onClick={() => openCashier(rental, 'LUNAS')}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50"
                                  >
                                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Terima Pelunasan Sebelum Hari H</span>
                                  </DropdownMenuItem>
                                )}

                                {(rental.status === 'DIKONFIRMASI' || rental.status === 'SIAP_DIAMBIL') && (
                                  <DropdownMenuItem
                                    onClick={() => setInspectionTarget({ rental, type: 'SERAH_TERIMA' })}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-purple-700 hover:bg-purple-50 font-medium"
                                  >
                                    <Tractor className="w-3.5 h-3.5 text-purple-600" />
                                    <span>Serah Terima Unit</span>
                                  </DropdownMenuItem>
                                )}

                                {rental.status === 'SEDANG_DISEWA' && (
                                  <DropdownMenuItem
                                    onClick={() => setInspectionTarget({ rental, type: 'PENGEMBALIAN' })}
                                    className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 font-semibold"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                                    <span>Terima Pengembalian Unit</span>
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
                              {rental.endDate && rental.endDate !== rental.startDate && (
                                <span className="text-slate-400 font-normal"> – {rental.endDate}</span>
                              )}
                            </span>
                            {rental.conflict?.blocked && (
                              <span
                                className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold"
                                title={rental.conflict.message}
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Bentrok
                              </span>
                            )}
                            {!rental.conflict?.blocked && (rental.conflict?.competingWith.length || 0) > 0 && (
                              <span
                                className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold"
                                title={`Memperebutkan unit yang sama dengan #${rental.conflict!.competingWith.join(', #')}. Hanya salah satu yang bisa disetujui.`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Rebutan
                              </span>
                            )}
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
                                  href={waLink(rental.userPhone)}
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

                        {/* 7. Total Tagihan & Aksi Cepat Kasir */}
                        <TableCell className="py-3 whitespace-nowrap text-right">
                          <div className="text-[12.5px] font-semibold text-slate-900 tabular-nums">
                            Rp {Number(rental.totalEstimasi).toLocaleString('id-ID')}
                          </div>
                          <div className="text-[11px] font-medium mt-0.5">
                            {rental.status !== 'DIBATALKAN' && rental.status !== 'DITOLAK' && (rental.isPaid || rental.status === 'SELESAI') ? (
                              <span className="text-emerald-600 font-semibold inline-flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Lunas Tunai
                              </span>
                            ) : rental.status === 'DISETUJUI' ? (
                              <span className="text-blue-600 font-semibold">Tunggu Bayar Kasir</span>
                            ) : rental.status === 'KADALUARSA' ? (
                              <span className="text-rose-600 font-semibold">Lewat Batas</span>
                            ) : (
                              <span className="text-amber-600">Belum lunas</span>
                            )}
                          </div>

                          {/* Tombol Aksi Cepat Kasir 1-Klik */}
                          {rental.status === 'DISETUJUI' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRentalForCashier(rental);
                              }}
                              className="mt-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                              title="Terima Uang Kasir & Kunci Unit"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>Terima Kasir</span>
                            </button>
                          )}
                          {rental.status === 'MENUNGGU_PERSETUJUAN_ADMIN' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRentalToApprove(rental);
                              }}
                              className="mt-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                              title="Setujui & Beri Batas Bayar Kasir"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Setujui</span>
                            </button>
                          )}
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

                              {rental.isPaid && (
                                <DropdownMenuItem
                                  onClick={() => setRentalForReceipt(rental)}
                                  className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 font-semibold"
                                >
                                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Cetak Kuitansi Kasir</span>
                                </DropdownMenuItem>
                              )}

                              {!['SELESAI', 'DITOLAK', 'DIBATALKAN', 'KADALUARSA'].includes(rental.status) && (
                                <>
                                  <DropdownMenuSeparator className="my-1 border-slate-100" />
                                  <DropdownMenuLabel className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    Progres Alur
                                  </DropdownMenuLabel>

                                  {rental.status === 'MENUNGGU_PERSETUJUAN_ADMIN' && (
                                    <DropdownMenuItem
                                      onClick={() => setRentalToApprove(rental)}
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-blue-700 hover:bg-blue-50 font-medium"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Setujui & Batas Bayar</span>
                                    </DropdownMenuItem>
                                  )}

                                  {rental.status === 'DISETUJUI' && (
                                    <DropdownMenuItem
                                      onClick={() => setRentalForCashier(rental)}
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 font-semibold"
                                    >
                                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Terima Kasir & Kunci Unit</span>
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

                              <DropdownMenuSeparator className="my-1 border-slate-100" />
                              <DropdownMenuItem
                                onClick={() => setRentalToDelete(rental)}
                                className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Arsipkan Data Sewa</span>
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

          {/* Baris Bawah: Pagination Persis Gambar 3 & Gambar 4 */}
          <div className="px-4 py-3 border-t border-[#F1F3F5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
            <div className="flex items-center gap-3">
              <div>
                Menampilkan{' '}
                <strong className="text-slate-800 font-semibold">
                  {filteredRentals.length === 0
                    ? 0
                    : (currentPage - 1) * itemsPerPage + 1}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-800 font-semibold">
                  {Math.min(currentPage * itemsPerPage, filteredRentals.length)}
                </strong>{' '}
                dari{' '}
                <strong className="text-slate-800 font-semibold">
                  {filteredRentals.length}
                </strong>{' '}
                total sewa alat
              </div>

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
                {currentPage} / {totalPages || 1}
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
                const isRejected = status === 'DITOLAK' || status === 'DIBATALKAN' || status === 'KADALUARSA';
                const stopLabel =
                  status === 'KADALUARSA' ? 'Kadaluarsa' : status === 'DIBATALKAN' ? 'Dibatalkan' : 'Ditolak';
                const stopDesc =
                  status === 'KADALUARSA'
                    ? 'Lewat batas bayar DP'
                    : status === 'DIBATALKAN'
                      ? 'Sewa dibatalkan'
                      : 'Pengajuan ditolak';
                const level =
                  status === 'SELESAI'
                    ? 4
                    : status === 'SIAP_DIAMBIL' || status === 'SEDANG_DISEWA'
                      ? 3
                      : status === 'DISETUJUI' || status === 'DIKONFIRMASI'
                        ? 2
                        : 1;

                const steps = [
                  { label: 'Diajukan', desc: 'Permohonan masuk', icon: FileText },
                  {
                    label: status === 'DIKONFIRMASI' ? 'DP Diterima' : 'Disetujui',
                    desc: status === 'DIKONFIRMASI' ? 'Jadwal terkunci' : 'Menunggu DP',
                    icon: ShieldCheck,
                  },
                  {
                    label: status === 'SEDANG_DISEWA' ? 'Dipakai' : 'Siap Diambil',
                    desc: status === 'SEDANG_DISEWA' ? 'Unit di lahan' : 'Di pool koperasi',
                    icon: Tractor,
                  },
                  { label: 'Selesai', desc: 'Unit dikembalikan', icon: Check },
                ];

                return (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[12.5px] font-semibold text-slate-800">
                        Alur Pengajuan & Penggunaan Sewa
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {isRejected ? stopDesc : `Tahap ${level} dari 4`}
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
                              {rejectedNode ? stopLabel : s.label}
                            </span>
                            <span className="text-[10.5px] text-slate-400 mt-0.5 leading-tight px-1">
                              {rejectedNode ? stopDesc : s.desc}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })()}

              {['DITOLAK', 'DIBATALKAN', 'KADALUARSA'].includes(selectedRental.status) && (
                <section className="p-3 rounded-xl border border-rose-200 bg-rose-50/60 text-[11.5px] text-rose-700">
                  <span className="font-semibold">Alasan: </span>
                  {selectedRental.rejectedReason || 'Tidak tercatat'}
                </section>
              )}

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
                          href={waLink(selectedRental.userPhone)}
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
                    <dt className="text-slate-500">Jadwal Sewa</dt>
                    <dd className="font-medium text-slate-900 tabular-nums">
                      {formatDateOnlyId(selectedRental.startDate)}
                      {selectedRental.endDate && selectedRental.endDate !== selectedRental.startDate && (
                        <> – {formatDateOnlyId(selectedRental.endDate)}</>
                      )}
                    </dd>
                  </div>

                  {selectedRental.status === 'DISETUJUI' && selectedRental.paymentDeadline && (
                    <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                      <dt className="text-slate-500">Batas Bayar DP</dt>
                      <dd
                        className={`font-semibold tabular-nums ${
                          new Date(selectedRental.paymentDeadline).getTime() < nowTs ? 'text-rose-600' : 'text-amber-700'
                        }`}
                      >
                        {new Date(selectedRental.paymentDeadline).toLocaleString('id-ID', {
                          timeZone: 'Asia/Makassar',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}{' '}
                        WITA
                        {new Date(selectedRental.paymentDeadline).getTime() < nowTs && ' (lewat batas)'}
                      </dd>
                    </div>
                  )}

                  <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-slate-500">Lokasi Lahan</dt>
                    <dd className="font-medium text-slate-900 leading-relaxed">
                      {selectedRental.lokasiLahan || <span className="text-slate-400">-</span>}
                    </dd>
                  </div>

                  <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-slate-500">Pembayaran</dt>
                    <dd className="font-medium text-slate-900 flex items-center gap-2">
                      Tunai Kasir
                      {selectedRental.status !== 'DIBATALKAN' && selectedRental.status !== 'DITOLAK' && (selectedRental.isPaid || selectedRental.status === 'SELESAI') ? (
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

              {/* Rincian pembayaran tunai */}
              {(() => {
                const t = rincianTagihan(selectedRental);
                const row = (label: string, value: string, cls = '') => (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className={`font-semibold tabular-nums ${cls}`}>{value}</span>
                  </div>
                );
                const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
                return (
                  <section className="rounded-xl border border-slate-200 p-3.5 space-y-1.5">
                    <h3 className="text-[12px] font-semibold text-slate-800 mb-1">Pembayaran Tunai</h3>
                    {row(
                      `DP ${DP_PERSEN}%`,
                      t.dp ? `${rp(t.dp)} • ${selectedRental.dpPaidAt ? 'dibayar' : 'belum dibayar'}` : '-'
                    )}
                    {row('Sisa pelunasan', selectedRental.isPaid ? 'Lunas' : rp(t.sisaPelunasan))}
                    {(selectedRental.lateFee || 0) > 0 &&
                      row(`Denda terlambat ${selectedRental.lateDays} hari`, rp(selectedRental.lateFee || 0), 'text-rose-700')}
                    {(selectedRental.damageFee || 0) > 0 &&
                      row(
                        `Kerusakan${selectedRental.damageNotes ? ` (${selectedRental.damageNotes})` : ''}`,
                        rp(selectedRental.damageFee || 0),
                        'text-rose-700'
                      )}
                    {t.biayaTambahan > 0 && row('Grand total', rp(t.grandTotal))}
                    {selectedRental.dpPaidAt && selectedRental.dpForfeited && row('Status DP', 'Hangus (batal kurang dari H-2)', 'text-rose-700')}
                    {needsDpRefund(selectedRental) && row('Status DP', 'Perlu dikembalikan ke penyewa', 'text-amber-700')}
                    {selectedRental.dpRefundedAt && row('Status DP', 'Sudah dikembalikan', 'text-emerald-700')}
                  </section>
                );
              })()}

              {/* Catatan cek kondisi unit */}
              {(selectedRental.inspections?.length || 0) > 0 && (
                <section className="rounded-xl border border-slate-200 p-3.5 space-y-2">
                  <h3 className="text-[12px] font-semibold text-slate-800">Cek Kondisi Unit</h3>
                  {selectedRental.inspections!.map((ins) => (
                    <div key={ins.id} className="text-[11.5px] text-slate-600">
                      <span className="font-semibold text-slate-800">
                        {ins.type === 'SERAH_TERIMA' ? 'Serah terima' : 'Pengembalian'}
                      </span>{' '}
                      • {new Date(ins.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {' • '}
                      {ins.kondisi}
                      {ins.jamMesin !== null ? ` • jam mesin ${ins.jamMesin}` : ''}
                      {ins.bbmLevel ? ` • BBM ${ins.bbmLevel}` : ''}
                      {ins.catatan ? ` — ${ins.catatan}` : ''}
                      {ins.petugas ? ` (${ins.petugas})` : ''}
                    </div>
                  ))}
                </section>
              )}

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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(selectedRental)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cetak Surat Jalan / Bukti</span>
                </button>

                {selectedRental.isPaid && (
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptInfo(null);
                      setRentalForReceipt(selectedRental);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Kuitansi Kasir</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setRentalToDelete(selectedRental)}
                  className="px-2.5 py-2 text-xs font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Arsipkan data sewa ini"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Arsipkan</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {['MENUNGGU_PERSETUJUAN_ADMIN', 'DISETUJUI', 'DIKONFIRMASI', 'SIAP_DIAMBIL'].includes(
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
                    onClick={() => setRentalToApprove(selectedRental)}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Setujui & Batas Bayar</span>
                  </button>
                )}

                {selectedRental.status === 'DISETUJUI' && (
                  <button
                    type="button"
                    onClick={() => openCashier(selectedRental, 'DP')}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Terima DP {DP_PERSEN}%</span>
                  </button>
                )}

                {needsDpRefund(selectedRental) && (
                  <button
                    type="button"
                    onClick={() => handleDpRefunded(selectedRental)}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Tandai DP Sudah Dikembalikan</span>
                  </button>
                )}

                {(selectedRental.status === 'SIAP_DIAMBIL' || selectedRental.status === 'DIKONFIRMASI') && (
                  <button
                    type="button"
                    onClick={() => setInspectionTarget({ rental: selectedRental, type: 'SERAH_TERIMA' })}
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
                    onClick={() => setInspectionTarget({ rental: selectedRental, type: 'PENGEMBALIAN' })}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>Terima Pengembalian Unit</span>
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

      {/* Konfirmasi Tolak / Batalkan Sewa */}
      <ReasonConfirmDialog
        key={rejectTarget?.rental.id || 'none'}
        open={Boolean(rejectTarget)}
        title={
          rejectTarget?.rental.status === 'MENUNGGU_PERSETUJUAN_ADMIN' ? 'Tolak pengajuan sewa?' : 'Batalkan sewa ini?'
        }
        subtitle={
          rejectTarget
            ? `#${rejectTarget.rental.rentalCode} · ${rejectTarget.rental.userName || 'Penyewa'} · mulai ${rejectTarget.rental.startDate}`
            : undefined
        }
        consequences={[
          'Jadwal unit alat dilepas dan bisa dipesan penyewa lain.',
          ...(rejectTarget?.rental.dpPaidAt
            ? ['DP sudah dibayar — cek di detail apakah DP perlu dikembalikan ke penyewa.']
            : []),
          'Penyewa melihat status beserta alasannya. Tindakan ini tidak bisa diurungkan.',
        ]}
        quickReasons={['Unit sedang perbaikan', 'Jadwal bentrok', 'Di luar wilayah layanan', 'Permintaan penyewa']}
        confirmLabel={rejectTarget?.rental.status === 'MENUNGGU_PERSETUJUAN_ADMIN' ? 'Ya, Tolak' : 'Ya, Batalkan'}
        isSubmitting={isUpdatingStatus}
        onConfirm={async (reason) => {
          if (!rejectTarget) return;
          const ok = await handleUpdateStatus(rejectTarget.rental.id, rejectTarget.status, {
            rejectedReason: reason || 'Ditolak oleh admin koperasi',
          });
          if (ok) setRejectTarget(null);
        }}
        onClose={() => setRejectTarget(null)}
      />

      {/* Modal Konfirmasi Hapus Masal (Bulk Delete) */}
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
                Arsipkan {selectedRentals.length} Sewa Alat Terpilih?
              </DialogTitle>
              <p className="text-xs text-slate-500 leading-relaxed">
                Arsipkan{' '}
                <strong className="text-slate-800 font-semibold">{selectedRentals.length} data sewa alat</strong>?
                Data disembunyikan dari daftar, tetapi tetap tersimpan untuk laporan. Hanya sewa yang sudah Selesai, Ditolak, Dibatalkan, atau Kadaluarsa yang bisa diarsipkan.
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
                  <span>Mengarsipkan...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Arsipkan</span>
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus 1 Sewa Alat */}
      <Dialog
        open={Boolean(rentalToDelete)}
        onOpenChange={(open) => !open && !isDeleting && setRentalToDelete(null)}
      >
        <DialogContent className="max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="space-y-1.5 flex-1">
              <DialogTitle className="text-base font-bold text-slate-900">
                Arsipkan Sewa #{rentalToDelete?.rentalCode}?
              </DialogTitle>
              <p className="text-xs text-slate-500 leading-relaxed">
                Arsipkan data sewa pemohon{' '}
                <strong className="text-slate-800 font-semibold">{rentalToDelete?.userName || 'Umum'}</strong>?
                Data disembunyikan dari daftar tetapi tetap tersimpan untuk laporan. Sewa yang masih aktif harus ditolak, dibatalkan, atau diselesaikan dulu.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setRentalToDelete(null)}
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
                  <span>Mengarsipkan...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Arsipkan</span>
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 1: Persetujuan Sewa & Penetapan Batas Bayar Kasir */}
      <Dialog
        open={Boolean(rentalToApprove)}
        onOpenChange={(open) => {
          if (!open) setRentalToApprove(null);
        }}
      >
        <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl">
          <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Persetujuan Sewa & Batas Bayar Kasir
                </DialogTitle>
                <p className="text-[11px] text-slate-500">
                  No. Pengajuan #{rentalToApprove?.rentalCode}
                </p>
              </div>
            </div>
            <DialogClose className="w-8 h-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {/* Info Pemohon & Biaya */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Pemohon:</span>
                <span className="font-semibold text-slate-800">{rentalToApprove?.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jadwal Pemakaian:</span>
                <span className="font-semibold text-slate-800">
                  {rentalToApprove?.startDate}
                  {rentalToApprove?.endDate && rentalToApprove.endDate !== rentalToApprove.startDate
                    ? ` – ${rentalToApprove.endDate}`
                    : ''}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-medium">
                <span className="text-slate-700">Total Biaya Sewa:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  Rp {Number(rentalToApprove?.totalEstimasi || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {rentalToApprove?.conflict?.blocked && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <span className="font-bold block">Jadwal bentrok, pengajuan ini tidak bisa disetujui.</span>
                  {rentalToApprove.conflict.message} Tolak pengajuan ini atau minta pemohon memilih tanggal lain.
                </span>
              </div>
            )}
            {!rentalToApprove?.conflict?.blocked && (rentalToApprove?.conflict?.competingWith.length || 0) > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Pengajuan <b>#{rentalToApprove!.conflict!.competingWith.join(', #')}</b> meminta unit yang sama di
                  tanggal yang berdekatan. Jika pengajuan ini disetujui, pengajuan tersebut tidak akan bisa disetujui.
                </span>
              </div>
            )}

            {/* Pilihan Batas Waktu Bayar Kasir */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Pilih Batas Waktu Pembayaran di Kasir Koperasi:
              </label>

              <div className="space-y-2">
                <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${deadlineChoice === 'H_MINUS_1' ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    name="deadlineChoice"
                    value="H_MINUS_1"
                    checked={deadlineChoice === 'H_MINUS_1'}
                    onChange={() => setDeadlineChoice('H_MINUS_1')}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Sehari sebelum pemakaian, 16:30 WITA (Disarankan)</span>
                    <span className="text-[11px] text-slate-500">Penyewa tidak perlu bayar jauh hari. Jika tidak lunas, unit sempat ditawarkan ke penyewa lain.</span>
                    <span className="text-[11px] font-semibold text-blue-700 block mt-0.5">Batas: {previewDeadline('H_MINUS_1')}</span>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${deadlineChoice === 'HARI_H' ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    name="deadlineChoice"
                    value="HARI_H"
                    checked={deadlineChoice === 'HARI_H'}
                    onChange={() => setDeadlineChoice('HARI_H')}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Hari pemakaian, 10:00 WITA</span>
                    <span className="text-[11px] text-slate-500">Bayar saat mengambil alat di gudang pada hari H.</span>
                    <span className="text-[11px] font-semibold text-blue-700 block mt-0.5">Batas: {previewDeadline('HARI_H')}</span>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${deadlineChoice === 'DUA_JAM' ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    name="deadlineChoice"
                    value="DUA_JAM"
                    checked={deadlineChoice === 'DUA_JAM'}
                    onChange={() => setDeadlineChoice('DUA_JAM')}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">2 jam dari sekarang</span>
                    <span className="text-[11px] text-slate-500">Untuk sewa mendadak (hari ini/besok).</span>
                    <span className="text-[11px] font-semibold text-blue-700 block mt-0.5">Batas: {previewDeadline('DUA_JAM')}</span>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${deadlineChoice === 'CUSTOM' ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    name="deadlineChoice"
                    value="CUSTOM"
                    checked={deadlineChoice === 'CUSTOM'}
                    onChange={() => setDeadlineChoice('CUSTOM')}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">Tentukan Waktu Sendiri (Kustom)</span>
                    {deadlineChoice === 'CUSTOM' && (
                      <>
                        <input
                          type="datetime-local"
                          value={customDeadlineDate}
                          onChange={(e) => setCustomDeadlineDate(e.target.value)}
                          className="mt-2 w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                        />
                        {customDeadlineIso && (
                          <span className="text-[11px] font-semibold text-blue-700 block mt-1">
                            Batas: {previewDeadline('CUSTOM')}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Unit hanya dikunci pada tanggal pemakaian pemohon, bukan sejak hari ini. Batas bayar tidak pernah melewati hari H pukul 10:00 WITA. Jika belum lunas hingga batas ini, reservasi otomatis kadaluarsa dan unit bebas kembali.
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRentalToApprove(null)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmApproval}
              disabled={isUpdatingStatus || Boolean(rentalToApprove?.conflict?.blocked)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Setujui & Terbitkan Batas Bayar</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Terima Kasir & Kunci Unit */}
      <Dialog
        open={Boolean(rentalForCashier)}
        onOpenChange={(open) => {
          if (!open) setRentalForCashier(null);
        }}
      >
        <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl">
          <div className="p-5 border-b border-emerald-100 bg-emerald-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Penerimaan Pembayaran Tunai Kasir
                </DialogTitle>
                <p className="text-[11px] text-emerald-800">
                  Konfirmasi setoran tunai & penguncian unit
                </p>
              </div>
            </div>
            <DialogClose className="w-8 h-8 rounded-lg hover:bg-emerald-200/50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          <div className="p-5 space-y-4 text-xs">
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-center space-y-1">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                {cashierMode === 'DP' ? `DP ${DP_PERSEN}% Diterima Kasir:` : 'Pelunasan Diterima Kasir:'}
              </span>
              <div className="text-2xl font-black text-emerald-950 tabular-nums">
                Rp{' '}
                {(rentalForCashier
                  ? cashierMode === 'DP'
                    ? rincianTagihan(rentalForCashier).dp
                    : rincianTagihan(rentalForCashier).sisaPelunasan
                  : 0
                ).toLocaleString('id-ID')}
              </div>
              {rentalForCashier && (
                <span className="text-[11px] text-emerald-700 block">
                  Total sewa Rp {Number(rentalForCashier.totalEstimasi).toLocaleString('id-ID')}
                  {cashierMode === 'DP'
                    ? ` • sisa Rp ${(rincianTagihan(rentalForCashier).total - rincianTagihan(rentalForCashier).dp).toLocaleString('id-ID')} dibayar saat ambil`
                    : rincianTagihan(rentalForCashier).dpDibayar > 0
                    ? ` • DP Rp ${rincianTagihan(rentalForCashier).dpDibayar.toLocaleString('id-ID')} sudah dibayar`
                    : ''}
                </span>
              )}
              <span className="text-[11px] text-emerald-700 font-medium block">
                No. Pengajuan #{rentalForCashier?.rentalCode} • {rentalForCashier?.userName}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Catatan Kasir / Keterangan Tanda Terima:
              </label>
              <input
                type="text"
                value={cashierNotes}
                onChange={(e) => setCashierNotes(e.target.value)}
                placeholder="Contoh: Diterima tunai di kasir kantor koperasi Kolongan"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 transition"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {cashierMode === 'DP' ? (
                  <>
                    Status berubah ke <strong>DP LUNAS (TERKUNCI)</strong>. Jadwal unit terkunci untuk penyewa ini dan tidak lagi
                    kadaluarsa. Sisa dibayar saat serah terima unit.
                  </>
                ) : (
                  <>
                    Status berubah ke <strong>SIAP DIAMBIL</strong> dan tercatat <strong>LUNAS</strong>. Unit diserahkan pada
                    tanggal mulai sewa.
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRentalForCashier(null)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmCashierPayment}
              disabled={isUpdatingStatus}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>{cashierMode === 'DP' ? 'Konfirmasi Terima DP' : 'Konfirmasi Pelunasan'}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <RentalInspectionDialog
        target={inspectionTarget}
        isSubmitting={isUpdatingStatus}
        onClose={() => setInspectionTarget(null)}
        onSubmit={handleSubmitInspection}
      />

      {/* Modal 3: Kuitansi Kasir Koperasi */}
      <Dialog
        open={Boolean(rentalForReceipt)}
        onOpenChange={(open) => {
          if (!open) setRentalForReceipt(null);
        }}
      >
        <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-emerald-700" />
              <DialogTitle className="text-sm font-bold text-slate-900">
                Kuitansi Pelunasan Kasir Koperasi
              </DialogTitle>
            </div>
            <DialogClose className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          {rentalForReceipt && (
            <div className="p-6 bg-amber-50/20 text-slate-800 text-xs font-sans space-y-4 border-y border-dashed border-slate-200">
              <div className="text-center pb-3 border-b border-slate-200">
                <div className="font-black text-sm text-[#233414]">KOPERASI SINAR PAGI SEJAHTERA</div>
                <div className="text-[10px] text-slate-500">Unit Usaha Penyewaan Alsintan Pertanian</div>
                <div className="text-[10px] text-slate-500">Jl. Raya Kolongan, Kec. Kalawat, Kab. Minahasa Utara</div>
                <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                  KUITANSI TANDA TERIMA KASIR
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Kuitansi:</span>
                  <span className="font-mono font-bold">KWT/SEWA/{rentalForReceipt.rentalCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal & Jam:</span>
                  <span className="font-medium">
                    {new Date(rentalForReceipt.paidAt || Date.now()).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })} WITA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Telah Terima Dari:</span>
                  <span className="font-bold text-slate-900">{rentalForReceipt.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode Pembayaran:</span>
                  <span className="font-semibold text-emerald-800">Tunai di Kasir Kantor Koperasi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Untuk Sewa:</span>
                  <span className="font-medium text-right max-w-[200px] truncate">
                    {rentalForReceipt.items?.map((it) => it.nama).join(', ')}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">{receiptInfo?.label || 'Jumlah Uang'}:</span>
                <span className="text-base font-black text-emerald-950 tabular-nums">
                  Rp {Number(receiptInfo?.amount ?? rentalForReceipt.totalEstimasi).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between pt-4 text-center text-[11px] text-slate-600">
                <div className="w-32">
                  <span>Penyewa / Pemohon</span>
                  <div className="h-12" />
                  <div className="font-bold border-t border-slate-300 pt-1">
                    {rentalForReceipt.userName}
                  </div>
                </div>
                <div className="w-32">
                  <span>Kasir Koperasi</span>
                  <div className="h-12" />
                  <div className="font-bold border-t border-slate-300 pt-1">
                    {rentalForReceipt.cashierName || 'Kasir Koperasi'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setRentalForReceipt(null)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                if (rentalForReceipt) handlePrintReceipt(rentalForReceipt);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Print Kuitansi</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
