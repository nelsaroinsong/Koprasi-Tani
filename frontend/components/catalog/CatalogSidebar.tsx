'use client';

import React, { useEffect, useState } from 'react';
import { Layers, RotateCcw } from 'lucide-react';

export interface SidebarCategory {
  key: string;
  label: string;
  imageUrl?: string;
  count?: number;
}

export interface SidebarToggle {
  key: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

interface CatalogSidebarProps {
  title?: string;
  categories: SidebarCategory[];
  selectedKategori: string;
  onSelectKategori: (key: string) => void;
  fallbackIcon: (key: string) => string;
  toggles?: SidebarToggle[];
  toggleTitle?: string;
  price: {
    title: string;
    min: number;
    max: number;
    floor: number;
    ceil: number;
    onApply: (min: number, max: number) => void;
  };
  hasActiveFilters: boolean;
  onReset: () => void;
}

const formatRupiah = (n: number) => n.toLocaleString('id-ID');

/** Sidebar filter desktop (lg+) untuk katalog Toko & Sewa Alat */
export function CatalogSidebar({
  title = 'Filter produk',
  categories,
  selectedKategori,
  onSelectKategori,
  fallbackIcon,
  toggles = [],
  toggleTitle = 'Ketersediaan',
  price,
  hasActiveFilters,
  onReset,
}: CatalogSidebarProps) {
  const [minInput, setMinInput] = useState(price.min > price.floor ? String(price.min) : '');
  const [maxInput, setMaxInput] = useState(price.max >= price.ceil ? '' : String(price.max));

  useEffect(() => {
    setMinInput(price.min > price.floor ? String(price.min) : '');
    setMaxInput(price.max < price.ceil ? String(price.max) : '');
  }, [price.min, price.max, price.floor, price.ceil]);

  const applyPrice = () => {
    let min = Number(minInput.replace(/\D/g, '')) || price.floor;
    let max = Number(maxInput.replace(/\D/g, '')) || price.ceil;
    min = Math.max(price.floor, Math.min(min, price.ceil));
    max = Math.max(price.floor, Math.min(max, price.ceil));
    if (min > max) [min, max] = [max, min];
    price.onApply(min, max);
  };

  return (
    <aside className="hidden lg:block w-[260px] shrink-0 self-start sticky top-[88px]">
      <div className="bg-white border border-[#e2e7dc] rounded-[20px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#EAEDE7]">
          <h2 className="text-[13px] font-bold text-[#1a2610] tracking-tight">{title}</h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#68785b] hover:text-[#1a2610] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Kategori */}
        <div className="px-3 pt-4 pb-3 border-b border-[#EAEDE7]">
          <h3 className="px-2 mb-2 text-xs font-bold text-[#1a2610]">Kategori</h3>
          <ul className="space-y-0.5">
            {categories.map((cat) => {
              const isSelected =
                selectedKategori.toLowerCase().trim() === cat.key.toLowerCase().trim();
              const isAll = cat.key === 'SEMUA';
              return (
                <li key={cat.key}>
                  <button
                    type="button"
                    onClick={() => onSelectKategori(cat.key)}
                    aria-pressed={isSelected}
                    className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-colors cursor-pointer group ${
                      isSelected ? 'bg-[#e8f2db]' : 'hover:bg-[#f4f5f1]'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${
                        isSelected ? 'bg-white' : 'bg-[#f4f5f1] group-hover:bg-white'
                      }`}
                    >
                      {isAll ? (
                        <Layers
                          className={`w-4 h-4 ${isSelected ? 'text-[#233414]' : 'text-[#68785b]'}`}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cat.imageUrl || fallbackIcon(cat.key)}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-contain p-0.5"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = fallbackIcon(cat.key);
                          }}
                        />
                      )}
                    </span>
                    <span
                      className={`flex-1 min-w-0 truncate text-[13px] ${
                        isSelected
                          ? 'font-semibold text-[#1a2610]'
                          : 'font-medium text-[#526046] group-hover:text-[#1a2610]'
                      }`}
                    >
                      {cat.label}
                    </span>
                    {cat.count !== undefined && (
                      <span
                        className={`text-[11px] tabular-nums shrink-0 ${
                          isSelected ? 'font-semibold text-[#233414]' : 'text-[#8a9780]'
                        }`}
                      >
                        {cat.count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Ketersediaan / Opsi */}
        {toggles.length > 0 && (
          <div className="px-5 pt-4 pb-4 border-b border-[#EAEDE7]">
            <h3 className="mb-3 text-xs font-bold text-[#1a2610]">{toggleTitle}</h3>
            <div className="space-y-2.5">
              {toggles.map((t) => (
                <label
                  key={t.key}
                  className="flex items-center gap-2.5 text-[13px] text-[#526046] hover:text-[#1a2610] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={t.checked}
                    onChange={(e) => t.onChange(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#233414] cursor-pointer"
                  />
                  <span className={t.checked ? 'font-semibold text-[#1a2610]' : 'font-medium'}>
                    {t.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Rentang Harga */}
        <div className="px-5 pt-4 pb-5">
          <h3 className="mb-3 text-xs font-bold text-[#1a2610]">{price.title}</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyPrice();
            }}
            className="space-y-2.5"
          >
            <div className="flex items-center gap-2">
              <PriceInput
                value={minInput}
                onChange={setMinInput}
                placeholder={formatRupiah(price.floor)}
                ariaLabel="Harga minimum"
              />
              <span className="text-[#8a9780] text-xs">–</span>
              <PriceInput
                value={maxInput}
                onChange={setMaxInput}
                placeholder={formatRupiah(price.ceil)}
                ariaLabel="Harga maksimum"
              />
            </div>
            <button
              type="submit"
              className="w-full h-9 rounded-xl border border-[#cfd6c9] bg-white hover:bg-[#233414] hover:border-[#233414] hover:text-white text-[#233414] text-xs font-semibold transition-colors cursor-pointer"
            >
              Terapkan
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function PriceInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div className="flex-1 min-w-0 flex items-center h-9 px-2.5 rounded-xl bg-[#f4f5f1] border border-[#dce1d6] focus-within:border-[#233414] focus-within:bg-white transition-colors">
      <span className="text-[11px] text-[#8a9780] mr-1">Rp</span>
      <input
        inputMode="numeric"
        aria-label={ariaLabel}
        value={value ? Number(value.replace(/\D/g, '') || 0).toLocaleString('id-ID') : ''}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-xs text-[#1a2610] placeholder:text-[#a3ae9a] focus:outline-none tabular-nums"
      />
    </div>
  );
}

interface CatalogToolbarProps {
  from: number;
  to: number;
  total: number;
  unit: string;
}

/** Baris info jumlah item yang ditampilkan (desktop lg+) */
export function CatalogToolbar({ from, to, total, unit }: CatalogToolbarProps) {
  return (
    <div className="hidden lg:flex items-center mb-4">
      <p className="text-[13px] text-[#68785b]">
        Menampilkan{' '}
        <span className="font-semibold text-[#1a2610] tabular-nums">
          {to === 0 ? 0 : `${from}–${to}`}
        </span>{' '}
        dari <span className="font-semibold text-[#1a2610] tabular-nums">{total}</span> {unit}
      </p>
    </div>
  );
}
