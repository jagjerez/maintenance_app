"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslations } from "@/hooks/useTranslations";
import { LocationNode, Machine } from "../types";

export function useLocationActions() {
  const { t } = useTranslations();
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    location: LocationNode | null;
  }>({ isOpen: false, location: null });

  const handleLocationEdit = (
    location: LocationNode,
    event: React.MouseEvent,
    onLocationEdit?: (location: LocationNode, event: React.MouseEvent) => void,
    preventFormSubmit: boolean = false
  ) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onLocationEdit) {
      onLocationEdit(location, event);
    }
  };

  const handleLocationDelete = (
    location: LocationNode,
    event: React.MouseEvent,
    onLocationDelete?: (location: LocationNode, event: React.MouseEvent) => void,
    preventFormSubmit: boolean = false
  ) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onLocationDelete) {
      onLocationDelete(location, event);
    } else {
      // Show delete modal if no custom handler
      setDeleteModal({ isOpen: true, location });
    }
  };

  const handleLocationAdd = (
    parentLocation: LocationNode | undefined,
    event: React.MouseEvent,
    onLocationAdd?: (
      parentLocation?: LocationNode,
      event?: React.MouseEvent
    ) => void,
    preventFormSubmit: boolean = false
  ) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onLocationAdd) {
      onLocationAdd(parentLocation, event);
    }
  };

  const handleMachineClick = (
    machine: Machine,
    event: React.MouseEvent,
    onMachineClick?: (machine: Machine, event: React.MouseEvent) => void,
    preventFormSubmit: boolean = false
  ) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onMachineClick) {
      onMachineClick(machine, event);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.location) return;

    try {
      const response = await fetch(
        `/api/locations/${deleteModal.location._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success(t("locations.deleteSuccess"));
        setDeleteModal({ isOpen: false, location: null });
        // Reload tree
        window.location.reload();
      } else {
        const error = await response.json();
        if (error.machinesCount) {
          toast.error(t("locations.cannotDeleteWithMachines"));
        } else if (error.childrenCount) {
          toast.error(t("locations.cannotDeleteWithChildren"));
        } else {
          toast.error(error.message || t("locations.deleteError"));
        }
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error(t("locations.deleteError"));
    }
  };

  return {
    deleteModal,
    setDeleteModal,
    handleLocationEdit,
    handleLocationDelete,
    handleLocationAdd,
    handleMachineClick,
    handleDelete,
  };
}
