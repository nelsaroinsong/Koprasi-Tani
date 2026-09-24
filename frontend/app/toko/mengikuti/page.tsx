'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  Users,
  Store,
  ArrowLeft,
  CheckCircle2,
  Package,
  MapPin,
  Loader2,
  UserX,
  ExternalLink,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';

export default function MengikutiPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [followingList, setFollowingList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);

  const fetchFollowing = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/user/following');
      const data = await res.json();
      if (res.ok && data.following) {
        setFollowingList(data.following);
      }
    } catch (err) {
      console.error('Error fetching following list:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchFollowing();
    }
  }, [user, fetchFollowing]);

  const handleUnfollow = async (petaniId: string, petaniName: string) => {
    try {
      setUnfollowingId(petaniId);
      const res = await fetch(`/api/petani/${petaniId}/follow`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        showToast({
          title: 'Berhenti Mengikuti',
          message: `Anda berhenti mengikuti ${petaniName}.`,
          type: 'info',
        });
        setFollowingList((prev) => prev.filter((p) => p.id !== petaniId));
      } else {
        showToast({
          title: 'Gagal',
          message: data.error || 'Terjadi kesalahan.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error unfollowing:', err);
    } finally {
      setUnfollowingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col">
      <AppHeader activePage="toko" />

      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200/80 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
            <Link href="/toko" className="hover:text-emerald-700 flex items-center gap-1 transition">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Belanja Koperasi</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-bold">Petani yang Diikuti</span>
          </div>
          <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            {followingList.length} Petani
          </span>
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-700" />
            <span>Petani Mitra yang Anda Ikuti</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Daftar petani binaan Koperasi Sinar Pagi Sejahtera yang Anda pantau ketersediaan komoditas panennya.
          </p>
        </div>

        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Memuat daftar petani...</p>
          </div>
        ) : followingList.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 sm:p-16 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-100 shadow-2xs">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Belum Ada Petani yang Diikuti</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                Jelajahi etalase komoditas koperasi dan ikuti petani binaan untuk mendapatkan produk segar langsung dari kebun mereka.
              </p>
            </div>
            <Link
              href="/toko"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm transition shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Jelajahi Belanja Koperasi</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {followingList.map((petani) => (
              <div
                key={petani.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5">
                  <Avatar className="w-12 h-12 rounded-2xl border-2 border-emerald-500/20 shadow-2xs shrink-0">
                    <AvatarImage src={petani.avatarUrl || ''} alt={petani.name} />
                    <AvatarFallback className="bg-emerald-700 text-white font-black text-sm rounded-2xl">
                      {petani.name ? petani.name.slice(0, 2).toUpperCase() : 'PT'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/toko/petani/${petani.id}`}
                        className="font-extrabold text-sm text-slate-900 hover:text-emerald-700 transition truncate"
                      >
                        {petani.name}
                      </Link>
                      {petani.isVerified && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{petani.address || 'Kab. Minahasa Utara'}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-800">
                        📦 {petani.totalBarang} komoditas
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>👥 {petani.followersCount} pengikut</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/toko/petani/${petani.id}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Store className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Lihat Toko</span>
                  </Link>

                  <button
                    onClick={() => handleUnfollow(petani.id, petani.name)}
                    disabled={unfollowingId === petani.id}
                    className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                    title="Batal Mengikuti"
                  >
                    {unfollowingId === petani.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    ) : (
                      <UserX className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Batal</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
