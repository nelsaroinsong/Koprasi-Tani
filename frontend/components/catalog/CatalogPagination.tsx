'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}

/** Bangun daftar nomor halaman: 1 2 3 … 20 (selalu tampil awal, akhir, dan sekitar halaman aktif) */
function getPageItems(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push('gap');
    items.push(p);
  });
  return items;
}

export function CatalogPagination({ page, totalPages, onChange, disabled }: CatalogPaginationProps) {
  // Selalu tampil (meski hanya 1 halaman) agar tata letak katalog konsisten
  const items = getPageItems(page, Math.max(1, totalPages));
  const navBtn =
    'h-8 lg:h-10 px-2.5 lg:px-4 rounded-lg lg:rounded-xl border border-[#e2e7dc] bg-white text-xs lg:text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors shrink-0';

  return (
    <nav
      aria-label="Navigasi halaman"
      className="mt-5 lg:mt-8 pt-4 lg:pt-6 border-t border-[#e2e7dc] flex items-center justify-between gap-2"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        className={`${navBtn} text-[#1a2610] hover:border-[#b8c4ae] hover:bg-[#f4f5f1] cursor-pointer disabled:text-[#b3bcab] disabled:hover:bg-white disabled:hover:border-[#e2e7dc] disabled:cursor-not-allowed`}
      >
        <ChevronLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
        <span className="hidden lg:inline">Sebelumnya</span>
      </button>

      <ol className="flex items-center gap-1 lg:gap-1.5">
        {items.map((it, i) =>
          it === 'gap' ? (
            <li key={`gap-${i}`} className="w-5 lg:w-8 text-center text-xs lg:text-[13px] text-[#8a9780] select-none">
              …
            </li>
          ) : (
            <li key={it}>
              <button
                type="button"
                onClick={() => onChange(it)}
                disabled={disabled}
                aria-current={it === page ? 'page' : undefined}
                className={`w-7 h-7 lg:w-9 lg:h-9 rounded-md lg:rounded-lg text-xs lg:text-[13px] tabular-nums transition-colors cursor-pointer ${
                  it === page
                    ? 'bg-[#233414] text-white font-semibold'
                    : 'text-[#1a2610] font-medium hover:bg-[#EAEDE7]'
                }`}
              >
                {it}
              </button>
            </li>
          )
        )}
      </ol>

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        className={`${navBtn} text-[#1a2610] hover:border-[#b8c4ae] hover:bg-[#f4f5f1] cursor-pointer disabled:text-[#b3bcab] disabled:hover:bg-white disabled:hover:border-[#e2e7dc] disabled:cursor-not-allowed`}
      >
        <span className="hidden lg:inline">Berikutnya</span>
        <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
      </button>
    </nav>
  );
}
