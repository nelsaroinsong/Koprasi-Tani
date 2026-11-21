'use client';

import { useSyncExternalStore } from 'react';

/**
 * Status pemasangan PWA yang dipakai bersama (banner "Pasang Aplikasi" & menu beranda).
 * - Android/Chrome/Edge: menyimpan event `beforeinstallprompt` agar dialog instal bisa dipanggil kapan saja.
 * - iPhone/iPad Safari: tidak ada dialog otomatis → tampilkan petunjuk "Bagikan → Tambah ke Layar Utama".
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallState {
  /** dialog instal bawaan browser tersedia (Android/desktop Chrome/Edge) */
  canPrompt: boolean;
  /** Safari iPhone/iPad (pemasangan manual) */
  isIos: boolean;
  /** sedang dibuka sebagai aplikasi terpasang */
  isInstalled: boolean;
  /** banner petunjuk/ajakan sedang diminta tampil (mis. dari menu) */
  helpRequested: boolean;
}

const SERVER_STATE: InstallState = { canPrompt: false, isIos: false, isInstalled: false, helpRequested: false };

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = SERVER_STATE;
const listeners = new Set<() => void>();
let initialized = false;

function emit(next: Partial<InstallState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function detectIos() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
}

function detectInstalled() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function init() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  state = { canPrompt: false, isIos: detectIos(), isInstalled: detectInstalled(), helpRequested: false };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // tahan dialog bawaan; dipanggil lewat tombol kita
    deferred = e as BeforeInstallPromptEvent;
    emit({ canPrompt: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit({ canPrompt: false, isInstalled: true, helpRequested: false });
  });
}

function subscribe(listener: () => void) {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE
  );
}

/** Apakah perangkat ini bisa memasang aplikasi (untuk menampilkan tombol/menu) */
export function canOfferInstall(s: InstallState) {
  return !s.isInstalled && (s.canPrompt || s.isIos);
}

/**
 * Mulai pemasangan: Android → dialog instal; iPhone → minta banner menampilkan petunjuk.
 * @returns 'accepted' | 'dismissed' | 'help' | 'unavailable'
 */
export async function startInstall(): Promise<'accepted' | 'dismissed' | 'help' | 'unavailable'> {
  if (deferred) {
    const ev = deferred;
    await ev.prompt();
    const choice = await ev.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
    deferred = null;
    emit({ canPrompt: false, helpRequested: false, ...(choice.outcome === 'accepted' ? { isInstalled: true } : {}) });
    return choice.outcome;
  }
  if (state.isIos && !state.isInstalled) {
    emit({ helpRequested: true });
    return 'help';
  }
  return 'unavailable';
}

/** Tutup permintaan petunjuk (dipanggil banner saat ditutup) */
export function clearInstallHelp() {
  if (state.helpRequested) emit({ helpRequested: false });
}
