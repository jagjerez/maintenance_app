"use client";

import { useCallback } from "react";
import { LocationNode, Machine } from "../types";
import { PAGINATION_LIMITS } from "../constants";

export function useLocationPagination(
  tree: LocationNode[],
  setTree: (updater: (prevTree: LocationNode[]) => LocationNode[]) => void,
  loadChildren: (locationId: string, offset?: number, limit?: number) => Promise<{ locations: LocationNode[]; hasMore: boolean; offset: number }>,
  loadMachines: (locationId: string, offset?: number, limit?: number) => Promise<{ machines: Machine[]; hasMore: boolean; offset: number; totalItems: number }>,
  updateTreeWithChildren: (tree: LocationNode[], parentId: string, children: LocationNode[], append?: boolean, hasMore?: boolean, offset?: number) => LocationNode[],
  updateTreeWithMachines: (tree: LocationNode[], locationId: string, machines: Machine[], append?: boolean, hasMore?: boolean, offset?: number, totalItems?: number) => LocationNode[],
  normalizeNode: (node: Record<string, unknown>) => LocationNode,
  loadingMachinesRef: React.MutableRefObject<Set<string>>
) {
  // Function to load more children for pagination
  const loadMoreChildren = useCallback(async (nodeId: string) => {
    const findNode = (
      nodes: LocationNode[],
      id: string
    ): LocationNode | null => {
      for (const node of nodes) {
        if (node._id === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNode(tree, nodeId);
    if (node && node.hasMoreChildren && !node.isLoadingChildren) {
      // Mark as loading
      setTree((prevTree) =>
        prevTree.map((n) =>
          n._id === nodeId ? normalizeNode({ ...n, isLoadingChildren: true, childrenLoaded: false }) : n
        )
      );

      // Load more children
      const offset = node.childrenOffset || 0;
      const childrenData = await loadChildren(nodeId, offset, PAGINATION_LIMITS.CHILDREN);
      const children = childrenData.locations || childrenData;
      const hasMore = childrenData.hasMore || false;

      // Children are already LocationNode[] from the API
      const normalizedChildren = Array.isArray(children) 
        ? children
        : [children];

      // Update tree with additional children
      setTree((prevTree) =>
        updateTreeWithChildren(
          prevTree,
          nodeId,
          normalizedChildren,
          true,
          hasMore,
          offset
        )
      );
    }
  }, [tree, setTree, loadChildren, updateTreeWithChildren, normalizeNode]);

  // Function to load more machines for pagination
  const loadMoreMachines = useCallback(async (nodeId: string) => {
    // Check if already loading to prevent duplicate calls
    if (loadingMachinesRef.current.has(nodeId)) {
      return;
    }

    const findNode = (
      nodes: LocationNode[],
      id: string
    ): LocationNode | null => {
      for (const node of nodes) {
        if (node._id === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNode(tree, nodeId);
    if (node && node.hasMoreMachines && !node.isLoadingMachines) {
      
      // Mark as loading in ref
      loadingMachinesRef.current.add(nodeId);
      
      // Mark as loading in tree
      setTree((prevTree) =>
        prevTree.map((n) => {
          if (n._id === nodeId) {
            return normalizeNode({ ...n, isLoadingMachines: true, machinesLoaded: false });
          }
          if (n.children && n.children.length > 0) {
            return normalizeNode({
              ...n,
              children: n.children.map((child) =>
                child._id === nodeId ? normalizeNode({ ...child, isLoadingMachines: true, machinesLoaded: false }) : child
              )
            });
          }
          return n;
        })
      );

      try {
        // Load more machines
        const offset = node.machinesOffset || 0;
        const machinesData = await loadMachines(nodeId, offset, PAGINATION_LIMITS.MACHINES);
        const machines = machinesData.machines || machinesData;
        const hasMore = machinesData.hasMore || false;
        const totalItems = machinesData.totalItems || 0;

        // Update tree with additional machines
        setTree((prevTree) =>
          updateTreeWithMachines(
            prevTree,
            nodeId,
            machines,
            true, // append to existing machines
            hasMore,
            offset,
            totalItems
          )
        );
      } catch (error) {
        console.error(`Error loading more machines for ${nodeId}:`, error);
        // Reset loading state on error
        setTree((prevTree) =>
          prevTree.map((n) => {
            if (n._id === nodeId) {
              return normalizeNode({ ...n, isLoadingMachines: false, machinesLoaded: false });
            }
            if (n.children && n.children.length > 0) {
              return normalizeNode({
                ...n,
                children: n.children.map((child) =>
                  child._id === nodeId ? normalizeNode({ ...child, isLoadingMachines: false, machinesLoaded: false }) : child
                )
              });
            }
            return n;
          })
        );
      } finally {
        // Remove from loading ref
        loadingMachinesRef.current.delete(nodeId);
      }
    }
  }, [tree, setTree, loadMachines, updateTreeWithMachines, normalizeNode, loadingMachinesRef]);

  // Function to handle infinite scroll for machines with debounce
  const handleMachineScroll = useCallback((nodeId: string, container: HTMLElement) => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold

    if (isNearBottom) {
      const findNode = (
        nodes: LocationNode[],
        id: string
      ): LocationNode | null => {
        for (const node of nodes) {
          if (node._id === id) return node;
          if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const node = findNode(tree, nodeId);
      
      if (node && node.hasMoreMachines && !node.isLoadingMachines && !loadingMachinesRef.current.has(nodeId)) {
        loadMoreMachines(nodeId);
      }
    }
  }, [tree, loadMoreMachines, loadingMachinesRef]);

  return {
    loadMoreChildren,
    loadMoreMachines,
    handleMachineScroll,
  };
}
