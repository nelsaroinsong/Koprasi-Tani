'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, Share, SquarePlus, X } from 'lucide-react';

/**
 * Banner "Pasang Aplikasi" (PWA):
 * - Android/Chrome/Edge: tombol Pasang memanggil dialog instal bawaan browser (beforeinstallprompt).
 * - iPhone/iPad Safari: tidak ada dialog otomatis, jadi tampilkan petunjuk "Bagikan → Tambah ke Layar Utama".
 * Tidak tampil bila sudah terpasang, di halaman admin, atau setelah ditutup (diingat 14 hari).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'koperasi_install_dismissed_at';
const DISMISS_DAYS = 14;
const HIDDEN_PREFIXES = ['/admin', '/login', '/auth-callback', '/onboarding'];

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // Safari iOS
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return ios && !otherBrowser;
}

export default function InstallAppPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<'android' | 'ios' | null>(null);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // tahan dialog bawaan, tampilkan lewat tombol kita
      setDeferred(e as BeforeInstallPromptEvent);
      setMode('android');
    };
    const onInstalled = () => {
      setMode(null);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS tidak punya beforeinstallprompt: tampilkan petunjuk setelah jeda singkat
    const t = isIosSafari() ? window.setTimeout(() => setMode('ios'), 2500) : undefined;

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      if (t) window.clearTimeout(t);
    };
  }, []);

  if (!mode || HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setMode(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
    setMode(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Pasang aplikasi Koperasi Tani"
      className="fixed left-3 right-3 bottom-[calc(76px+env(safe-area-inset-bottom))] sm:bottom-5 sm:left-auto sm:right-5 sm:w-[360px] z-[60] rounded-2xl bg-white border border-[#dce1d6] shadow-[0_12px_32px_rgba(26,38,16,0.18)] p-3.5"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-[#1a2610]">Pasang Aplikasi Koperasi Tani</div>
          {mode === 'android' ? (
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
      {mode === 'android' && (
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
            onClick={install}
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
