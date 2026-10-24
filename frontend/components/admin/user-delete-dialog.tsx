'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/context/toast-context';

interface UserDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
}

export function UserDeleteDialog({
  isOpen,
  onClose,
  onSuccess,
  user,
}: UserDeleteDialogProps) {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset pesan error saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!user) return null;

  const roleLabel =
    user.role === 'PETANI'
      ? 'Petani mitra'
      : user.role === 'PEMBELI'
      ? 'Data pembeli'
      : 'Pengguna';

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage(null);

      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal menghapus pengguna.');
      }

      showToast({
        title: 'Berhasil Dihapus',
        message: `${roleLabel} "${user.name}" berhasil dihapus dari sistem koperasi.`,
        type: 'success',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error delete user:', err);
      const rawMsg = String(err.message || '');
      let msg = 'Terjadi kesalahan sistem saat menghapus pengguna.';

      if (
        rawMsg.includes('Foreign key') ||
        rawMsg.includes('foreign key') ||
        rawMsg.includes('prisma') ||
        rawMsg.includes('invocation') ||
        rawMsg.includes('constraint')
      ) {
        msg = 'Tidak dapat menghapus akun karena masih memiliki data keterkaitan transaksi aktif.';
      } else if (rawMsg && !rawMsg.includes('`') && !rawMsg.includes('{')) {
        msg = rawMsg;
      }

      setErrorMessage(msg);
      showToast({
        title: 'Gagal Menghapus',
        message: msg,
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-xl">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                Konfirmasi Hapus Pengguna
              </DialogTitle>
              <span className="text-[11px] text-slate-500 font-medium">
                Tindakan ini permanen dan tidak dapat dibatalkan
              </span>
            </div>
          </div>

          <DialogDescription className="text-xs text-slate-500 mt-0.5">
            Tindakan ini permanen dan akan menghapus akun dari sistem koperasi.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-2 mt-2">
          <p>
            Apakah Anda yakin ingin menghapus akun berikut dari database koperasi?
          </p>
          <div className="pt-2 border-t border-slate-200 text-slate-900 font-semibold flex flex-col gap-0.5">
            <span>{user.name}</span>
            <span className="text-slate-500 font-normal text-[11px]">{user.email}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMessage}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Menghapus...</span>
              </>
            ) : (
              <span>Ya, Hapus Pengguna</span>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
