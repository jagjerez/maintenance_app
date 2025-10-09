"use client";

import { useState, useCallback, useRef } from "react";
import { LocationNode, Machine } from "../types";
import { PAGINATION_LIMITS } from "../constants";

export function useLocationTree() {
  const [tree, setTree] = useState<LocationNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Ref to track loading states and prevent duplicate calls
  const loadingMachinesRef = useRef<Set<string>>(new Set());

  // Scroll infinite states
  const [rootOffset, setRootOffset] = useState(0);
  const [hasMoreRoot, setHasMoreRoot] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Function to load children for a specific location with pagination
  const loadChildren = useCallback(async (
    locationId: string,
    offset: number = 0,
    limit: number = PAGINATION_LIMITS.CHILDREN
  ) => {
    try {
      const response = await fetch(
        `/api/locations/${locationId}/children?offset=${offset}&limit=${limit}`
      );
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        console.error("Error loading children:", response.statusText);
        return { locations: [], totalItems: 0, hasMore: false };
      }
    } catch (error) {
      console.error("Error loading children:", error);
      return { locations: [], totalItems: 0, hasMore: false };
    }
  }, []);

  // Function to load machines for a specific location with pagination
  const loadMachines = useCallback(async (
    locationId: string,
    offset: number = 0,
    limit: number = PAGINATION_LIMITS.MACHINES
  ) => {
    try {
      const response = await fetch(
        `/api/locations/${locationId}/machines?offset=${offset}&limit=${limit}`
      );
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        console.error("Error loading machines:", response.statusText);
        return { machines: [], totalItems: 0, hasMore: false };
      }
    } catch (error) {
      console.error("Error loading machines:", error);
      return { machines: [], totalItems: 0, hasMore: false };
    }
  }, []);

  // Function to normalize node properties
  const normalizeNode = useCallback((node: Record<string, unknown>): LocationNode => {
    return {
      ...node,
      _id: (node._id as string) || '',
      name: (node.name as string) || '',
      description: (node.description as string) || '',
      icon: (node.icon as string) || '',
      path: (node.path as string) || '',
      level: (node.level as number) || 0,
      isLeaf: (node.isLeaf as boolean) || false,
      isLoadingChildren: (node.isLoadingChildren as boolean) || false,
      isLoadingMachines: (node.isLoadingMachines as boolean) || false,
      machinesLoaded: (node.machinesLoaded as boolean) || false,
      machinesCount: (node.machinesCount as number) || 0,
      hasMachines: (node.hasMachines as boolean) || false,
      machinesOffset: (node.machinesOffset as number) || 0,
      hasMoreMachines: (node.hasMoreMachines as boolean) || false,
      childrenLoaded: (node.childrenLoaded as boolean) || false,
      childrenCount: (node.childrenCount as number) || 0,
      hasChildren: (node.hasChildren as boolean) || false,
      childrenOffset: (node.childrenOffset as number) || 0,
      hasMoreChildren: (node.hasMoreChildren as boolean) || false,
      machines: (node.machines as Machine[]) || [],
      children: (node.children as LocationNode[]) || []
    };
  }, []);

  // Function to update tree with loaded machines (supports pagination)
  const updateTreeWithMachines = useCallback((
    tree: LocationNode[],
    locationId: string,
    machines: Machine[],
    append: boolean = false,
    hasMore: boolean = false,
    offset: number = 0,
    totalItems: number = 0
  ): LocationNode[] => {
    return tree.map((node) => {
      if (node._id === locationId) {
        // Filter out duplicate machines when appending
        const existingMachineIds = new Set(node.machines.map(m => m._id));
        const newMachines = append 
          ? machines.filter(machine => !existingMachineIds.has(machine._id))
          : machines;
        
        return {
          ...node,
          machines: append ? [...node.machines, ...newMachines] : machines,
          machinesLoaded: true,
          isLoadingMachines: false,
          machinesOffset: append ? (node.machinesOffset || 0) + newMachines.length : machines.length,
          hasMoreMachines: hasMore,
          machinesCount: totalItems > 0 ? totalItems : (append ? (node.machinesCount || 0) : machines.length),
          hasMachines: machines.length > 0,
        };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateTreeWithMachines(
            node.children,
            locationId,
            machines,
            append,
            hasMore,
            offset,
            totalItems
          ),
        };
      }
      return node;
    });
  }, []);

  // Function to update tree with loaded children (supports pagination)
  const updateTreeWithChildren = useCallback((
    tree: LocationNode[],
    parentId: string,
    children: LocationNode[],
    append: boolean = false,
    hasMore: boolean = false,
    offset: number = 0
  ): LocationNode[] => {
    return tree.map((node) => {
      if (node._id === parentId) {
        const existingChildren = append && node.children ? node.children : [];
        return {
          ...node,
          children: [...existingChildren, ...children],
          childrenLoaded: true,
          isLoadingChildren: false,
          isLeaf: children.length === 0 && !hasMore,
          childrenOffset: offset + children.length,
          hasMoreChildren: hasMore,
        };
      } else if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateTreeWithChildren(
            node.children,
            parentId,
            children,
            append,
            hasMore,
            offset
          ),
        };
      }
      return node;
    });
  }, []);

  return {
    tree,
    setTree,
    loading,
    setLoading,
    expandedNodes,
    setExpandedNodes,
    loadingMachinesRef,
    rootOffset,
    setRootOffset,
    hasMoreRoot,
    setHasMoreRoot,
    isLoadingMore,
    setIsLoadingMore,
    loadChildren,
    loadMachines,
    normalizeNode,
    updateTreeWithMachines,
    updateTreeWithChildren,
  };
}
