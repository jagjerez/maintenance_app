"use client";

import { useEffect } from "react";
import { LocationNode } from "../types";
import { PAGINATION_LIMITS } from "../constants";

export function useLocationInfiniteScroll(
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  hasMoreRoot: boolean,
  isLoadingMore: boolean,
  loadMoreRootLocations: () => void
) {
  // Infinite scroll effect
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold

      if (isNearBottom && hasMoreRoot && !isLoadingMore) {
        loadMoreRootLocations();
      }
    };

    // Add throttling to prevent excessive calls
    let timeoutId: NodeJS.Timeout;
    const throttledHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    scrollContainer.addEventListener("scroll", throttledHandleScroll);
    return () => {
      scrollContainer.removeEventListener("scroll", throttledHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [loadMoreRootLocations, hasMoreRoot, isLoadingMore, scrollContainerRef]);
}

export function useLocationDataLoading(
  refreshTrigger: number | undefined,
  searchQuery: string,
  setLoading: (loading: boolean) => void,
  setRootOffset: (offset: number) => void,
  setHasMoreRoot: (hasMore: boolean) => void,
  setTree: (tree: LocationNode[]) => void,
  setExpandedNodes: (nodes: Set<string>) => void,
  normalizeNode: (node: Record<string, unknown>) => LocationNode
) {
  // Load location tree with pagination
  useEffect(() => {
    const loadTree = async () => {
      try {
        setLoading(true);
        setRootOffset(0);
        setHasMoreRoot(true);
        
        // Use search API if there's a search query, otherwise use regular tree API
        const apiUrl = searchQuery 
          ? `/api/locations/search-tree?search=${encodeURIComponent(searchQuery)}&limit=${PAGINATION_LIMITS.ROOT_LOCATIONS}&offset=0`
          : `/api/locations/tree?limit=${PAGINATION_LIMITS.ROOT_LOCATIONS}&offset=0`;
          
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          const locations = data.locations || data;
          
          // Normalize all nodes to ensure they have all required properties
          const normalizedLocations = Array.isArray(locations) 
            ? locations.map(normalizeNode)
            : [normalizeNode(locations)];
            
          setTree(normalizedLocations);
          setRootOffset(data.locations?.length || 0);
          setHasMoreRoot(data.hasMore || false);
          
          // If there's a search query, expand all nodes to show search results
          if (searchQuery && data.locations) {
            // For search results, expand all nodes to show the complete hierarchy
            // This allows users to see the full tree structure and identify which nodes have machines/children
            const allNodeIds = new Set<string>();
            
            const collectAllNodeIds = (nodes: LocationNode[]) => {
              nodes.forEach(node => {
                allNodeIds.add(node._id);
                if (node.children && node.children.length > 0) {
                  collectAllNodeIds(node.children);
                }
              });
            };
            
            collectAllNodeIds(normalizedLocations);
            setExpandedNodes(allNodeIds);
            
            // Don't load machines automatically during search
            // Let users expand nodes manually to load machines with proper pagination
          }
        } else {
          console.error("Error loading location tree:", response.status);
        }
      } catch (error) {
        console.error("Error loading location tree:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTree();
  }, [refreshTrigger, searchQuery, setLoading, setRootOffset, setHasMoreRoot, setTree, setExpandedNodes, normalizeNode]);
}
