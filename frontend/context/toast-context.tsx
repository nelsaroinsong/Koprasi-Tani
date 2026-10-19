'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastOptions {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number; // ms, default 4500
}

interface ToastContextType {
  showToast: (options: ToastOptions | string) => void;
  hideToast: (id?: string | number) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const hideToast = useCallback((id?: string | number) => {
    if (id !== undefined) {
      toast.dismiss(id);
    } else {
      toast.dismiss();
    }
  }, []);

  const showToast = useCallback((options: ToastOptions | string) => {
    if (typeof options === 'string') {
      toast(options, { duration: 4500 });
      return;
    }

    const title = options.title || options.message;
    const description = options.title ? options.message : undefined;
    const duration = options.duration || 4500;
    const type = options.type || 'info';

    switch (type) {
      case 'success':
        toast.success(title, { description, duration });
        break;
      case 'error':
        toast.error(title, { description, duration });
        break;
      case 'warning':
        toast.warning(title, { description, duration });
        break;
      case 'info':
      default:
        toast.info(title, { description, duration });
        break;
    }
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
