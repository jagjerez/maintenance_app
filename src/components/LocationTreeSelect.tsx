"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronDown, ChevronRight, MapPin, X, Folder, FolderOpen } from "lucide-react";

interface LocationNode {
  _id: string;
  name: string;
  path: string;
  description?: string;
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
  // Data props instead of internal API calls
  locations?: LocationNode[];
  loading?: boolean;
  onLoadChildren?: (parentId: string) => Promise<LocationNode[]>;
  onLoadLocationById?: (locationId: string) => Promise<LocationNode | null>;
}

const LocationTreeSelect = ({
  value,
  onChange,
  placeholder = "Select location...",
  error,
  className = "",
  locations = [],
  loading = false,
  onLoadChildren,
  onLoadLocationById,
}: LocationTreeSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedLocation, setSelectedLocation] = useState<LocationNode | null>(null);
  const [rootId, setRootId] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load children using the provided callback
  const loadChildren = useCallback(async (parentId: string) => {
    if (!onLoadChildren) return [];
    try {
      return await onLoadChildren(parentId);
    } catch (error) {
      console.error("Error loading children:", error);
      return [];
    }
  }, [onLoadChildren]);

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

  // Set root ID when locations change
  useEffect(() => {
    if (locations.length > 0) {
      setRootId(locations[0]._id);
    }
  }, [locations]);


  // Function to load a specific location by ID
  const loadLocationById = useCallback(async (locationId: string) => {
    if (!onLoadLocationById) return;
    try {
      const location = await onLoadLocationById(locationId);
      if (location) {
        setSelectedLocation(location);
      }
    } catch (error) {
      console.error("Error loading location by ID:", error);
    }
  }, [onLoadLocationById]);

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
  }, [value, locations, loadLocationById, selectedLocation]);

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
        // Note: In the new architecture, tree state is managed by the parent
        // This component now receives locations as props and doesn't manage state internally
        // The parent should handle loading states and tree updates
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

  // Handle search (now just for UI filtering)
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery) return locations;
    
    const searchLower = searchQuery.toLowerCase();
    return locations.filter(location => 
      location.name.toLowerCase().includes(searchLower) ||
      (location.description && location.description.toLowerCase().includes(searchLower)) ||
      location.path.toLowerCase().includes(searchLower)
    );
  }, [locations, searchQuery]);

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
              {filteredLocations.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {searchQuery ? "No locations found" : "No locations available"}
                </div>
              ) : (
                filteredLocations.map(location => renderLocationNode(location))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationTreeSelect;