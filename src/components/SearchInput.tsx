"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchInputProps {
  placeholder: string;
  onSearch: (query: string) => void;
  onSearchingChange?: (isSearching: boolean) => void;
  delay?: number;
  className?: string;
  value?: string;
}

export default function SearchInput({
  placeholder,
  onSearch,
  onSearchingChange,
  delay = 500,
  className = "",
  value = "",
}: SearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const debouncedSearchQuery = useDebounce(searchQuery, delay);

  // Sync with external value changes
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Update parent when debounced value changes
  useEffect(() => {
    onSearch(debouncedSearchQuery);
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
    </div>
  );
}
