'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import {
  Users,
  Store,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Loader2,
  UserX,
  ShoppingBag,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';

export default function MengikutiPage() {
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
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col pb-20">
      <AppHeader activePage="profile" />

      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-[#dce1d6] sticky top-16 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-[#526046]">
          <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
            <Link href="/profile" className="hover:text-[#344d15] flex items-center gap-1 transition font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Profil</span>
            </Link>
            <span className="text-[#cfd6c9]">/</span>
            <span className="text-[#1a2610] font-bold">Petani yang Diikuti</span>
          </div>
          <span className="text-xs text-[#233414] font-semibold bg-[#e2f2c8] px-2.5 py-0.5 rounded-full border border-[#c9e39e] tabular-nums">
            {followingList.length} Petani
          </span>
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#233414] animate-spin" />
            <p className="text-xs text-[#526046] font-medium">Memuat daftar petani...</p>
          </div>
        ) : followingList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#dce1d6] p-10 sm:p-14 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#e2f2c8] text-[#233414] flex items-center justify-center mx-auto border border-[#c9e39e]">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1a2610]">Belum Ada Petani yang Diikuti</h3>
              <p className="text-xs sm:text-sm text-[#526046] max-w-md mx-auto mt-1">
                Jelajahi etalase komoditas koperasi dan ikuti petani binaan untuk mendapatkan produk segar langsung dari kebun mereka.
              </p>
            </div>
            <Link
              href="/toko"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs sm:text-sm transition"
            >
              <ShoppingBag className="w-4 h-4 text-[#D4F63D]" />
              <span>Jelajahi Belanja Koperasi</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {followingList.map((petani) => (
              <div
                key={petani.id}
                className="bg-white rounded-2xl border border-[#dce1d6] hover:border-[#344d15] p-4 sm:p-5 transition-colors flex flex-col justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5">
                  <Avatar className="w-12 h-12 rounded-2xl border border-[#cfd6c9] shrink-0">
                    <AvatarImage src={petani.avatarUrl || ''} alt={petani.name} />
                    <AvatarFallback className="bg-[#233414] text-[#D4F63D] font-black text-sm rounded-2xl">
                      {petani.name ? petani.name.slice(0, 2).toUpperCase() : 'PT'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/toko/petani/${petani.id}`}
                        className="font-extrabold text-sm text-[#1a2610] hover:text-[#344d15] transition truncate"
                      >
                        {petani.name}
                      </Link>
                      {petani.isVerified && (
                        <CheckCircle2 className="w-4 h-4 text-[#344d15] fill-[#e2f2c8] shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[#5b6950] truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#5b6950] shrink-0" />
                      <span className="truncate">{petani.address || 'Kab. Minahasa Utara'}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-[#526046] tabular-nums">
                      <span className="font-semibold text-[#1a2610]">
                        {petani.totalBarang} komoditas
                      </span>
                      <span className="text-[#cfd6c9]">•</span>
                      <span>{petani.followersCount} pengikut</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#EAEDE7] flex items-center justify-between gap-2">
                  <Link
                    href={`/toko/petani/${petani.id}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Store className="w-3.5 h-3.5 text-[#D4F63D]" />
                    <span>Lihat Toko</span>
                  </Link>

                  <button
                    onClick={() => handleUnfollow(petani.id, petani.name)}
                    disabled={unfollowingId === petani.id}
                    className="py-2 px-3 rounded-xl border border-[#cfd6c9] bg-white hover:bg-[#ffedea] hover:border-red-200 text-[#526046] hover:text-[#831c1e] text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                    title="Batal Mengikuti"
                  >
                    {unfollowingId === petani.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5b6950]" />
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
