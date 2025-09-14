'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from '@/hooks/useTranslations';
import { Settings, User, Bell, Globe, Palette, Building2, Save } from 'lucide-react';
import { Form, FormGroup, FormLabel, FormInput, FormButton } from '@/components/Form';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSelector from '@/components/LanguageSelector';

export default function SettingsPage() {
  const { t } = useTranslations();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    companyName: session?.user?.company?.name || '',
    appName: session?.user?.company?.appName || '',
    email: session?.user?.email || '',
    notifications: {
      email: true,
      push: true,
    },
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value,
        },
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configuración del sistema
        </p>
      </div>
      
      <div className="space-y-6">
        {/* Company Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('settings.company')}
              </h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <FormGroup>
              <FormLabel>Nombre de la Empresa</FormLabel>
              <FormInput
                value={settings.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Nombre de la empresa"
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Nombre de la Aplicación</FormLabel>
              <FormInput
                value={settings.appName}
                onChange={(e) => handleInputChange('appName', e.target.value)}
                placeholder="Nombre de la aplicación"
              />
            </FormGroup>
          </div>
        </div>

        {/* User Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Información Personal
              </h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <FormGroup>
              <FormLabel>Email</FormLabel>
              <FormInput
                value={settings.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="tu@email.com"
                type="email"
              />
            </FormGroup>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Apariencia
              </h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('settings.theme')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Cambia entre tema claro y oscuro
                </p>
              </div>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('settings.language')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selecciona tu idioma preferido
                </p>
              </div>
              <LanguageSelector />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('settings.notifications')}
              </h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Notificaciones por Email
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Recibe notificaciones importantes por correo
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.email}
                onChange={(e) => handleInputChange('notifications.email', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Notificaciones Push
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Recibe notificaciones en tiempo real
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.push}
                onChange={(e) => handleInputChange('notifications.push', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <FormButton
            onClick={handleSave}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>
              {loading ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar Cambios'}
            </span>
          </FormButton>
        </div>
      </div>
    </div>
  );
}