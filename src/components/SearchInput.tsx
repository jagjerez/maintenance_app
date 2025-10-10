"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchInputProps {
  placeholder: string;
  onSearch: (query: string, signal?: AbortSignal) => void;
  onSearchingChange?: (isSearching: boolean) => void;
  delay?: number;
  className?: string;
  value?: string;
  showHelp?: boolean;
}

export default function SearchInput({
  placeholder,
  onSearch,
  onSearchingChange,
  delay = 500,
  className = "",
  value = "",
  showHelp = false,
}: SearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const debouncedSearchQuery = useDebounce(searchQuery, delay);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync with external value changes
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Update parent when debounced value changes
  useEffect(() => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Call onSearch with abort signal
    onSearch(debouncedSearchQuery, abortController.signal);

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSearchQuery, onSearch]);

  // Handle searching state
  useEffect(() => {
    if (onSearchingChange) {
      onSearchingChange(searchQuery !== debouncedSearchQuery);
    }
  }, [searchQuery, debouncedSearchQuery, onSearchingChange]);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={className}
        title={showHelp ? "Búsqueda avanzada:\n• Texto normal: busca en nombre, descripción y ruta\n• -texto: excluye resultados que contengan 'texto'\n• \"texto exacto\": busca la frase exacta" : undefined}
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      {showHelp && searchQuery && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
