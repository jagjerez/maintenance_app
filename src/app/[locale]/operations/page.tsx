"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/hooks/useTranslations";
import { Plus, Wrench } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "@/components/Modal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import {
  Form,
  FormGroup,
  FormLabel,
  FormInput,
  FormTextarea,
  FormButton,
} from "@/components/Form";
import { Pagination } from "@/components/Pagination";
import DataTable from "@/components/DataTable";
import { operationSchema } from "@/lib/validations";
import { formatDateSafe } from "@/lib/utils";

interface Operation {
  _id: string;
  name: string;
  description: string;
  type: "text" | "date" | "time" | "datetime" | "boolean";
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function OperationsPage() {
  const { t } = useTranslations();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [operationToDelete, setOperationToDelete] = useState<Operation | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(operationSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "text" as "text" | "date" | "time" | "datetime" | "boolean",
    },
  });

  // Fetch operations with pagination
  const fetchOperations = useCallback(
    async (page = 1) => {
      try {
        const response = await fetch(
          `/api/operations?page=${page}&limit=${ITEMS_PER_PAGE}`
        );
        if (response.ok) {
          const data = await response.json();
          setOperations(data.operations || data);
          setTotalPages(
            data.totalPages ||
              Math.ceil((data.operations || data).length / ITEMS_PER_PAGE)
          );
          setTotalItems(data.totalItems || (data.operations || data).length);
        } else {
          toast.error(t("operations.operationLoadError"));
        }
      } catch (error) {
        console.error("Error fetching operations:", error);
        toast.error(t("operations.operationLoadError"));
      }
    },
    [t]
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchOperations(currentPage);
      setLoading(false);
    };
    loadData();
  }, [currentPage, fetchOperations]);

  const onSubmit = async (data: {
    name: string;
    description: string;
    type: "text" | "date" | "time" | "datetime" | "boolean";
  }) => {
    try {
      const url = editingOperation
        ? `/api/operations/${editingOperation._id}`
        : "/api/operations";
      const method = editingOperation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchOperations(currentPage);
        setShowModal(false);
        setEditingOperation(null);
        reset();
        toast.success(
          editingOperation
            ? t("operations.operationUpdated")
            : t("operations.operationCreated")
        );
      } else {
        toast.error(t("operations.operationError"));
      }
    } catch (error) {
      console.error("Error saving operation:", error);
      toast.error(t("operations.operationError"));
    }
  };

  const handleEdit = (operation: Operation) => {
    setEditingOperation(operation);
    reset({
      name: operation.name,
      description: operation.description,
      type: operation.type,
    });
    setShowModal(true);
  };

  const handleDelete = (operation: Operation) => {
    setOperationToDelete(operation);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!operationToDelete) return;

    try {
      const response = await fetch(`/api/operations/${operationToDelete._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchOperations(currentPage);
        toast.success(t("operations.operationDeleted"));
      } else {
        const errorData = await response.json();

        if (
          response.status === 400 &&
          errorData.message?.includes("maintenance ranges")
        ) {
          // Mostrar error específico cuando la operación está siendo usada
          const maintenanceRanges = errorData.details?.maintenanceRanges || [];
          const rangeNames = maintenanceRanges
            .map((range: { name: string }) => range.name)
            .join(", ");
          toast.error(
            `${t("operations.operationInUse")} ${
              rangeNames ? `(${rangeNames})` : ""
            }`
          );
        } else {
          toast.error(t("operations.operationError"));
        }
      }
    } catch (error) {
      console.error("Error deleting operation:", error);
      toast.error(t("operations.operationError"));
    } finally {
      setShowDeleteModal(false);
      setOperationToDelete(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columns = [
    {
      key: "name" as keyof Operation,
      label: t("operations.operationName"),
    },
    {
      key: "description" as keyof Operation,
      label: t("operations.description"),
      render: (value: unknown) => (value as string) || "-",
    },
    {
      key: "type" as keyof Operation,
      label: t("operations.type"),
      render: (value: unknown) => {
        const type = value as string;
        return (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
            {t(`operations.types.${type}`)}
          </span>
        );
      },
    },
    {
      key: "createdAt" as keyof Operation,
      label: t("common.createdAt"),
      render: (value: unknown) => formatDateSafe(value as string),
    },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse"></div>
            </div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Item Count Indicator Skeleton */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="animate-pulse">
              {/* Table Header */}
              <div className="grid grid-cols-4 gap-4 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              {/* Table Rows */}
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-4 gap-4 py-3 border-b border-gray-100 dark:border-gray-700"
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
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
              {t("operations.title")}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t("operations.subtitle")}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingOperation(null);
              reset({
                name: "",
                description: "",
                type: "text" as
                  | "text"
                  | "date"
                  | "time"
                  | "datetime"
                  | "boolean",
              });
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("operations.newOperation")}
          </button>
        </div>
      </div>

      {/* Item Count Indicator */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Wrench className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t("operations.title")}
            {totalItems !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={operations}
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

      {/* Add/Edit Operation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingOperation(null);
          reset();
        }}
        title={
          editingOperation
            ? t("operations.editOperation")
            : t("operations.newOperation")
        }
        size="xl"
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <FormLabel required>{t("operations.operationName")}</FormLabel>
            <FormInput
              {...register("name")}
              error={errors.name?.message}
              placeholder={t("placeholders.operationName")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t("operations.description")}</FormLabel>
            <FormTextarea
              {...register("description")}
              error={errors.description?.message}
              placeholder={t("placeholders.operationDescription")}
              rows={3}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t("operations.type")}</FormLabel>
            <select
              {...register("type")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t("placeholders.operationType")}</option>
              <option value="text">{t("operations.types.text")}</option>
              <option value="date">{t("operations.types.date")}</option>
              <option value="time">{t("operations.types.time")}</option>
              <option value="datetime">{t("operations.types.datetime")}</option>
              <option value="boolean">{t("operations.types.boolean")}</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.type.message}
              </p>
            )}
          </FormGroup>

          <div className="flex justify-end space-x-3 mt-6">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingOperation(null);
                reset();
              }}
            >
              {t("common.cancel")}
            </FormButton>
            <FormButton type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t("common.saving")
                : editingOperation
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
        message={t("modals.deleteOperationMessage")}
        confirmText={t("common.delete")}
        variant="danger"
        itemDetails={
          operationToDelete
            ? {
                name: operationToDelete.name,
                description: operationToDelete.description,
              }
            : undefined
        }
      />
    </div>
  );
}
