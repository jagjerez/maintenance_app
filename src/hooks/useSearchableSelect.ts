import { useCallback } from "react";

interface SearchableSelectOption {
  _id: string;
  name: string;
  path?: string;
  description?: string;
  [key: string]: unknown; // Allow additional properties
}

interface SearchableSelectResult {
  options: SearchableSelectOption[];
  hasMore: boolean;
  totalItems?: number;
}

interface UseSearchableSelectOptions {
  endpoint: string;
  searchParam?: string;
  pageParam?: string;
  limitParam?: string;
  transformResponse?: (data: unknown) => SearchableSelectResult;
}

export function useSearchableSelect({
  endpoint,
  searchParam = "search",
  pageParam = "page",
  limitParam = "limit",
  transformResponse,
}: UseSearchableSelectOptions) {
  const fetchOptions = useCallback(async (
    search: string = "",
    offset: number = 0,
    limit: number = 10
  ): Promise<SearchableSelectResult> => {
    try {
      const searchQuery = search ? `&${searchParam}=${encodeURIComponent(search)}` : "";
      const page = Math.floor(offset / limit) + 1;
      const response = await fetch(
        `${endpoint}?${pageParam}=${page}&${limitParam}=${limit}${searchQuery}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (transformResponse) {
          return transformResponse(data);
        }
        
        // Default transformation for standard API responses
        return {
          options: data.locations || data.items || data.data || data || [],
          hasMore: data.currentPage < data.totalPages,
          totalItems: data.totalItems || data.total || 0,
        };
      } else {
        console.error(`Error fetching options from ${endpoint}:`, response.statusText);
        return {
          options: [],
          hasMore: false,
          totalItems: 0,
        };
      }
    } catch (error) {
      console.error(`Error fetching options from ${endpoint}:`, error);
      return {
        options: [],
        hasMore: false,
        totalItems: 0,
      };
    }
  }, [endpoint, searchParam, pageParam, limitParam, transformResponse]);

  return { fetchOptions };
}

// Pre-configured hooks for common entities
export function useLocationSearch() {
  return useSearchableSelect({
    endpoint: "/api/locations",
    searchParam: "search",
    pageParam: "page",
    limitParam: "limit",
  });
}

export function useMachineSearch() {
  return useSearchableSelect({
    endpoint: "/api/machines",
    searchParam: "search",
    pageParam: "page",
    limitParam: "limit",
  });
}

export function useOperationSearch() {
  return useSearchableSelect({
    endpoint: "/api/operations",
    searchParam: "search",
    pageParam: "page",
    limitParam: "limit",
  });
}
