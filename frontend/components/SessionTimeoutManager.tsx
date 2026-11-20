'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';

// Durasi batas waktu tidak ada aktivitas: 1 Jam (3600 detik = 3.600.000 ms)
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
const STORAGE_ACTIVITY_KEY = 'koperasi_last_activity_time';
const THROTTLE_UPDATE_MS = 15 * 1000; // Simpan pembaruan aktivitas setiap 15 detik

export default function SessionTimeoutManager() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const lastRecordedRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) {
      // Jika belum login, bersihkan waktu aktivitas
      localStorage.removeItem(STORAGE_ACTIVITY_KEY);
      return;
    }

    // Catat waktu aktivitas awal saat pertama login/buka halaman jika belum ada
    const existing = localStorage.getItem(STORAGE_ACTIVITY_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_ACTIVITY_KEY, Date.now().toString());
    }

    // Fungsi memperbarui waktu aktivitas pengguna (dithrottle)
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastRecordedRef.current > THROTTLE_UPDATE_MS) {
        lastRecordedRef.current = now;
        localStorage.setItem(STORAGE_ACTIVITY_KEY, now.toString());
      }
    };

    // Fungsi memeriksa apakah batas waktu 1 jam telah terlewati
    const checkTimeout = () => {
      const lastStr = localStorage.getItem(STORAGE_ACTIVITY_KEY);
      if (!lastStr) return;

      const lastTime = parseInt(lastStr, 10);
      const elapsed = Date.now() - lastTime;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        // Hapus penanda aktivitas
        localStorage.removeItem(STORAGE_ACTIVITY_KEY);

        // Tampilkan Toast Peringatan
        showToast({
          type: 'warning',
          title: 'Sesi Telah Berakhir',
          message: 'Sesi Anda telah berakhir karena tidak ada aktivitas selama 1 jam. Silakan masuk kembali.',
          duration: 9000,
        });

        // Logout dan alihkan ke halaman login
        // logout() mengarahkan admin ke login admin, pengguna ke /login
        logout({ reason: 'timeout' });
      }
    };

    // Event listener untuk interaksi pengguna
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((evt) => window.addEventListener(evt, updateActivity, { passive: true }));

    // Cek langsung saat tab browser aktif kembali (misal setelah layar laptop dibuka lagi)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimeout();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkTimeout);

    // Interval rutin setiap 15 detik untuk memantau timeout
    const interval = setInterval(checkTimeout, 15000);

    // Jalankan pengecekan pertama saat mount
    checkTimeout();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, updateActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkTimeout);
      clearInterval(interval);
    };
  }, [user, logout, showToast, router]);

  return null;
}
