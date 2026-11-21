'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ShowcaseItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  meta: string;
  image: string;
  imageAlt: string;
  imagePosition?: string;
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: 'praktik-berkelanjutan',
    tag: 'UNGGULAN KOPERASI',
    title: 'Praktik Berkelanjutan',
    description:
      'Memprioritaskan ekosistem pertanian alami dan efisiensi sumber daya lokal di seluruh kebun binaan Minahasa Utara.',
    meta: 'Minahasa Utara / Ekosistem Alami',
    image: '/landing/farmer-pruning.jpg',
    imageAlt: 'Petani merawat tanaman pertanian berkelanjutan di Minahasa Utara',
    imagePosition: 'object-center',
  },
  {
    id: 'inovasi-cerdas',
    tag: 'INOVASI CERDAS',
    title: 'Pencatatan Digital & Akurat',
    description:
      'Menerapkan teknologi digital, pencatatan transaksi real-time, serta timbangan digital 100% akurat bagi anggota.',
    meta: 'Pencatatan Real-Time / Akurasi 100%',
    image: '/landing/farmer-innovator.jpg',
    imageAlt: 'Petani binaan memantau pencatatan pertanian digital melalui tablet',
    imagePosition: 'object-[50%_18%]',
  },
  {
    id: 'sewa-alat-modern',
    tag: 'SEWA ALAT PERTANIAN',
    title: 'Mekanisasi & Alat Siap Pakai',
    description:
      'Akses penyewaan traktor dan mesin pertanian modern dengan jadwal terkelola dan biaya terjangkau untuk petani.',
    meta: 'Alsintan Koperasi / Jadwal Transparan',
    image: '/landing/hero-tractor.jpg',
    imageAlt: 'Traktor dan alat mesin pertanian modern koperasi siap pakai',
    imagePosition: 'object-center',
  },
  {
    id: 'komoditas-mandiri',
    tag: 'LINGKUNGAN & SOSIAL',
    title: 'Panen Langsung Tanpa Tengkulak',
    description:
      'Menjaga kesuburan tanah sekaligus membuka akses jual beli komoditas segar langsung dengan bagi hasil yang adil.',
    meta: 'Tanpa Tengkulak / Bagi Hasil Adil',
    image: '/landing/farmer-woman.jpg',
    imageAlt: 'Petani lokal membawa hasil panen jagung segar di lahan pertanian',
    imagePosition: 'object-[50%_18%]',
  },
];

const COOPERATIVE_STATS = [
  { value: '100+', label: 'Petani Lokal Binaan' },
  { value: '100%', label: 'Timbangan Digital Akurat' },
  { value: '24/7', label: 'Pencatatan Transaksi Real-Time' },
  { value: '4+', label: 'Instansi & Mitra Resmi' },
];

