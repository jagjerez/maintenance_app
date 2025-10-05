/**
 * SearchableSelect - Componente de ejemplo de uso
 * 
 * Este componente muestra cómo usar SearchableSelect con diferentes entidades.
 * Es solo para documentación y no se usa en la aplicación.
 */

import React from "react";
import SearchableSelect from "./SearchableSelect";
import { useLocationSearch, useMachineSearch, useOperationSearch, useSearchableSelect } from "@/hooks/useSearchableSelect";

interface MachineOption {
  _id: string;
  name: string;
  internalCode: string;
  marca: string;
  modelo: string;
  [key: string]: unknown;
}

// Ejemplo 1: Búsqueda de ubicaciones (ya implementado)
export function LocationSearchExample() {
  const { fetchOptions } = useLocationSearch();
  const [selectedLocation, setSelectedLocation] = React.useState<string | null>(null);

  return (
    <SearchableSelect
      value={selectedLocation}
      onChange={(value, option) => {
        setSelectedLocation(value);
        console.log("Selected location:", option);
      }}
      fetchOptions={fetchOptions}
      placeholder="Seleccionar ubicación..."
      searchPlaceholder="Buscar ubicación..."
      displayField="name"
      displayPath="path"
      required
      clearable
    />
  );
}

// Ejemplo 2: Búsqueda de máquinas
export function MachineSearchExample() {
  const { fetchOptions } = useMachineSearch();
  const [selectedMachine, setSelectedMachine] = React.useState<string | null>(null);

  return (
    <SearchableSelect
      value={selectedMachine}
      onChange={(value, option) => {
        setSelectedMachine(value);
        console.log("Selected machine:", option);
      }}
      fetchOptions={fetchOptions}
      placeholder="Seleccionar máquina..."
      searchPlaceholder="Buscar máquina..."
      displayField="internalCode"
      displayPath="marca"
      required
      clearable
      renderOption={(option, _isSelected) => {
        const machineOption = option as MachineOption;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{machineOption.internalCode}</span>
            <span className="text-sm text-gray-500">
              {machineOption.marca} {machineOption.modelo}
            </span>
          </div>
        );
      }}
    />
  );
}

// Ejemplo 3: Búsqueda de operaciones
export function OperationSearchExample() {
  const { fetchOptions } = useOperationSearch();
  const [selectedOperation, setSelectedOperation] = React.useState<string | null>(null);

  return (
    <SearchableSelect
      value={selectedOperation}
      onChange={(value, option) => {
        setSelectedOperation(value);
        console.log("Selected operation:", option);
      }}
      fetchOptions={fetchOptions}
      placeholder="Seleccionar operación..."
      searchPlaceholder="Buscar operación..."
      displayField="name"
      displayPath="description"
      required
      clearable
    />
  );
}

// Ejemplo 4: Búsqueda personalizada con transformación de respuesta
export function CustomSearchExample() {
  const { fetchOptions } = useSearchableSelect({
    endpoint: "/api/custom-entities",
    searchParam: "q",
    pageParam: "p",
    limitParam: "size",
    transformResponse: (data: unknown) => {
      const typedData = data as { results?: unknown[]; has_next?: boolean; count?: number };
      return {
        options: (typedData.results || []) as { _id: string; name: string; [key: string]: unknown }[],
        hasMore: typedData.has_next || false,
        totalItems: typedData.count || 0,
      };
    },
  });

  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);

  return (
    <SearchableSelect
      value={selectedItem}
      onChange={(value, option) => {
        setSelectedItem(value);
        console.log("Selected item:", option);
      }}
      fetchOptions={fetchOptions}
      placeholder="Seleccionar elemento..."
      searchPlaceholder="Buscar elemento..."
      displayField="title"
      displayPath="category"
      required
      clearable
    />
  );
}

// Ejemplo 5: Búsqueda con renderizado personalizado
export function CustomRenderExample() {
  const { fetchOptions } = useLocationSearch();
  const [selectedLocation, setSelectedLocation] = React.useState<string | null>(null);

  return (
    <SearchableSelect
      value={selectedLocation}
      onChange={(value, option) => {
        setSelectedLocation(value);
        console.log("Selected location:", option);
      }}
      fetchOptions={fetchOptions}
      placeholder="Seleccionar ubicación..."
      searchPlaceholder="Buscar ubicación..."
      displayField="name"
      displayPath="path"
      required
      clearable
      renderOption={(option, _isSelected) => (
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {option.name}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {option.path}
            </p>
          </div>
          {_isSelected && (
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      )}
      renderSelected={(option) => (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
          <span className="truncate">{option.name}</span>
        </div>
      )}
    />
  );
}
