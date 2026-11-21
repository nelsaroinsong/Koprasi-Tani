'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw, Wrench, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';
import {
  formatCountdown,
  formatWitaDateTime,
  formatWitaRange,
  type MaintenanceEvaluation,
} from '@/lib/maintenance';

interface MaintenanceScreenProps {
  initialStatus: MaintenanceEvaluation;
}

export function MaintenanceScreen({ initialStatus }: MaintenanceScreenProps) {
  const [status, setStatus] = useState<MaintenanceEvaluation>(initialStatus);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [isChecking, setIsChecking] = useState(false);
  const [isBackOnline, setIsBackOnline] = useState(!initialStatus.isMaintenance);

  const checkStatus = useCallback(async (manual = false) => {
    if (manual) setIsChecking(true);
    try {
      const res = await fetch('/api/system/maintenance', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);
      if (!data.isMaintenance) {
        setIsBackOnline(true);
        // Jika datang dari halaman lain yang di-rewrite, muat ulang URL asli; jika langsung di /maintenance, kembali ke beranda
        setTimeout(() => {
          if (window.location.pathname === '/maintenance') {
            window.location.href = '/';
          } else {
            window.location.reload();
          }
        }, 900);
      }
    } catch {
      // Abaikan gangguan jaringan sementara
    } finally {
      if (manual) setIsChecking(false);
    }
  }, []);

  // Hitung mundur tiap detik
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Cek otomatis tiap 30 detik apakah pemeliharaan sudah selesai
  useEffect(() => {
    if (isBackOnline) return;
    const t = setInterval(() => {
      void checkStatus(false);
    }, 30_000);
    return () => clearInterval(t);
  }, [checkStatus, isBackOnline]);

  // Jika jam selesai tercapai di timer lokal, langsung cek ke server
  const endAtIso = status.activeWindow?.endAt || null;
  useEffect(() => {
    if (!endAtIso || isBackOnline) return;
    const msLeft = new Date(endAtIso).getTime() - Date.now();
    if (msLeft <= 0) return;
    const t = setTimeout(() => {
      void checkStatus(false);
    }, Math.min(msLeft + 1500, 2_147_000_000));
    return () => clearTimeout(t);
  }, [endAtIso, isBackOnline, checkStatus]);

  const countdown = endAtIso ? formatCountdown(endAtIso, nowMs) : '';

  return (
    <main className="fixed inset-0 z-[100] overflow-y-auto bg-[#f4f5f1] text-[#1a2610] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg my-auto">
        {/* Logo Koperasi dari R2 */}
        <div className="flex justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/images/landing/koperasi-full-dark.png"
            alt="Koperasi Sinar Pagi Sejahtera"
            className="h-9 sm:h-10 w-auto object-contain"
          />
        </div>

        <div className="bg-white rounded-3xl border border-[#dce1d6] shadow-[0_8px_32px_rgba(26,38,16,0.06)] p-6 sm:p-8 text-center">
          {/* Ikon & Badge Status */}
          <div className="flex justify-center mb-4">
            {isBackOnline ? (
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#233414] flex items-center justify-center text-[#D4F63D] shadow-xs">
                <Wrench className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f5f1] border border-[#dce1d6] text-[11px] font-semibold text-[#233414] tracking-wide mb-3">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBackOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            {isBackOnline ? 'Sistem Kembali Online' : 'Pemeliharaan Sistem Berlangsung'}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#141414] tracking-tight leading-snug">
            {isBackOnline ? 'Layanan Sudah Dapat Digunakan' : status.title || 'Pemeliharaan Sistem Terjadwal'}
          </h1>

          <p className="mt-2.5 text-xs sm:text-[13.5px] text-neutral-600 leading-relaxed max-w-md mx-auto">
            {isBackOnline
              ? 'Pemeliharaan selesai. Anda akan segera diarahkan kembali ke halaman utama Koperasi Sinar Pagi Sejahtera.'
              : status.message}
          </p>

          {/* Kartu Jadwal & Hitung Mundur */}
          {!isBackOnline && (
            <div className="mt-6 rounded-2xl bg-[#f8f9f5] border border-[#e3e7dc] p-4 text-left space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#233414] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-neutral-500">
                    {endAtIso ? 'Estimasi Jadwal Pemeliharaan' : 'Status Pemeliharaan'}
                  </div>
                  <div className="text-xs sm:text-[13px] font-semibold text-[#1a2610] mt-0.5 tabular-nums">
                    {status.activeWindow?.endAt
                      ? formatWitaRange(status.activeWindow.startAt, status.activeWindow.endAt)
                      : 'Sedang berlangsung — akan segera dibuka kembali'}
                  </div>
                  {endAtIso && countdown && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#233414] text-[#D4F63D] text-[11px] font-semibold tabular-nums">
                      <span>Perkiraan selesai dalam {countdown}</span>
                    </div>
                  )}
                </div>
              </div>

              {status.contactInfo && (
                <div className="pt-2.5 border-t border-[#e3e7dc] flex items-center gap-2 text-xs text-neutral-600">
                  <Phone className="w-3.5 h-3.5 text-[#233414] shrink-0" />
                  <span>
                    Butuh bantuan mendesak? <b className="text-[#1a2610]">{status.contactInfo}</b>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Jaminan Keamanan Data */}
          {!isBackOnline && (
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-neutral-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Data pesanan, sewa alat, dan saldo bagi hasil Anda tetap aman.</span>
            </div>
          )}

          {/* Tombol Cek Status */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              type="button"
              disabled={isChecking || isBackOnline}
              onClick={() => void checkStatus(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#233414] hover:bg-[#1a2610] text-white text-xs sm:text-[13px] font-semibold transition cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Memeriksa...' : 'Periksa Status Sekarang'}</span>
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-neutral-500">
          Koperasi Sinar Pagi Sejahtera · Minahasa Utara, Sulawesi Utara
          {endAtIso ? ` · Pembaruan terakhir ${formatWitaDateTime(status.evaluatedAt)}` : ''}
        </p>
      </div>
    </main>
  );
}
