'use client';

import { useTranslations } from '@/hooks/useTranslations';

export default function SettingsPage() {
  const { t } = useTranslations();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configuración del sistema
        </p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <p className="text-gray-500 dark:text-gray-400">
          {t('common.loading')}...
        </p>
      </div>
    </div>
  );
}