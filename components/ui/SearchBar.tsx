"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  suggestions?: string[];
  className?: string;
}

export function SearchBar({
  placeholder = "Buscar...",
  value,
  onChange,
  onSearch,
  suggestions = [],
  className = "",
}: SearchBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const closeSuggestions = useCallback(() => setShowSuggestions(false), []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closeSuggestions();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeSuggestions]);

  const handleSearch = () => {
    onSearch?.(value);
    closeSuggestions();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
    if (e.key === "Escape") {
      closeSuggestions();
      inputRef.current?.blur();
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    closeSuggestions();
    onSearch?.(suggestion);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-lg border border-graphite bg-navy-800 px-4 py-3 focus-within:border-electric-blue transition-colors">
        <span className="text-lg text-text-muted" aria-hidden="true">🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length > 0 && setShowSuggestions(true)}
          className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none min-h-[44px]"
          aria-label={placeholder}
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-autocomplete="list"
          role="combobox"
        />
        {value && (
          <button
            onClick={() => { onChange(""); inputRef.current?.focus(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            aria-label="Limpar busca"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="absolute top-full z-10 mt-2 w-full rounded-lg border border-graphite bg-navy-900 shadow-lg overflow-hidden"
          role="listbox"
        >
          {suggestions.map((suggestion, idx) => (
            <li
              key={idx}
              role="option"
              aria-selected={suggestion === value}
            >
              <button
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full px-4 py-3 text-left text-sm text-text-secondary hover:bg-navy-800 hover:text-text-primary transition-colors min-h-[44px] flex items-center"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
