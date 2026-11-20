'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LoaderGooeyBlobs } from '@/components/ui/loaders-gooey-blobs';

interface GooeyPreloaderProps {
  durationMs?: number;
  label?: string;
  caption?: string;
  /** Called when the overlay starts fading out (start hero animation here). */
  onReveal?: () => void;
  /** Called after the overlay has fully disappeared. */
  onComplete?: () => void;
}

const FADE_MS = 600;

export default function GooeyPreloader({
  durationMs = 2000,
  label = 'Koperasi Sinar Pagi Sejahtera',
  caption = 'Memuat Ekosistem Pertanian',
  onReveal,
  onComplete,
}: GooeyPreloaderProps) {
  const [visible, setVisible] = useState(true);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  // Lock scroll while loading
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onRevealRef.current?.();
      setVisible(false);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="gooey-preloader"
          role="progressbar"
          aria-label={label}
          aria-busy="true"
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-6 bg-[#f4f5f1] text-[#151412]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_MS / 1000, ease: [0.76, 0, 0.24, 1] }}
        >
          <LoaderGooeyBlobs size={22} color="#151412" />
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-[15px] font-normal tracking-tight leading-[1.08]">
              {label}
            </span>
            <span className="text-[13px] font-normal tracking-tight leading-[1.08] opacity-55">
              {caption}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
