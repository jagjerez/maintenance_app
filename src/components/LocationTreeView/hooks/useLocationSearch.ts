"use client";

import { useCallback } from "react";
import { LocationNode } from "../types";

export function useLocationSearch(showMachines: boolean = false) {
  // Filter function for search
  const filterLocation = useCallback((node: LocationNode, query: string): boolean => {
    if (!query) return true;

    const searchLower = query.toLowerCase();
    return (
      node.name.toLowerCase().includes(searchLower) ||
      (node.description &&
        node.description.toLowerCase().includes(searchLower)) ||
      node.path.toLowerCase().includes(searchLower) ||
      (showMachines &&
        node.machines &&
        node.machines.some(
          (machine) =>
            machine.description.toLowerCase().includes(searchLower) ||
            machine.brand.toLowerCase().includes(searchLower) ||
            machine.model.toLowerCase().includes(searchLower) ||
            machine.series.toLowerCase().includes(searchLower) ||
            machine.category.toLowerCase().includes(searchLower)
        ))
    );
  }, [showMachines]);

  // Filter children recursively
  const filterChildren = useCallback((
    nodes: LocationNode[],
    query: string
  ): LocationNode[] => {
    // If there's a search query, don't filter on frontend since API already returns relevant nodes
    if (query) {
      return nodes;
    }
    
    return nodes
      .map((node) => ({
        ...node,
        children: node.children ? filterChildren(node.children, query) : [],
      }))
      .filter((node) => {
        const matchesSelf = filterLocation(node, query);
        const hasMatchingChildren = node.children && node.children.length > 0;
        return matchesSelf || hasMatchingChildren;
      });
  }, [filterLocation]);

  return {
    filterLocation,
    filterChildren,
  };
}
