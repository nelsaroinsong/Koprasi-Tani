'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastOptions {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number; // ms, default 6000
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextType {
  showToast: (options: ToastOptions | string) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions | string) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    const item: ToastItem =
      typeof options === 'string'
        ? { id, message: options, type: 'info', duration: 6000 }
        : {
            id,
            title: options.title,
            message: options.message,
            type: options.type || 'info',
            duration: options.duration || 6000,
          };

    setToasts((prev) => [...prev, item]);

    if (item.duration && item.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, item.duration);
    }
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}

      {/* Floating Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2.5rem)] pointer-events-none">
        {toasts.map((toast) => {
          let bgClass = 'bg-slate-900/95 border-slate-700 text-white';
          let icon = <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />;

          if (toast.type === 'warning') {
            bgClass = 'bg-amber-950/95 border-amber-600/50 text-amber-50';
            icon = <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />;
          } else if (toast.type === 'success') {
            bgClass = 'bg-emerald-950/95 border-emerald-600/50 text-emerald-50';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />;
          } else if (toast.type === 'error') {
            bgClass = 'bg-rose-950/95 border-rose-600/50 text-rose-50';
            icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 duration-200 flex items-start gap-3 ${bgClass}`}
            >
              {icon}
              <div className="flex-1 min-w-0 pr-1">
                {toast.title && (
                  <h4 className="text-xs font-bold leading-tight mb-0.5 tracking-wide">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs leading-relaxed opacity-90">{toast.message}</p>
              </div>
              <button
                onClick={() => hideToast(toast.id)}
                className="opacity-70 hover:opacity-100 transition p-1 -mr-1 -mt-1 cursor-pointer text-slate-300 hover:text-white"
                title="Tutup"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
