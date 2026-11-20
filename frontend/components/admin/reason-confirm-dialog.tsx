'use client';

import React, { useState } from 'react';
import { AlertTriangle, Loader2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface ReasonConfirmDialogProps {
  open: boolean;
  title: string;
  /** Mis. "#KOP-2611-4626 · Lionel · Rp 10.000" */
  subtitle?: string;
  /** Poin dampak tindakan, ditampilkan sebagai daftar peringatan */
  consequences: string[];
  quickReasons?: string[];
  reasonLabel?: string;
  confirmLabel: string;
  isSubmitting?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/** Konfirmasi tindakan yang tidak bisa diurungkan (batal / tolak) + alasan untuk pelanggan. */
export function ReasonConfirmDialog({
  open,
  title,
  subtitle,
  consequences,
  quickReasons = [],
  reasonLabel = 'Alasan (dilihat pelanggan)',
  confirmLabel,
  isSubmitting = false,
  onConfirm,
  onClose,
}: ReasonConfirmDialogProps) {
  // Isian kosong lagi untuk target baru: parent memberi `key` berbeda per target
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md p-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isSubmitting) onConfirm(reason.trim());
          }}
        >
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-slate-900">{title}</DialogTitle>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
              </div>
            </div>

            <ul className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11.5px] text-amber-900 space-y-1">
              {consequences.map((c) => (
                <li key={c} className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-px" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-1.5">
              <label htmlFor="reason-confirm-input" className="text-xs font-semibold text-slate-800">
                {reasonLabel} <span className="font-normal text-slate-400">· opsional</span>
              </label>
              {quickReasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quickReasons.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setReason(q)}
                      className={`h-7 px-2.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                        reason === q
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                id="reason-confirm-input"
                rows={2}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tulis alasan singkat..."
                className="w-full text-[13px] px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none text-slate-800"
              />
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              {confirmLabel}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
