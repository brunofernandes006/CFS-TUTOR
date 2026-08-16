"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

interface SearchResult {
  syllabus: Array<{ id: number; title: string; discipline: string }>;
  documents: Array<{ id: number; titulo: string; tipo: string; numero: string }>;
}

export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then(setResults)
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-overlay-in"
      onClick={onClose}
    >
      <div
        className="max-w-2xl mx-auto mt-20 px-4 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-navy-2 rounded-xl border border-graphite p-4">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar tópicos, documentos, ICC..."
              className="flex-1 bg-transparent text-text-primary text-sm focus:outline-none placeholder:text-text-muted"
            />
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text-primary text-xs font-semibold px-2 py-1 rounded bg-navy-900/60 border border-graphite/40"
            >
              ESC
            </button>
          </div>
        </div>
        {results && (
          <div className="mt-2 bg-navy-2 rounded-xl border border-graphite p-4 max-h-96 overflow-y-auto space-y-4 animate-fade-in-up">
            {results.syllabus.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase text-text-muted mb-2">
                  Tópicos do Edital
                </p>
                {results.syllabus.map((s) => (
                  <Link
                    key={s.id}
                    href="/estudar"
                    onClick={onClose}
                    className="block px-3 py-2 rounded hover:bg-navy-800 text-sm text-text-primary transition-colors"
                  >
                    {s.title}{" "}
                    <span className="text-text-muted text-xs">
                      — {s.discipline}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {results.documents.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase text-text-muted mb-2">
                  Documentos
                </p>
                {results.documents.map((d) => (
                  <Link
                    key={d.id}
                    href="/biblioteca"
                    onClick={onClose}
                    className="block px-3 py-2 rounded hover:bg-navy-800 text-sm text-text-primary transition-colors"
                  >
                    {d.titulo ?? d.numero}{" "}
                    <span className="text-text-muted text-xs">— {d.tipo}</span>
                  </Link>
                ))}
              </div>
            )}
            {results.syllabus.length === 0 &&
              results.documents.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">
                  Nenhum resultado encontrado
                </p>
              )}
          </div>
        )}
        {loading && (
          <div className="mt-2 text-center">
            <p className="text-xs text-text-muted animate-pulse">Buscando...</p>
          </div>
        )}
      </div>
    </div>
  );
}
