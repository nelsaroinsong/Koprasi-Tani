'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';

const rp = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

interface Stat {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warn' | 'good';
}

/** Ringkasan aktivitas pengguna (petani / pembeli) di dialog detail admin. */
export function UserActivitySummary({ userId, role }: { userId: string; role: 'PETANI' | 'PEMBELI' }) {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/users/${userId}/summary`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (!active) return;
        if (!r.ok || !d.success) setError(d.error || 'Gagal memuat ringkasan');
        else setData(d.summary);
      })
      .catch(() => active && setError('Gagal memuat ringkasan'));
    return () => {
      active = false;
    };
  }, [userId]);

  let stats: Stat[] = [];
  if (data && role === 'PETANI') {
    stats = [
      {
        label: 'Komoditas',
        value: String(data.productCount),
        hint: `${data.activeProductCount} tayang & berstok`,
      },
      {
        label: 'Terjual (selesai)',
        value: rp(data.soldAmount),
        hint: `${data.soldTransactions} transaksi`,
      },
      {
        label: 'Bagi hasil menunggu',
        value: rp(data.payoutPending),
        hint: 'Siap diserahkan tunai',
        tone: data.payoutPending > 0 ? 'warn' : 'default',
      },
      { label: 'Sudah diserahkan', value: rp(data.payoutPaid), tone: 'good' },
    ];
  } else if (data) {
    stats = [
      {
        label: 'Pesanan toko',
        value: String(data.orderTotal),
        hint: `${data.orderDone} selesai · ${data.orderCancelled} batal`,
      },
      {
        label: 'Pesanan aktif',
        value: String(data.orderActive),
        hint: 'Belum selesai',
        tone: data.orderActive > 0 ? 'warn' : 'default',
      },
      { label: 'Total belanja', value: rp(data.totalSpent), hint: 'Dari pesanan selesai', tone: 'good' },
      {
        label: 'Sewa alat',
        value: String(data.rentalTotal),
        hint: `${data.rentalActive} sedang berjalan`,
      },
    ];
  }

  return (
    <section className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-slate-500" />
        <h3 className="text-[12px] font-semibold text-slate-800">Ringkasan Aktivitas</h3>
      </div>

      {error ? (
        <div className="px-4 py-4 text-[11.5px] text-rose-600">{error}</div>
      ) : !data ? (
        <div className="px-4 py-5 flex items-center justify-center gap-2 text-[11.5px] text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Memuat ringkasan...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100 [&>*:nth-child(-n+2)]:border-t-0">
            {stats.map((s) => (
              <div key={s.label} className="px-4 py-3 min-w-0">
                <div className="text-[11px] text-slate-500 truncate">{s.label}</div>
                <div
                  className={`text-[14px] font-semibold tabular-nums mt-0.5 truncate ${
                    s.tone === 'warn' ? 'text-amber-700' : s.tone === 'good' ? 'text-emerald-700' : 'text-slate-900'
                  }`}
                >
                  {s.value}
                </div>
                {s.hint && <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">{s.hint}</div>}
              </div>
            ))}
          </div>
          {role === 'PEMBELI' && data.lastOrder && (
            <div className="px-4 py-2.5 text-[11.5px] text-slate-500">
              Pesanan terakhir: <span className="font-medium text-slate-800">#{data.lastOrder.orderNumber}</span> ·{' '}
              {new Date(data.lastOrder.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
