"use client";

import { useState, useCallback, useRef } from "react";
import { LocationNode, Machine } from "@/components/LocationTreeView/types";
import { PAGINATION_LIMITS } from "@/components/LocationTreeView/constants";

export function useLocationTreeData() {
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

  // Load initial tree data
  const loadTreeData = useCallback(async (searchQuery: string = "") => {
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
        }
      } else {
        console.error("Error loading location tree:", response.status);
      }
    } catch (error) {
      console.error("Error loading location tree:", error);
    } finally {
      setLoading(false);
    }
  }, [normalizeNode]);

  // Load more root locations
  const loadMoreRootLocations = useCallback(async (searchQuery: string = "") => {
    if (isLoadingMore || !hasMoreRoot) return;

    try {
      setIsLoadingMore(true);
      
      // Use search API if there's a search query, otherwise use regular tree API
      const apiUrl = searchQuery 
        ? `/api/locations/search-tree?search=${encodeURIComponent(searchQuery)}&limit=${PAGINATION_LIMITS.ROOT_LOCATIONS}&offset=${rootOffset}`
        : `/api/locations/tree?limit=${PAGINATION_LIMITS.ROOT_LOCATIONS}&offset=${rootOffset}`;
        
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        const newLocations = data.locations || data;
        // Normalize new locations
        const normalizedNewLocations = Array.isArray(newLocations) 
          ? newLocations.map(normalizeNode)
          : [normalizeNode(newLocations)];

        if (normalizedNewLocations.length > 0) {
          setTree((prevTree) => [...prevTree, ...normalizedNewLocations]);
          setRootOffset((prev) => prev + normalizedNewLocations.length);
          setHasMoreRoot(data.hasMore || false);
          
           // If there's a search query, expand nodes to show search results
           if (searchQuery && normalizedNewLocations.length > 0) {
             const allNodeIds = new Set<string>();
             
             const collectAllNodeIds = (nodes: LocationNode[]) => {
               nodes.forEach(node => {
                 allNodeIds.add(node._id);
                 if (node.children && node.children.length > 0) {
                   collectAllNodeIds(node.children);
                 }
               });
             };
             
             collectAllNodeIds(normalizedNewLocations);
             setExpandedNodes((prevExpanded) => {
               const newExpanded = new Set(prevExpanded);
               allNodeIds.forEach(nodeId => newExpanded.add(nodeId));
               return newExpanded;
             });
           }
        } else {
          setHasMoreRoot(false);
        }
      } else {
        console.error("Error loading more root locations:", response.statusText);
      }
    } catch (error) {
      console.error("Error loading more root locations:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreRoot, rootOffset, normalizeNode]);

  // Toggle node expansion
  const toggleExpanded = useCallback(async (nodeId: string, showMachines: boolean = false) => {
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
  }, [tree, expandedNodes, loadChildren, loadMachines, updateTreeWithChildren, updateTreeWithMachines, normalizeNode]);

  // Load more children for pagination
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
  }, [tree, loadChildren, updateTreeWithChildren, normalizeNode]);

  // Load more machines for pagination
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
  }, [tree, loadMachines, updateTreeWithMachines, normalizeNode, loadingMachinesRef]);

  // Handle infinite scroll for machines with debounce
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
    // State
    tree,
    loading,
    expandedNodes,
    hasMoreRoot,
    isLoadingMore,
    
    // Actions
    loadTreeData,
    loadMoreRootLocations,
    toggleExpanded,
    loadMoreChildren,
    loadMoreMachines,
    handleMachineScroll,
    
    // Utilities
    normalizeNode,
  };
}
