'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Settings, Save, Palette, Building2 } from 'lucide-react';

const companySettingsSchema = z.object({
  name: z.string().min(1, 'El nombre de la empresa es requerido'),
  appName: z.string().min(1, 'El nombre de la aplicación es requerido'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Formato de color inválido'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Formato de color inválido').optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Formato de color inválido').optional(),
  theme: z.enum(['light', 'dark', 'system']),
});

type CompanySettingsForm = z.infer<typeof companySettingsSchema>;

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CompanySettingsForm>({
    resolver: zodResolver(companySettingsSchema),
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (status === 'authenticated' && session?.user?.company) {
      const company = session.user.company;
      setValue('name', company.name);
      setValue('appName', company.appName);
      setValue('primaryColor', company.branding.primaryColor);
      setValue('secondaryColor', company.branding.secondaryColor || '');
      setValue('accentColor', company.branding.accentColor || '');
      setValue('theme', company.theme);
      setLoading(false);
    }
  }, [status, session, router, setValue]);

  const onSubmit = async (data: CompanySettingsForm) => {
    if (!session?.user?.companyId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/companies/${session.user.companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          appName: data.appName,
          branding: {
            appName: data.appName,
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor || undefined,
            accentColor: data.accentColor || undefined,
          },
          theme: data.theme,
        }),
      });

      if (response.ok) {
        toast.success('Configuración actualizada exitosamente');
        // Refresh the page to apply changes
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al actualizar la configuración');
      }
    } catch (error) {
      toast.error('Error al actualizar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center">
          <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Configuración de la Empresa
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Personaliza la apariencia y configuración de tu empresa
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Company Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Información de la Empresa
              </h2>
            </div>
          </div>
          <div className="px-6 py-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nombre de la Empresa
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nombre de la Aplicación
                  </label>
                  <input
                    {...register('appName')}
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.appName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.appName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tema por Defecto
                </label>
                <select
                  {...register('theme')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="system">Sistema</option>
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                </select>
                {errors.theme && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.theme.message}
                  </p>
                )}
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Branding Colors */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Palette className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Colores de Marca
              </h2>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Color Primario
                </label>
                <div className="mt-1 flex items-center space-x-3">
                  <input
                    {...register('primaryColor')}
                    type="color"
                    className="h-10 w-16 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                  />
                  <input
                    {...register('primaryColor')}
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#3b82f6"
                  />
                </div>
                {errors.primaryColor && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.primaryColor.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Color Secundario
                </label>
                <div className="mt-1 flex items-center space-x-3">
                  <input
                    {...register('secondaryColor')}
                    type="color"
                    className="h-10 w-16 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                  />
                  <input
                    {...register('secondaryColor')}
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#1e40af"
                  />
                </div>
                {errors.secondaryColor && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.secondaryColor.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Color de Acento
                </label>
                <div className="mt-1 flex items-center space-x-3">
                  <input
                    {...register('accentColor')}
                    type="color"
                    className="h-10 w-16 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                  />
                  <input
                    {...register('accentColor')}
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#60a5fa"
                  />
                </div>
                {errors.accentColor && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.accentColor.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
