'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  OctagonX,
  Loader2,
} from 'lucide-react';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      closeButton
      icons={{
        success: <CheckCircle2 className="w-4 h-4 text-[#233414]" />,
        info: <Info className="w-4 h-4 text-[#344d15]" />,
        warning: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        error: <OctagonX className="w-4 h-4 text-red-600" />,
        loading: <Loader2 className="w-4 h-4 text-[#233414] animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-[#1a2610] group-[.toaster]:border group-[.toaster]:border-[#dce1d6] group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:px-4 group-[.toaster]:py-3.5 font-sans',
          title: 'group-[.toast]:text-xs sm:group-[.toast]:text-sm group-[.toast]:font-bold group-[.toast]:text-[#1a2610]',
          description: 'group-[.toast]:text-xs group-[.toast]:text-[#526046] group-[.toast]:mt-0.5 group-[.toast]:leading-relaxed',
          actionButton:
            'group-[.toast]:bg-[#233414] group-[.toast]:text-white group-[.toast]:font-semibold group-[.toast]:rounded-lg',
          cancelButton:
            'group-[.toast]:bg-[#f4f5f1] group-[.toast]:text-[#526046] group-[.toast]:font-medium group-[.toast]:rounded-lg',
          closeButton:
            'group-[.toast]:bg-white group-[.toast]:border-[#dce1d6] group-[.toast]:text-[#526046] hover:group-[.toast]:bg-[#f4f5f1] hover:group-[.toast]:text-[#1a2610]',
          success:
            'group-[.toaster]:!bg-white group-[.toaster]:!border-[#c9e39e] group-[.toaster]:!text-[#1a2610]',
          error:
            'group-[.toaster]:!bg-white group-[.toaster]:!border-red-200 group-[.toaster]:!text-red-950',
          warning:
            'group-[.toaster]:!bg-white group-[.toaster]:!border-amber-200 group-[.toaster]:!text-amber-950',
          info:
            'group-[.toaster]:!bg-white group-[.toaster]:!border-[#dce1d6] group-[.toaster]:!text-[#1a2610]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
