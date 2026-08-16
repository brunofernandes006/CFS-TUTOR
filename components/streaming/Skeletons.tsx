"use client";

import React from "react";

interface SkeletonCardProps {
  compact?: boolean;
}

export function SkeletonCard({ compact = false }: SkeletonCardProps) {
  return (
    <div
      className={`
        rounded-xl border border-graphite/20 bg-navy-900 overflow-hidden
        ${compact ? "p-3" : "p-4 sm:p-5"}
      `}
    >
      <div className="relative z-10 space-y-3">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="flex items-center gap-2 mt-3">
          <div className="skeleton h-2 w-12 rounded" />
          <div className="skeleton h-2 w-8 rounded" />
          <div className="skeleton h-1.5 flex-1 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="relative">
      <div className="flex items-center justify-between px-4 md:px-6 mb-3">
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
      <div className="flex gap-4 px-4 md:px-6 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[260px] sm:w-[280px] md:w-[300px]">
            <SkeletonCard />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <section className="relative min-h-[65vh] flex items-end pb-28 pt-24 px-4 md:px-6">
      <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/60 to-navy-900/20" />
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="skeleton h-8 w-24 rounded-full" />
          <div className="skeleton h-8 w-20 rounded-full" />
          <div className="skeleton h-8 w-16 rounded-full" />
          <div className="skeleton h-8 w-28 rounded-full" />
        </div>
        <div className="max-w-xl space-y-4">
          <div className="skeleton h-3 w-28 rounded" />
          <div className="skeleton h-10 w-full rounded" />
          <div className="skeleton h-10 w-3/4 rounded" />
          <div className="flex gap-2 mt-2">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-4 w-28 rounded" />
          </div>
          <div className="flex items-center gap-3 mt-4">
            <div className="skeleton h-2.5 w-full max-w-[200px] rounded-full" />
          </div>
          <div className="skeleton h-12 w-44 rounded-xl mt-6" />
        </div>
      </div>
    </section>
  );
}
