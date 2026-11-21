'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { canOfferInstall, clearInstallHelp, startInstall, useInstallState } from '@/lib/pwa-install';

/**
 * Banner "Pasang Aplikasi" (PWA) dengan animasi masuk/keluar.
 * - Android/Chrome/Edge: tombol Pasang membuka dialog instal bawaan browser.
 * - iPhone/iPad Safari: petunjuk "Bagikan → Tambah ke Layar Utama".
 * Tidak tampil bila sudah terpasang, di halaman admin/login, atau setelah ditutup (diingat 14 hari) —
 * kecuali diminta lagi dari menu "Pasang Aplikasi".
 */

const DISMISS_KEY = 'koperasi_install_dismissed_at';
const DISMISS_DAYS = 14;
const HIDDEN_PREFIXES = ['/admin', '/login', '/auth-callback', '/onboarding'];
const ANIM_MS = 320;

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export default function InstallAppPrompt() {
  const pathname = usePathname();
  const install = useInstallState();
  const [dismissed, setDismissed] = useState(() => typeof window !== 'undefined' && recentlyDismissed());
  const [iosReady, setIosReady] = useState(false);
  // render: elemen ada di DOM; open: posisi akhir animasi (terlihat)
  const [render, setRender] = useState(false);
  const [open, setOpen] = useState(false);

  // iPhone tidak punya event instal: tampilkan petunjuk setelah jeda singkat
  useEffect(() => {
    if (!install.isIos) return;
    const t = window.setTimeout(() => setIosReady(true), 2500);
    return () => window.clearTimeout(t);
  }, [install.isIos]);

  const onHiddenPage = HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p));
  const want =
    canOfferInstall(install) &&
    (install.helpRequested || (!dismissed && !onHiddenPage && (install.canPrompt || iosReady)));

  // Animasi: masuk = pasang di DOM lalu geser naik; keluar = geser turun lalu lepas dari DOM
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let timer = 0;
    if (want) {
      raf1 = requestAnimationFrame(() => {
        setRender(true);
        raf2 = requestAnimationFrame(() => setOpen(true));
      });
    } else {
      raf1 = requestAnimationFrame(() => setOpen(false));
      timer = window.setTimeout(() => setRender(false), ANIM_MS);
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
  }, [want]);

  if (!render) return null;

  const isAndroid = install.canPrompt;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setDismissed(true);
    clearInstallHelp();
  };

  const handleInstall = async () => {
    const result = await startInstall();
    if (result !== 'help') clearInstallHelp();
  };

  return (
    <div
      role="dialog"
      aria-label="Pasang aplikasi Koperasi Tani"
      aria-hidden={!open}
      style={{ transitionDuration: `${ANIM_MS}ms` }}
      className={`fixed left-3 right-3 bottom-[calc(76px+env(safe-area-inset-bottom))] sm:bottom-5 sm:left-auto sm:right-5 sm:w-[360px] z-[60] rounded-2xl bg-white border border-[#dce1d6] shadow-[0_12px_32px_rgba(26,38,16,0.18)] p-3.5 transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        open ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-[0.98] pointer-events-none'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0 border border-[#eaede7]" />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-[#1a2610]">Pasang Aplikasi Koperasi Tani</div>
          {isAndroid ? (
            <p className="text-[12px] text-[#526046] mt-0.5 leading-snug">
              Buka lebih cepat dari layar utama HP, tanpa perlu mengetik alamat web.
            </p>
          ) : (
            <p className="text-[12px] text-[#526046] mt-0.5 leading-snug">
              Ketuk <Share className="inline w-3.5 h-3.5 -mt-0.5 text-[#233414]" /> <b>Bagikan</b> di bawah layar, lalu pilih{' '}
              <SquarePlus className="inline w-3.5 h-3.5 -mt-0.5 text-[#233414]" /> <b>Tambah ke Layar Utama</b>.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="w-7 h-7 -mr-1 -mt-1 rounded-lg text-[#5b6950] hover:bg-[#f4f5f1] flex items-center justify-center cursor-pointer shrink-0"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {isAndroid && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="h-9 px-3.5 rounded-xl text-[12.5px] font-semibold text-[#526046] hover:bg-[#f4f5f1] cursor-pointer"
          >
            Nanti saja
          </button>
          <button
            type="button"
            onClick={handleInstall}
            className="h-9 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-[12.5px] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Pasang
          </button>
        </div>
      )}
    </div>
  );
}
