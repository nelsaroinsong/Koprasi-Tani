import React from 'react';

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
      {/* Top Navbar Placeholder */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#dce1d6] h-14 sm:h-16 flex items-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="w-28 sm:w-36 h-6 sm:h-7 bg-[#eaede7] rounded-lg animate-pulse" />
          <div className="hidden lg:flex w-80 h-9 bg-[#eaede7] rounded-full animate-pulse" />
          <div className="w-9 h-9 bg-[#eaede7] rounded-full animate-pulse" />
        </div>
      </div>
      <div className="h-14 sm:h-16 shrink-0" />

      {/* Main Skeleton Placeholder */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Search Bar Skeleton */}
        <div className="w-full max-w-2xl mx-auto mb-6 h-11 bg-white border border-[#cfd6c9] rounded-full animate-pulse" />

        {/* Categories / Tabs Carousel Skeleton */}
        <div className="flex gap-2.5 mb-6 overflow-hidden px-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="w-15 h-15 rounded-2xl bg-white border border-[#dce1d6] shrink-0 animate-pulse"
            />
          ))}
        </div>

        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="rounded-[24px] bg-white border border-[#e2e7dc] p-3 sm:p-4 space-y-3 shadow-2xs"
            >
              <div className="h-4 bg-[#eaede7] rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-[#eaede7] rounded w-1/2 animate-pulse" />
              <div className="aspect-[4/3.5] rounded-[20px] bg-[#eaede7] animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
