"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";

interface ContentRowProps {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: React.ReactNode;
  emptyMessage?: string;
  animate?: boolean;
}

export function ContentRow({
  title,
  viewAllHref,
  viewAllLabel = "Ver todos",
  children,
  emptyMessage,
  animate = false,
}: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  const items = React.Children.toArray(children);
  const isEmpty = items.length === 0;

  return (
    <section className={`relative ${animate ? "animate-fade-in-up" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 mb-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs font-semibold text-text-muted hover:text-electric-blue transition-colors"
          >
            {viewAllLabel} &rarr;
          </Link>
        )}
      </div>

      {/* Scroll container */}
      <div className="relative group/row">
        {/* Left edge fade */}
        {showLeft && (
          <div className="row-fade-left" aria-hidden="true" />
        )}
        {/* Right edge fade */}
        {showRight && (
          <div className="row-fade-right" aria-hidden="true" />
        )}

        {/* Left arrow */}
        {showLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-navy-900/90 border border-graphite/50 text-text-secondary hover:text-text-primary hover:bg-navy-800 transition-all opacity-0 group-hover/row:opacity-100 flex items-center justify-center shadow-lg"
            aria-label="Rolar para a esquerda"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* Right arrow */}
        {showRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-navy-900/90 border border-graphite/50 text-text-secondary hover:text-text-primary hover:bg-navy-800 transition-all opacity-0 group-hover/row:opacity-100 flex items-center justify-center shadow-lg"
            aria-label="Rolar para a direita"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}

        <div
          ref={scrollRef}
          className={`
            flex gap-4 overflow-x-auto px-4 md:px-6
            snap-x snap-mandatory
            scroll-smooth carousel-scroll
          `}
        >
          {isEmpty && emptyMessage && (
            <p className="text-xs text-text-muted py-8">{emptyMessage}</p>
          )}
          {items.map((child, i) => (
            <div
              key={i}
              className="snap-start shrink-0 w-[260px] sm:w-[280px] md:w-[300px]"
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