export default function AboutUsBento() {
  const sectionRef = useRef<HTMLElement>(null);
  const topBlockRef = useRef<HTMLDivElement>(null);
  const carouselWrapRef = useRef<HTMLDivElement>(null);
  const aboutBlockRef = useRef<HTMLDivElement>(null);
  const statsBlockRef = useRef<HTMLDivElement>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startScrollLeft: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  // Drag-to-scroll halus memakai mouse di desktop (tetap mendukung swipe sentuh & trackpad native)
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: track.scrollLeft,
    };
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state.active) return;
    const track = trackRef.current;
    if (!track) return;
    const dx = e.clientX - state.startX;
    track.scrollLeft = state.startScrollLeft - dx;
  }, []);

  const endDrag = useCallback(() => {
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    setIsDragging(false);
  }, []);

  // Animasi masuk halus saat di-scroll (menghormati prefers-reduced-motion)
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const ctx = gsap.context(() => {
      const blocks = [
        topBlockRef.current,
        carouselWrapRef.current,
        aboutBlockRef.current,
        statsBlockRef.current,
      ].filter(Boolean);

      blocks.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              once: true,
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="tentang-kami"
      className="editorial-section bg-[#F8F8F6] text-[#141414] pt-14 sm:pt-20 lg:pt-24 pb-16 sm:pb-24 overflow-x-clip"
    >
      {/* 1. Bagian Atas: Micro-Eyebrow + Tag Pill + Display Headline & Deskripsi */}
      <div
        ref={topBlockRef}
        className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-14"
      >
        {/* Hairline Vertical Accent Eyebrow */}
        <div className="border-l border-neutral-300/90 pl-3 py-0.5">
          <p className="text-[11px] sm:text-[11.5px] font-medium text-[#171717] leading-[1.35] tracking-[-0.015em]">
            Koperasi Sinar Pagi Sejahtera
          </p>
          <p className="text-[11px] sm:text-[11.5px] font-normal text-neutral-400 leading-[1.35] tracking-[-0.01em]">
            Didukung Pencatatan Real-Time
          </p>
        </div>

        {/* Small Editorial Tag */}
        <div className="mt-9 sm:mt-12">
          <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#ECECE9] px-2.5 py-1 text-[10.5px] font-medium tracking-[-0.01em] text-neutral-600">
            <span className="w-1 h-1 rounded-full bg-neutral-500" aria-hidden="true" />
            Layanan
          </span>
        </div>

        {/* Split Row: Large Editorial Headline (Left) + Supporting Copy (Bottom-Right) */}
        <div className="mt-4 sm:mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8 items-end">
          <div className="md:col-span-6 lg:col-span-6">
            <h2 className="text-[clamp(1.9rem,1.1rem+2.4vw,3.35rem)] font-normal text-[#141414] tracking-[-0.04em] leading-[1.08]">
              Solusi berkelanjutan.
              <br />
              jelajahi ekosistem
              <br />
              pertanian modern.
            </h2>
          </div>

          <div className="md:col-span-5 md:col-start-8 lg:col-span-5 lg:col-start-8 md:pb-1.5">
            <p className="text-[12.5px] sm:text-[13.5px] font-normal text-neutral-500 leading-[1.6] tracking-[-0.012em] max-w-[410px]">
              Hubungkan petani binaan dan pembeli di Minahasa Utara melalui pencatatan komoditas
              real-time, timbangan digital 100% akurat, dan layanan sewa alat siap pakai.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Full-Bleed Horizontal Drag-to-Scroll Showcase Cards (tanpa tombol & titik, tinggi card proporsional & jarak tipis) */}
      <div
        ref={carouselWrapRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Keunggulan dan layanan Koperasi Sinar Pagi Sejahtera"
        className="mt-10 sm:mt-12 relative"
      >
        <div
          ref={trackRef}
          tabIndex={0}
          role="group"
          aria-label="Daftar keunggulan koperasi, geser horizontal untuk melihat kartu lainnya"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          className={`editorial-carousel-track gap-1.5 sm:gap-2 pl-4 sm:pl-6 md:pl-0 pr-4 sm:pr-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141414] ${
            isDragging ? 'is-dragging cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {SHOWCASE_ITEMS.map((item, idx) => (
            <div
              key={item.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${idx + 1} dari ${SHOWCASE_ITEMS.length}: ${item.title}`}
              className="flex-none w-[86%] sm:w-[68%] md:w-[46.8%] lg:w-[45.5%] max-w-[660px] snap-start"
            >
              <article className="group relative block w-full aspect-[4/4.2] sm:aspect-[10/9.2] rounded-[2px] overflow-hidden bg-neutral-200 select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.imageAlt}
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                  className={`w-full h-full object-cover ${item.imagePosition || 'object-center'} transition-transform duration-700 ease-out group-hover:scale-[1.03]`}
                />

                {/* Top subtle vignette for label legibility */}
                <div
                  className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 via-black/15 to-transparent pointer-events-none"
                  aria-hidden="true"
                />
                {/* Bottom editorial gradient scrim */}
                <div
                  className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none"
                  aria-hidden="true"
                />

                {/* Top-Left Label with Tight Letter Spacing matching Editorial Font */}
                <span className="absolute top-5 left-5 sm:top-7 sm:left-7 text-[10px] sm:text-[10.5px] font-medium uppercase tracking-[0.02em] text-white/95">
                  {item.tag}
                </span>

                {/* Bottom-Left Overlay Content matching Editorial Font */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 lg:p-8 flex flex-col justify-end text-white">
                  <h3 className="text-[20px] sm:text-[23px] lg:text-[25px] font-normal tracking-[-0.03em] leading-[1.16] text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[12px] sm:text-[13px] font-light text-white/80 leading-[1.5] tracking-[-0.01em] max-w-[390px] line-clamp-2">
                    {item.description}
                  </p>
                  <div className="mt-4 pt-3 border-t border-white/15">
                    <span className="text-[11px] sm:text-[12px] font-normal text-white/90 tracking-[-0.015em]">
                      {item.meta}
                    </span>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Bagian Tengah-Bawah: Asymmetric Editorial "Tentang Kami" */}
      <div
        ref={aboutBlockRef}
        className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-14 mt-16 sm:mt-24 lg:mt-28"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
          {/* Left Column: Small Pill Tag */}
          <div className="md:col-span-4 lg:col-span-5 md:pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#ECECE9] px-2.5 py-1 text-[10.5px] font-medium tracking-[-0.01em] text-neutral-600">
              <span className="w-1 h-1 rounded-full bg-neutral-500" aria-hidden="true" />
              Tentang Kami
            </span>
          </div>

          {/* Right Column: Editorial Statement + Body + Dark Pill CTA */}
          <div className="md:col-span-8 lg:col-span-6 lg:col-start-6">
            <h3 className="text-[clamp(1.45rem,1rem+1.55vw,2.3rem)] font-normal text-[#141414] tracking-[-0.035em] leading-[1.16]">
              Mendampingi setiap langkah petani dengan transparansi, data, dan keahlian koperasi
            </h3>

            <p className="mt-4 sm:mt-5 text-[12.5px] sm:text-[13.5px] font-normal text-neutral-500 leading-[1.65] tracking-[-0.01em] max-w-[540px]">
              Memadukan pencatatan komoditas real-time, sistem bagi hasil yang adil tanpa
              tengkulak, serta penyediaan sewa alat pertanian modern, kami membangun ekosistem
              koperasi terpadu yang membantu petani, pengurus, dan pembeli di Minahasa Utara
              bertransaksi dengan pasti dan berkelanjutan.
            </p>

            <div className="mt-6 sm:mt-7">
              <Link
                href="/toko"
                className="group inline-flex items-center gap-3 rounded-full bg-[#181818] hover:bg-[#233414] text-white pl-4 pr-1.5 py-1.5 text-[12px] font-medium tracking-[-0.01em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181818]"
              >
                <span>Jelajahi layanan kami</span>
                <span className="w-6 h-6 rounded-full bg-white text-[#181818] flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2]" aria-hidden="true" />
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* 4. Bottom Minimalist 4-Column Hairline Stats Strip */}
        <div
          ref={statsBlockRef}
          className="mt-16 sm:mt-20 lg:mt-24 pt-8 sm:pt-10 pb-4 sm:pb-6 border-t border-b border-neutral-200/80"
        >
          <dl className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200/80">
            {COOPERATIVE_STATS.map((stat, idx) => (
              <div
                key={stat.label}
                className={`py-5 lg:py-3 px-4 text-center flex flex-col-reverse items-center ${
                  idx % 2 === 1 ? 'border-l border-neutral-200/80 lg:border-l' : ''
                } ${idx < 2 ? 'border-t-0' : ''}`}
              >
                <dt className="mt-2.5 text-[11px] sm:text-[12px] font-normal text-neutral-500 tracking-[-0.01em]">
                  {stat.label}
                </dt>
                <dd className="text-[28px] sm:text-[34px] lg:text-[38px] font-normal tracking-[-0.04em] text-[#141414] tabular-nums leading-none">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
