"use client";

import { useEffect, useState } from "react";
import { Plus, Settings } from "lucide-react";
import DataTable from "@/components/DataTable";
import Modal from "@/components/Modal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import {
  Form,
  FormGroup,
  FormLabel,
  FormInput,
  FormButton,
} from "@/components/Form";
import { Pagination } from "@/components/Pagination";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { machineModelSchema } from "@/lib/validations";
import { formatDateSafe } from "@/lib/utils";
import toast from "react-hot-toast";
import { useTranslations } from "@/hooks/useTranslations";

interface MachineModel {
  _id: string;
  name: string;
  manufacturer: string;
  brand: string;
  year: number;
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function MachineModelsPage() {
  const { t } = useTranslations();
  const [machineModels, setMachineModels] = useState<MachineModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<MachineModel | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<MachineModel | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(machineModelSchema),
  });

  const fetchMachineModels = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/machine-models?page=${page}&limit=${ITEMS_PER_PAGE}`
      );
      if (response.ok) {
        const data = await response.json();
        setMachineModels(data.machineModels || data);
        setTotalPages(
          data.totalPages ||
            Math.ceil((data.machineModels || data).length / ITEMS_PER_PAGE)
        );
        setTotalItems(data.totalItems || (data.machineModels || data).length);
      } else {
        toast.error(t("machineModels.modelError"));
      }
    } catch (error) {
      console.error("Error fetching machine models:", error);
      toast.error(t("machineModels.modelError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachineModels(currentPage);
  }, [currentPage, t, fetchMachineModels]);

  const onSubmit = async (data: {
    name: string;
    manufacturer: string;
    brand: string;
    year: number;
  }) => {
    try {
      const url = editingModel
        ? `/api/machine-models/${editingModel._id}`
        : "/api/machine-models";
      const method = editingModel ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(
          editingModel
            ? t("machineModels.modelUpdated")
            : t("machineModels.modelCreated")
        );
        fetchMachineModels(currentPage);
        setShowModal(false);
        setEditingModel(null);
        reset();
      } else {
        const error = await response.json();
        toast.error(error.error || t("machineModels.modelError"));
      }
    } catch (error) {
      console.error("Error saving machine model:", error);
      toast.error(t("machineModels.modelError"));
    }
  };

  const handleEdit = (model: MachineModel) => {
    setEditingModel(model);
    setValue("name", model.name);
    setValue("manufacturer", model.manufacturer);
    setValue("brand", model.brand);
    setValue("year", model.year);
    setShowModal(true);
  };

  const handleDelete = (model: MachineModel) => {
    setModelToDelete(model);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!modelToDelete) return;

    try {
      const response = await fetch(`/api/machine-models/${modelToDelete._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("machineModels.modelDeleted"));
        fetchMachineModels(currentPage);
      } else {
        toast.error(t("machineModels.modelError"));
      }
    } catch (error) {
      console.error("Error deleting machine model:", error);
      toast.error(t("machineModels.modelError"));
    } finally {
      setShowDeleteModal(false);
      setModelToDelete(null);
    }
  };

  const openCreateModal = () => {
    setEditingModel(null);
    reset();
    setShowModal(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columns = [
    {
      key: "name" as keyof MachineModel,
      label: t("common.name"),
    },
    {
      key: "manufacturer" as keyof MachineModel,
      label: t("common.manufacturer"),
    },
    {
      key: "brand" as keyof MachineModel,
      label: t("common.brand"),
    },
    {
      key: "year" as keyof MachineModel,
      label: t("common.year"),
    },
    {
      key: "createdAt" as keyof MachineModel,
      label: t("common.createdAt"),
      render: (value: unknown) => formatDateSafe(value as string),
    },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 sm:w-64 mb-2 animate-pulse"></div>
              <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 sm:w-96 animate-pulse"></div>
            </div>
            <div className="h-10 sm:h-11 bg-gray-200 dark:bg-gray-700 rounded w-full sm:w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Item Count Indicator Skeleton */}
        <div className="mb-4 sm:mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 sm:h-5 sm:w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 sm:w-24 animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
            <div className="animate-pulse">
              {/* Mobile view skeleton */}
              <div className="block space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 sm:p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                        <div className="flex flex-col items-end space-y-1 ml-2">
                          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t("machineModels.title")}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t("machineModels.subtitle")}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("machineModels.newModel")}
          </button>
        </div>
      </div>

      {/* Item Count Indicator */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {machineModels.length} {t("machineModels.title")}
            {machineModels.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={machineModels}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        className="mt-6"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingModel(null);
          reset();
        }}
        title={
          editingModel
            ? t("machineModels.editModel")
            : t("machineModels.newModel")
        }
        size="xl"
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <FormLabel required>{t("common.name")}</FormLabel>
            <FormInput
              {...register("name")}
              error={errors.name?.message}
              placeholder={t("placeholders.modelName")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t("common.manufacturer")}</FormLabel>
            <FormInput
              {...register("manufacturer")}
              error={errors.manufacturer?.message}
              placeholder={t("placeholders.manufacturerName")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t("common.brand")}</FormLabel>
            <FormInput
              {...register("brand")}
              error={errors.brand?.message}
              placeholder={t("placeholders.manufacturerBrand")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t("common.year")}</FormLabel>
            <FormInput
              type="number"
              {...register("year", { valueAsNumber: true })}
              error={errors.year?.message}
              placeholder={t("placeholders.manufacturingYear")}
            />
          </FormGroup>

          <div className="flex justify-end space-x-3 mt-6">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingModel(null);
                reset();
              }}
            >
              {t("common.cancel")}
            </FormButton>
            <FormButton type="submit" disabled={isSubmitting}>
              {isSubmitting
                  ? t("common.saving")
                  : editingModel
                  ? t("common.update")
                  : t("common.create")}
            </FormButton>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={t("modals.confirmDeletion")}
        message={t("modals.deleteModelMessage")}
        confirmText={t("common.delete")}
        variant="danger"
        itemDetails={
          modelToDelete
            ? {
                name: modelToDelete.name,
                description: `${modelToDelete.manufacturer} - ${modelToDelete.year}`,
              }
            : undefined
        }
      />
    </div>
  );
}
