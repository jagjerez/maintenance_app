"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import Modal from "./Modal";
import { FormButton } from "./Form";

interface MonthSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMonth: (month: number, year: number) => void;
  selectedMonth?: number;
  selectedYear?: number;
  title?: string;
}

export default function MonthSelectorModal({
  isOpen,
  onClose,
  onSelectMonth,
  selectedMonth,
  selectedYear,
  title
}: MonthSelectorModalProps) {
  const { t } = useTranslations();
  const [month, setMonth] = useState<number>(selectedMonth || new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(selectedYear || new Date().getFullYear());

  useEffect(() => {
    if (selectedMonth) {
      setMonth(selectedMonth);
    }
    if (selectedYear) {
      setYear(selectedYear);
    }
  }, [selectedMonth, selectedYear]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  const months = [
    { value: 1, label: t("maintenanceRanges.january") },
    { value: 2, label: t("maintenanceRanges.february") },
    { value: 3, label: t("maintenanceRanges.march") },
    { value: 4, label: t("maintenanceRanges.april") },
    { value: 5, label: t("maintenanceRanges.may") },
    { value: 6, label: t("maintenanceRanges.june") },
    { value: 7, label: t("maintenanceRanges.july") },
    { value: 8, label: t("maintenanceRanges.august") },
    { value: 9, label: t("maintenanceRanges.september") },
    { value: 10, label: t("maintenanceRanges.october") },
    { value: 11, label: t("maintenanceRanges.november") },
    { value: 12, label: t("maintenanceRanges.december") },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSelectMonth(month, year);
    onClose();
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(parseInt(e.target.value));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || t("maintenanceRanges.selectMonth")}
      size="sm"
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("maintenanceRanges.month")}
          </label>
          <select
            value={month}
            onChange={handleMonthChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {months.map((monthOption) => (
              <option key={monthOption.value} value={monthOption.value}>
                {monthOption.label}
              </option>
            ))}
          </select>
        </div>

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
