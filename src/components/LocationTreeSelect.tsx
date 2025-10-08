"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronRight, MapPin, X, Folder, FolderOpen } from "lucide-react";

interface LocationNode {
  _id: string;
  name: string;
  path: string;
  children?: LocationNode[];
  isLeaf?: boolean;
  hasChildren?: boolean;
  childrenLoaded?: boolean;
  isLoadingChildren?: boolean;
  childrenCount?: number;
}

interface LocationTreeSelectProps {
  value?: string | null;
  onChange: (value: string | null, option?: LocationNode, rootId?: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

const LocationTreeSelect = ({
  value,
  onChange,
  placeholder = "Select location...",
  error,
  className = "",
}: LocationTreeSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedLocation, setSelectedLocation] = useState<LocationNode | null>(null);
  const [rootId, setRootId] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch children for a specific location using the existing API
  const loadChildren = useCallback(async (parentId: string) => {
    try {
      const response = await fetch(`/api/locations/tree?parentId=${parentId}`);
      if (response.ok) {
        const data = await response.json();
        return (data.locations || []).map((location: any) => ({
          ...location,
          children: [],
          childrenLoaded: false,
          isLoadingChildren: false,
        }));
      }
      return [];
    } catch (error) {
      console.error("Error loading children:", error);
      return [];
    }
  }, []);

  // Update tree with loaded children
  const updateTreeWithChildren = useCallback((
    tree: LocationNode[],
    parentId: string,
    children: LocationNode[]
  ): LocationNode[] => {
    return tree.map((node) => {
      if (node._id === parentId) {
        return {
          ...node,
          children: children,
          childrenLoaded: true,
          isLoadingChildren: false,
        };
      } else if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateTreeWithChildren(node.children, parentId, children),
        };
      }
      return node;
    });
  }, []);

  // Fetch locations from API (initial load for root)
  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/locations/tree");
      
      if (response.ok) {
        const data = await response.json();
        const transformedLocations = (data.locations || []).map((location: any) => ({
          ...location,
          children: [],
          childrenLoaded: false,
          isLoadingChildren: false,
        }));
        setLocations(transformedLocations);
        // Set the first location as root (if exists)
        if (transformedLocations.length > 0) {
          setRootId(transformedLocations[0]._id);
        }
      } else {
        console.error("Error fetching locations");
        setLocations([]);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);


  // Function to load a specific location by ID
  const loadLocationById = useCallback(async (locationId: string) => {
    try {
      const response = await fetch(`/api/locations/${locationId}`);
      if (response.ok) {
        const location = await response.json();
        
        // Set the selected location
        setSelectedLocation(location);
        
        // Don't reload the full tree immediately, just set the location
        // The tree will be reloaded when the user opens the dropdown
      }
    } catch (error) {
      console.error("Error loading location by ID:", error);
    }
  }, []);

  // Load selected location when value changes and expand path to it
  useEffect(() => {
    if (value && locations.length > 0) {
      // Check if we already have this location selected to avoid loops
      if (selectedLocation && selectedLocation._id === value) {
        return;
      }

      const findLocationById = (nodes: LocationNode[], id: string, path: string[] = []): { node: LocationNode | null, path: string[] } => {
        for (const node of nodes) {
          if (node._id === id) return { node, path: [...path, node._id] };
          if (node.children && node.children.length > 0) {
            const found = findLocationById(node.children, id, [...path, node._id]);
            if (found.node) return found;
          }
        }
        return { node: null, path: [] };
      };

      const result = findLocationById(locations, value);
      if (result.node) {
        setSelectedLocation(result.node);
        
        // Expand all parent nodes to show the selected location
        const nodesToExpand = result.path.slice(0, -1); // All parents except the selected node itself
        setExpandedNodes(prev => {
          const newSet = new Set(prev);
          nodesToExpand.forEach(nodeId => newSet.add(nodeId));
          return newSet;
        });
        
      } else {
        // If location not found in current tree, try to load it by making a request
        loadLocationById(value);
      }
    } else if (!value) {
      setSelectedLocation(null);
    }
  }, [value, locations]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Toggle node expansion
  const toggleExpanded = async (nodeId: string) => {
    const isCurrentlyExpanded = expandedNodes.has(nodeId);

    if (!isCurrentlyExpanded) {
      // Expanding - check if we need to load children
      const findNode = (nodes: LocationNode[], id: string): LocationNode | null => {
        for (const node of nodes) {
          if (node._id === id) return node;
          if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const node = findNode(locations, nodeId);
      if (node && node.hasChildren && !node.childrenLoaded && !node.isLoadingChildren) {
        // Mark as loading
        setLocations(prev => 
          updateTreeWithChildren(prev, nodeId, []).map(n =>
            n._id === nodeId ? { ...n, isLoadingChildren: true } : n
          )
        );

        // Load children
        const children = await loadChildren(nodeId);

        // Update tree with loaded children
        setLocations(prev =>
          updateTreeWithChildren(prev, nodeId, children)
        );
      }
    }

    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Render location tree node
  const renderLocationNode = (node: LocationNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node._id);
    const isSelected = value === node._id;
    const hasChildren = node.children && node.children.length > 0;
    const isLoadingChildren = node.isLoadingChildren;
    const canExpand = hasChildren || node.hasChildren;

    return (
      <div key={node._id}>
        <div
          className={`
            flex items-center py-2 px-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700
            ${isSelected ? "bg-blue-50 dark:bg-blue-900" : ""}
          `}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => handleLocationSelect(node)}
        >
          {/* Expand/Collapse button */}
          <div className="flex items-center mr-2">
            {canExpand ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(node._id);
                }}
                className={`p-1 rounded transition-colors ${
                  !isLoadingChildren
                    ? "hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                    : "cursor-default opacity-50"
                }`}
              >
                {isLoadingChildren ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                ) : isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </div>
            ) : (
              <div className="w-6" />
            )}
          </div>

          {/* Location icon */}
          <div className="mr-2">
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-gray-500" />
            ) : (
              <Folder className="h-4 w-4 text-gray-400" />
            )}
          </div>

          {/* Location name and path */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <span className="font-medium text-gray-900 dark:text-white truncate">
                {node.name}
              </span>
              {isSelected && (
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 ml-2" />
              )}
            </div>
            {node.path && node.path !== `/${node.name}` && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {node.path}
              </span>
            )}
          </div>
        </div>

        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderLocationNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Get display text for selected location
  const getDisplayText = (location: LocationNode) => {
    return location.path && location.path !== `/${location.name}` 
      ? `${location.path}` 
      : location.name;
  };

  // Handle location selection
  const handleLocationSelect = (location: LocationNode) => {
    setSelectedLocation(location);
    onChange(location._id, location, rootId || undefined);
    setIsOpen(false);
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${error 
            ? "border-red-300 dark:border-red-600" 
            : "border-gray-300 dark:border-gray-600"
          }
          ${isOpen 
            ? "ring-2 ring-blue-500 border-blue-500" 
            : ""
          }
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white
          min-h-[48px] text-base
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 min-w-0">
            <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
            <span className="truncate">
              {selectedLocation ? getDisplayText(selectedLocation) : placeholder}
            </span>
          </div>
          <div className="flex items-center ml-2">
            {selectedLocation && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLocation(null);
                  onChange(null);
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer"
              >
                <X className="h-4 w-4 text-gray-400" />
              </div>
            )}
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-600">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-4 text-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Loading locations...</span>
            </div>
          )}

          {/* Locations List */}
          {!loading && (
            <div className="max-h-60 overflow-y-auto">
              {locations.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No locations found
                </div>
              ) : (
                locations.map(location => renderLocationNode(location))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationTreeSelect;