"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import Modal from "./Modal";
import { FormButton } from "./Form";

interface YearSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectYear: (year: number) => void;
  selectedYear?: number;
  title?: string;
}

export default function YearSelectorModal({
  isOpen,
  onClose,
  onSelectYear,
  selectedYear,
  title
}: YearSelectorModalProps) {
  const { t } = useTranslations();
  const [year, setYear] = useState<number>(selectedYear || new Date().getFullYear());

  useEffect(() => {
    if (selectedYear) {
      setYear(selectedYear);
    }
  }, [selectedYear]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSelectYear(year);
    onClose();
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(parseInt(e.target.value));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || t("maintenanceRanges.selectYear")}
      size="sm"
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("maintenanceRanges.year")}
          </label>
          <select
            value={year}
            onChange={handleYearChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {years.map((yearOption) => (
              <option key={yearOption} value={yearOption}>
                {yearOption}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <FormButton
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            {t("common.cancel")}
          </FormButton>
          <FormButton type="submit">
            {t("common.select")}
          </FormButton>
        </div>
      </form>
    </Modal>
  );
}
