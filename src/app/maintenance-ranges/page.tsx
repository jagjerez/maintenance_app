'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { getTypeColor } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Operation {
  _id: string;
  name: string;
  description: string;
  estimatedTime: number;
}

interface MaintenanceRange {
  _id: string;
  name: string;
  type: 'preventive' | 'corrective';
  description: string;
  operations: Operation[];
  createdAt: string;
}

export default function MaintenanceRangesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [maintenanceRanges, setMaintenanceRanges] = useState<MaintenanceRange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (status === 'authenticated') {
      fetchMaintenanceRanges();
    }
  }, [status, router]);

  const fetchMaintenanceRanges = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/maintenance-ranges');
      if (!response.ok) {
        throw new Error('Failed to fetch maintenance ranges');
      }
      const data = await response.json();
      setMaintenanceRanges(data);
    } catch (error) {
      console.error('Error fetching maintenance ranges:', error);
      toast.error('Error al cargar las gamas de mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'name' as keyof MaintenanceRange,
      label: 'Nombre',
    },
    {
      key: 'type' as keyof MaintenanceRange,
      label: 'Tipo',
      render: (value: unknown) => {
        const type = value as string;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(type)}`}>
            {type === 'preventive' ? 'Preventivo' : 'Correctivo'}
          </span>
        );
      },
    },
    {
      key: 'description' as keyof MaintenanceRange,
      label: 'Descripción',
      className: 'max-w-xs',
    },
    {
      key: 'operations' as keyof MaintenanceRange,
      label: 'Operaciones',
      render: (value: unknown) => {
        const operations = value as Operation[];
        return `${operations.length} operaciones`;
      },
    },
    {
      key: 'createdAt' as keyof MaintenanceRange,
      label: 'Creado',
      render: (value: unknown) => new Date(value as string).toLocaleDateString('es-ES'),
    },
  ];

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gamas de Mantenimiento</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Gestiona las gamas de mantenimiento del sistema
            </p>
          </div>
          <button
            disabled
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-400 cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Gama
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={maintenanceRanges}
            columns={columns}
          />
        </div>
      </div>
    </div>
  );
}
