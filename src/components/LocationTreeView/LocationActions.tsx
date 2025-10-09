"use client";

import { Plus, Edit, Trash2 } from "lucide-react";
import { FormButton } from "../Form";
import { useTranslations } from "@/hooks/useTranslations";
import { LocationActionsProps } from "./types";

export default function LocationActions({
  node,
  onLocationEdit,
  onLocationDelete,
  onLocationAdd,
  preventFormSubmit,
}: LocationActionsProps) {
  const { t } = useTranslations();

  const handleLocationEdit = (event: React.MouseEvent) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onLocationEdit) {
      onLocationEdit(node, event);
    }
  };

  const handleLocationDelete = (event: React.MouseEvent) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onLocationDelete) {
      onLocationDelete(node, event);
    }
  };

  const handleLocationAdd = (event: React.MouseEvent) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onLocationAdd) {
      onLocationAdd(node, event);
    }
  };

  return (
    <div className="flex items-center space-x-1 ml-6">
      <FormButton
        type="button"
        variant="secondary"
        onClick={handleLocationAdd}
        className="px-2 py-1 text-xs min-h-[32px] touch-manipulation"
        title={t("locations.addChild")}
      >
        <Plus className="h-3 w-3 mr-1" />
        <span className="hidden sm:inline">{t("locations.addChild")}</span>
      </FormButton>
      <FormButton
        type="button"
        variant="secondary"
        onClick={handleLocationEdit}
        className="px-2 py-1 text-xs min-h-[32px] touch-manipulation"
        title={t("common.edit")}
      >
        <Edit className="h-3 w-3 mr-1" />
        <span className="hidden sm:inline">{t("common.edit")}</span>
      </FormButton>
      <FormButton
        type="button"
        variant="danger"
        onClick={handleLocationDelete}
        className="px-2 py-1 text-xs min-h-[32px] touch-manipulation"
        title={t("common.delete")}
      >
        <Trash2 className="h-3 w-3 mr-1" />
        <span className="hidden sm:inline">{t("common.delete")}</span>
      </FormButton>
    </div>
  );
}
