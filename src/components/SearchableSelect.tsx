"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search, X, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchableSelectOption {
  _id: string;
  name: string;
  path?: string;
  description?: string;
  [key: string]: unknown; // Allow additional properties
}

interface SearchableSelectProps {
  // Required props
  value: string | null;
  onChange: (value: string | null, option: SearchableSelectOption | null) => void;
  fetchOptions: (search: string, offset: number, limit: number) => Promise<{
    options: SearchableSelectOption[];
    hasMore: boolean;
    totalItems?: number;
  }>;
  
  // Display props
  placeholder?: string;
  displayField?: string; // Field to display in the input (default: 'name')
  displayPath?: string; // Field to show as path (default: 'path')
  searchPlaceholder?: string;
  noResultsText?: string;
  loadingText?: string;
  
  // Behavior props
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  searchDelay?: number; // Delay in milliseconds for search (default: 300)
  
  // Styling props
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  optionClassName?: string;
  
  // Error handling
  error?: string;
  
  // Custom renderers
  renderOption?: (option: SearchableSelectOption, isSelected: boolean) => React.ReactNode;
  renderSelected?: (option: SearchableSelectOption) => React.ReactNode;
}

const ITEMS_PER_PAGE = 10;

export default function SearchableSelect({
  value,
  onChange,
  fetchOptions,
  placeholder = "Select an option...",
  displayField = "name",
  displayPath = "path",
  searchPlaceholder = "Search...",
  noResultsText = "No results found",
  loadingText = "Loading...",
  disabled = false,
  required = false,
  clearable = true,
  searchable = true,
  searchDelay = 500, // Increased default delay for better UX
  className = "",
  inputClassName = "",
  dropdownClassName = "",
  optionClassName = "",
  error,
  renderOption,
  renderSelected,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState<SearchableSelectOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<SearchableSelectOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  
  const debouncedSearchQuery = useDebounce(searchQuery, searchDelay);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);


  // Load more options for infinite scroll
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const loadMoreOptions = async () => {
        try {
          setLoadingMore(true);
          
          const result = await fetchOptions(debouncedSearchQuery, offset, ITEMS_PER_PAGE);
          
          setOptions(prev => {
            // Filter out duplicates based on _id
            const existingIds = new Set(prev.map(option => option._id));
            const newOptions = result.options.filter(option => !existingIds.has(option._id));
            return [...prev, ...newOptions];
          });
          setOffset(prev => prev + ITEMS_PER_PAGE);
          setHasMore(result.hasMore);
          setTotalItems(result.totalItems || 0);
        } catch (error) {
          console.error("Error loading more options:", error);
        } finally {
          setLoadingMore(false);
        }
      };

      loadMoreOptions();
    }
  }, [debouncedSearchQuery, offset, loadingMore, hasMore, loading, fetchOptions]);

  // Initial load and search effect
  useEffect(() => {
    const loadInitialOptions = async () => {
      try {
        setLoading(true);
        setOffset(0);
        
        const result = await fetchOptions(debouncedSearchQuery, 0, ITEMS_PER_PAGE);
        
        setOptions(result.options);
        setOffset(ITEMS_PER_PAGE);
        setHasMore(result.hasMore);
        setTotalItems(result.totalItems || 0);
      } catch (error) {
        console.error("Error loading options:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialOptions();
  }, [debouncedSearchQuery, fetchOptions]);

  // Find selected option when value changes
  useEffect(() => {
    if (value && options.length > 0) {
      const found = options.find(option => option._id === value);
      if (found) {
        setSelectedOption(found);
      }
    } else if (!value) {
      setSelectedOption(null);
    }
  }, [value, options]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle scroll for infinite loading
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;
    
    if (isNearBottom && hasMore && !loadingMore && !loading) {
      loadMore();
    }
  }, [hasMore, loadingMore, loading, loadMore]);

  // Handle option selection
  const handleOptionSelect = (option: SearchableSelectOption) => {
    setSelectedOption(option);
    onChange(option._id, option);
    setIsOpen(false);
    setSearchQuery("");
  };

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOption(null);
    onChange(null, null);
    setSearchQuery("");
  };

  // Handle input click
  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Get display text for selected option
  const getDisplayText = (option: SearchableSelectOption) => {
    if (renderSelected) {
      return renderSelected(option);
    }
    
    const name = String(option[displayField] || option.name || "");
    const path = String(option[displayPath] || option.path || "");
    
    return path ? `${name} (${path})` : name;
  };

  // Render option
  const renderOptionContent = (option: SearchableSelectOption, isSelected: boolean) => {
    if (renderOption) {
      return renderOption(option, isSelected);
    }

    const name = String(option[displayField] || option.name || "");
    const path = String(option[displayPath] || option.path || "");
    const description = String(option.description || "");

    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {name}
          </span>
          {isSelected && (
            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 ml-2" />
          )}
        </div>
        {path && (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {path}
          </span>
        )}
        {description && (
          <span className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
            {description}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input */}
      <div
        className={`
          relative w-full cursor-pointer rounded-md border shadow-sm
          ${error 
            ? "border-red-300 dark:border-red-600" 
            : "border-gray-300 dark:border-gray-600"
          }
          ${disabled 
            ? "bg-gray-50 dark:bg-gray-700 cursor-not-allowed" 
            : "bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
          }
          ${isOpen 
            ? "ring-2 ring-blue-500 border-blue-500" 
            : ""
          }
          ${inputClassName}
        `}
        onClick={handleInputClick}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex-1 min-w-0">
            {selectedOption ? (
              <div className="truncate text-gray-900 dark:text-white">
                {getDisplayText(selectedOption)}
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 truncate">
                {placeholder}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            {clearable && selectedOption && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
            <ChevronDown 
              className={`h-4 w-4 text-gray-400 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`} 
            />
          </div>
        </div>
        
        {required && (
          <span className="absolute -top-1 -right-1 text-red-500">*</span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className={`
          absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
          rounded-md shadow-lg max-h-60 overflow-hidden
          ${dropdownClassName}
        `}>
          {/* Search input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-600">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                           rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div
            ref={listRef}
            className="max-h-48 overflow-y-auto"
            onScroll={handleScroll}
          >
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {loadingText}
                </span>
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {noResultsText}
              </div>
            ) : (
              <>
                {options.map((option) => {
                  const isSelected = value === option._id;
                  return (
                    <div
                      key={option._id}
                      className={`
                        px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700
                        ${isSelected ? "bg-blue-50 dark:bg-blue-900" : ""}
                        ${optionClassName}
                      `}
                      onClick={() => handleOptionSelect(option)}
                    >
                      {renderOptionContent(option, isSelected)}
                    </div>
                  );
                })}
                
                {/* Load more indicator */}
                {loadingMore && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Loading more...
                    </span>
                  </div>
                )}
                
                {/* End of list indicator */}
                {!hasMore && options.length > 0 && (
                  <div className="px-3 py-2 text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-600">
                    {totalItems > 0 ? `${totalItems} total items` : "End of list"}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
