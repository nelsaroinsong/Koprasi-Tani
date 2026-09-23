'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface UserVerifyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    isVerified: boolean;
  } | null;
}

export function UserVerifyDialog({
  isOpen,
  onClose,
  onSuccess,
  user,
}: UserVerifyDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!user) return null;

  const targetVerifiedStatus = !user.isVerified;

  const handleToggle = async () => {
    try {
      setIsUpdating(true);
      setErrorMessage(null);

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          isVerified: targetVerifiedStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengubah status verifikasi.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error toggle verify:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-xl">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${
              targetVerifiedStatus
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                {targetVerifiedStatus ? 'Konfirmasi Verifikasi Petani' : 'Konfirmasi Cabut Verifikasi'}
              </DialogTitle>
              <span className="text-[11px] text-slate-500 font-medium">
                Pembaruan status keanggotaan resmi koperasi
              </span>
            </div>
          </div>

          <DialogDescription className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mt-2">
            {targetVerifiedStatus ? (
              <>
                Apakah Anda yakin ingin <strong>memverifikasi keanggotaan resmi</strong> petani ini?
                Petani yang terverifikasi dapat menjual hasil komoditas ke toko koperasi.
              </>
            ) : (
              <>
                Apakah Anda yakin ingin <strong>mencabut status verifikasi</strong> petani ini?
              </>
            )}
            <div className="mt-2 pt-2 border-t border-slate-200 text-slate-900 font-semibold flex flex-col gap-0.5">
              <span>{user.name}</span>
              <span className="text-slate-500 font-normal text-[11px]">{user.email}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMessage}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUpdating}
            className="py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleToggle}
            disabled={isUpdating}
            className={`py-2 px-4 rounded-xl text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-2 ${
              targetVerifiedStatus
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>{targetVerifiedStatus ? 'Ya, Verifikasi' : 'Ya, Cabut Verifikasi'}</span>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
