"use client";

import { useCallback } from "react";
import { LocationNode, Machine } from "../types";

export function useLocationExpansion(
  tree: LocationNode[],
  setTree: (updater: (prevTree: LocationNode[]) => LocationNode[]) => void,
  expandedNodes: Set<string>,
  setExpandedNodes: (updater: (prev: Set<string>) => Set<string>) => void,
  loadChildren: (locationId: string, offset?: number, limit?: number) => Promise<{ locations: LocationNode[]; hasMore: boolean; offset: number }>,
  loadMachines: (locationId: string, offset?: number, limit?: number) => Promise<{ machines: Machine[]; hasMore: boolean; offset: number; totalItems: number }>,
  updateTreeWithChildren: (tree: LocationNode[], parentId: string, children: LocationNode[], append?: boolean, hasMore?: boolean, offset?: number) => LocationNode[],
  updateTreeWithMachines: (tree: LocationNode[], locationId: string, machines: Machine[], append?: boolean, hasMore?: boolean, offset?: number, totalItems?: number) => LocationNode[],
  normalizeNode: (node: Record<string, unknown>) => LocationNode,
  showMachines: boolean = false
) {
  const toggleExpanded = useCallback(async (nodeId: string) => {
    const isCurrentlyExpanded = expandedNodes.has(nodeId);

    if (!isCurrentlyExpanded) {
      // Expanding - check if we need to load children
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
      if (node) {
        // Load children if needed
        if (
          node.hasChildren &&
          !node.childrenLoaded &&
          !node.isLoadingChildren
        ) {
          // Mark as loading children
          setTree((prevTree) =>
            updateTreeWithChildren(prevTree, nodeId, []).map((n) =>
              n._id === nodeId ? normalizeNode({ ...n, isLoadingChildren: true, childrenLoaded: false }) : n
            )
          );

          // Load children
          const childrenData = await loadChildren(nodeId);
          const children = childrenData.locations || childrenData;
          const hasMore = childrenData.hasMore || false;
          const offset = childrenData.offset || 0;

          // Children are already LocationNode[] from the API
          const normalizedChildren = Array.isArray(children) 
            ? children
            : [children];

          // Update tree with loaded children
          setTree((prevTree) =>
            updateTreeWithChildren(
              prevTree,
              nodeId,
              normalizedChildren,
              false,
              hasMore,
              offset
            )
          );
        }

        // Load machines if needed and showMachines is true
        if (
          showMachines &&
          !node.machinesLoaded &&
          !node.isLoadingMachines
        ) {
          
          // Mark as loading machines
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

          // Load machines
          const machinesData = await loadMachines(nodeId);
          
          const machines = machinesData.machines || machinesData;
          const hasMore = machinesData.hasMore || false;
          const offset = machinesData.offset || 0;
          const totalItems = machinesData.totalItems || 0;

          // Update tree with loaded machines
          setTree((prevTree) =>
            updateTreeWithMachines(
              prevTree,
              nodeId,
              machines,
              false,
              hasMore,
              offset,
              totalItems
            )
          );
        }
      }
    }

    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, [tree, setTree, expandedNodes, setExpandedNodes, loadChildren, loadMachines, updateTreeWithChildren, updateTreeWithMachines, normalizeNode, showMachines]);

  return {
    toggleExpanded,
  };
}
