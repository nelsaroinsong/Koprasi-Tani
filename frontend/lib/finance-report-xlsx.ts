import { buildXlsx, type CellValue, type SheetSpec } from '@/lib/xlsx-writer';
import { LEDGER_LABEL, type FinanceReport } from '@/lib/finance-report';

const KOPERASI = 'KOPERASI SINAR PAGI SEJAHTERA';

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('id-ID', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });

const money = (v: number): CellValue => ({ v: Math.round(v || 0), s: 'money' });
const moneyBold = (v: number): CellValue => ({ v: Math.round(v || 0), s: 'moneyBold' });
const moneyTotal = (v: number): CellValue => ({ v: Math.round(v || 0), s: 'moneyTotal' });
const header = (labels: string[]): CellValue[] => labels.map((l) => ({ v: l, s: 'header' as const }));

/** File Excel laporan keuangan: Ringkasan, Buku Kas, Per Petani, Komoditas */
export function buildFinanceXlsx(report: FinanceReport, generatedBy?: string | null): Uint8Array {
  const s = report.summary;
  const periode = `Periode ${fmtDate(report.period.from)} – ${fmtDate(report.period.to)} (WITA)`;
  const dicetak = `Dibuat ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar', dateStyle: 'long', timeStyle: 'short' })} WITA${
    generatedBy ? ` oleh ${generatedBy}` : ''
  }`;

  // ---------------- Sheet 1: Ringkasan ----------------
  const ringkasan: CellValue[][] = [
    [{ v: 'LAPORAN KEUANGAN', s: 'title' }],
    [{ v: KOPERASI, s: 'section' }],
    [{ v: periode, s: 'subtitle' }],
    [{ v: dicetak, s: 'subtitle' }],
    [],
    header(['Uraian', 'Jumlah', 'Keterangan']),
    [{ v: 'KAS MASUK', s: 'section' }, null, null],
    ['Penjualan toko', money(s.tokoSales), { v: `${s.tokoOrders} pesanan selesai · titipan petani`, s: 'muted' }],
    ['DP sewa alat', money(s.rentalDp), null],
    ['Pelunasan sewa alat', money(s.rentalSettlement), { v: `${s.rentalsCompleted} sewa lunas`, s: 'muted' }],
    ['Denda & kerusakan sewa', money(s.rentalFees), null],
    [{ v: 'Total kas masuk', s: 'totalLabel' }, moneyTotal(s.cashIn), { v: '', s: 'totalLabel' }],
    [],
    [{ v: 'KAS KELUAR', s: 'section' }, null, null],
    ['Bagi hasil diserahkan ke petani', money(s.payoutPaid), null],
    ['Pengembalian DP sewa', money(s.dpRefunded), null],
    [{ v: 'Total kas keluar', s: 'totalLabel' }, moneyTotal(s.cashOut), { v: '', s: 'totalLabel' }],
    [],
    [{ v: 'SALDO KAS BERSIH PERIODE', s: 'totalLabel' }, moneyTotal(s.netCash), { v: 'Kas masuk − kas keluar', s: 'totalLabel' }],
    [],
    [{ v: 'PENDAPATAN KOPERASI', s: 'section' }, null, null],
    ['Pendapatan sewa alat (bersih)', moneyBold(s.koperasiRevenue), { v: 'DP + pelunasan + denda − DP dikembalikan', s: 'muted' }],
    ['Dana titipan petani (penjualan toko)', money(s.farmerFunds), { v: 'Seluruhnya menjadi hak petani (bagi hasil)', s: 'muted' }],
    [],
    [{ v: 'KEWAJIBAN SAAT INI', s: 'section' }, null, null],
    [
      'Bagi hasil belum diserahkan',
      moneyBold(report.outstanding.payoutOwed),
      { v: `${report.outstanding.payoutOwedPetani} petani menunggu di kasir`, s: 'muted' },
    ],
    ['DP sewa perlu dikembalikan', moneyBold(report.outstanding.dpToRefund), { v: `${report.outstanding.dpToRefundCount} penyewa`, s: 'muted' }],
    [],
    [{ v: `Pesanan dibatalkan pada periode ini: ${s.ordersCancelled}`, s: 'subtitle' }],
  ];

  // ---------------- Sheet 2: Buku Kas ----------------
  let saldo = 0;
  const ledgerRows: CellValue[][] = report.ledger.map((e) => {
    saldo += e.in - e.out;
    return [
      fmtShort(e.date),
      LEDGER_LABEL[e.kind],
      e.ref,
      e.party,
      e.description,
      e.in ? { v: e.in, s: 'moneyIn' } : { v: null, s: 'money' },
      e.out ? { v: e.out, s: 'moneyOut' } : { v: null, s: 'money' },
      money(saldo),
    ];
  });
  const bukuKas: CellValue[][] = [
    [{ v: 'BUKU KAS', s: 'title' }],
    [{ v: periode, s: 'subtitle' }],
    [],
    header(['Tanggal', 'Jenis', 'Referensi', 'Pihak', 'Keterangan', 'Masuk', 'Keluar', 'Saldo']),
    ...(ledgerRows.length ? ledgerRows : [[{ v: 'Tidak ada transaksi kas pada periode ini.', s: 'muted' as const }]]),
    [
      { v: 'TOTAL', s: 'totalLabel' as const },
      { v: '', s: 'totalLabel' as const },
      { v: '', s: 'totalLabel' as const },
      { v: '', s: 'totalLabel' as const },
      { v: `${report.ledger.length} transaksi`, s: 'totalLabel' },
      moneyTotal(s.cashIn),
      moneyTotal(s.cashOut),
      moneyTotal(s.netCash),
    ],
  ];

  // ---------------- Sheet 3: Per Petani ----------------
  const petaniRows: CellValue[][] = report.perPetani.map((p, i) => [i + 1, p.name, money(p.sales), money(p.paid)]);
  const perPetani: CellValue[][] = [
    [{ v: 'PENJUALAN PER PETANI', s: 'title' }],
    [{ v: periode, s: 'subtitle' }],
    [],
    header(['No', 'Petani', 'Penjualan', 'Bagi Hasil Diserahkan']),
    ...(petaniRows.length ? petaniRows : [[null, { v: 'Belum ada penjualan pada periode ini.', s: 'muted' as const }]]),
    [
      { v: '', s: 'totalLabel' as const },
      { v: 'TOTAL', s: 'totalLabel' as const },
      moneyTotal(report.perPetani.reduce((a, p) => a + p.sales, 0)),
      moneyTotal(report.perPetani.reduce((a, p) => a + p.paid, 0)),
    ],
  ];

  // ---------------- Sheet 4: Komoditas ----------------
  const produkRows: CellValue[][] = report.topProducts.map((p, i) => [i + 1, p.nama, p.quantity, p.satuan, money(p.amount)]);
  const komoditas: CellValue[][] = [
    [{ v: 'KOMODITAS TERLARIS', s: 'title' }],
    [{ v: periode, s: 'subtitle' }],
    [],
    header(['No', 'Komoditas', 'Terjual', 'Satuan', 'Nilai Penjualan']),
    ...(produkRows.length ? produkRows : [[null, { v: 'Belum ada penjualan pada periode ini.', s: 'muted' as const }]]),
  ];

  const sheets: SheetSpec[] = [
    { name: 'Ringkasan', rows: ringkasan, widths: [40, 20, 46], merges: ['A1:C1', 'A2:C2', 'A3:C3', 'A4:C4'] },
    { name: 'Buku Kas', rows: bukuKas, widths: [14, 22, 18, 22, 38, 16, 16, 18], merges: ['A1:H1', 'A2:H2'], freezeRow: 5 },
    { name: 'Per Petani', rows: perPetani, widths: [6, 32, 20, 24], merges: ['A1:D1', 'A2:D2'], freezeRow: 5 },
    { name: 'Komoditas', rows: komoditas, widths: [6, 30, 12, 12, 20], merges: ['A1:E1', 'A2:E2'], freezeRow: 5 },
  ];
  return buildXlsx(sheets);
}
