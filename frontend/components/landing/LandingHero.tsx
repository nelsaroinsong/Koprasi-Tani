'use client';

import React, { useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import LandingHeader from './LandingHeader';
import { useSmoothScroll } from '@/components/providers/smooth-scroll-provider';
import { gsap } from 'gsap';

export default function LandingHero({ isReady = true }: { isReady?: boolean }) {
  const { scrollTo } = useSmoothScroll();
  const heroRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isReady) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // 1. Tractor image slow cinematic un-zoom & brighten as preloader slides up
      if (imageRef.current) {
        tl.fromTo(
          imageRef.current,
          { scale: 1.14, filter: 'brightness(0.7)' },
          { scale: 1, filter: 'brightness(1)', duration: 1.8, ease: 'power2.out' },
          0
        );
      }

      // 2. Floating Navbar capsule drops down
      if (headerRef.current) {
        tl.fromTo(
          headerRef.current,
          { y: -35, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' },
          0.35
        );
      }

      // 3. Headline reveals upwards
      if (headlineRef.current) {
        tl.fromTo(
          headlineRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out' },
          0.3
        );
      }

      // 4. Paragraph description
      if (textRef.current) {
        tl.fromTo(
          textRef.current,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85, ease: 'power2.out' },
          0.45
        );
      }

      // 5. Action buttons staggered with slight elastic bounce
      if (buttonsRef.current) {
        tl.fromTo(
          buttonsRef.current.children,
          { y: 20, opacity: 0, scale: 0.92 },
          { y: 0, opacity: 1, scale: 1, stagger: 0.12, duration: 0.7, ease: 'back.out(1.7)' },
          0.6
        );
      }
    }, heroRef);

    return () => ctx.revert();
  }, [isReady]);

  return (
    <section
      ref={heroRef}
      className="relative isolate w-full overflow-hidden rounded-2xl sm:rounded-3xl min-h-[580px] sm:min-h-[640px] lg:min-h-[700px] flex flex-col justify-between shadow-sm will-change-transform"
    >
      {/* Background Image: Tractor in Field at Dusk */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src="/api/images/landing/hero-tractor.jpg"
          alt="Pertanian Modern Minahasa Utara"
          className="w-full h-full object-cover object-center will-change-transform"
        />
        {/* Top subtle vignette for navbar */}
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-black/50 via-black/20 to-transparent pointer-events-none" />
        {/* Bottom dark vignette for text readability */}
        <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
      </div>

      {/* 1. Navbar INSIDE Hero Section (Floating White Capsule) */}
      <div ref={headerRef} className="relative z-20" style={{ opacity: isReady ? undefined : 0 }}>
        <LandingHeader />
      </div>

      {/* 2. Hero Bottom Content: Headline on Left, Paragraph + Dual Buttons on Right */}
      <div className="relative z-20 w-full pb-8 sm:pb-12 lg:pb-14 px-6 sm:px-10 lg:px-14">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6 sm:gap-8">
          
          {/* Left Column: Big Headline */}
          <div className="max-w-xl">
            <h1
              ref={headlineRef}
              style={{ opacity: isReady ? undefined : 0 }}
              className="text-3xl sm:text-5xl lg:text-[52px] font-normal text-white tracking-tight leading-[1.08] will-change-transform"
            >
              Inovasi Pertanian Berkelanjutan &amp; Mandiri
            </h1>
          </div>

          {/* Right Column: Paragraph + Dual CTA Buttons */}
          <div className="max-w-md flex flex-col items-start md:items-end text-left md:text-right">
            <p
              ref={textRef}
              style={{ opacity: isReady ? undefined : 0 }}
              className="text-xs sm:text-[13px] text-white/85 font-light leading-relaxed mb-4 max-w-sm will-change-transform"
            >
              Ekosistem digital terpadu untuk memberdayakan petani Minahasa Utara melalui transparansi komoditas, bagi hasil adil, dan akses sewa alat modern.
            </p>

            <div ref={buttonsRef} className="flex items-center gap-3" style={{ opacity: isReady ? undefined : 0 }}>
              {/* Button 1: Vibrant Lime Pill Button (Matches 'Explore Service ->') */}
              <Link
                href="/toko"
                className="px-5 py-2.5 rounded-full bg-[#D4F63D] hover:bg-[#c6eb2e] text-slate-950 font-semibold text-xs sm:text-[13px] tracking-wide transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center gap-1.5 cursor-pointer will-change-transform"
              >
                <span>Jelajahi Layanan</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>

              {/* Button 2: Dark Translucent Pill Button (Matches 'Learn More ->') */}
              <a
                href="#tentang-kami"
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo('#tentang-kami', { offset: -30, duration: 1.4 });
                }}
                className="px-5 py-2.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-white font-medium text-xs sm:text-[13px] backdrop-blur-md transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer will-change-transform"
              >
                <span>Tentang Kami</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/70" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
