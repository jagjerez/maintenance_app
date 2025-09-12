'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import DataTable from '@/components/DataTable';
import toast from 'react-hot-toast';

interface Operation {
  _id: string;
  name: string;
  description: string;
  estimatedTime: number;
  requiredResources: string[];
  createdAt: string;
}

export default function OperationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (status === 'authenticated') {
      fetchOperations();
    }
  }, [status, router]);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/operations');
      if (!response.ok) {
        throw new Error('Failed to fetch operations');
      }
      const data = await response.json();
      setOperations(data);
    } catch (error) {
      console.error('Error fetching operations:', error);
      toast.error('Error al cargar las operaciones');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'name' as keyof Operation,
      label: 'Nombre',
    },
    {
      key: 'description' as keyof Operation,
      label: 'Descripción',
      className: 'max-w-xs',
    },
    {
      key: 'estimatedTime' as keyof Operation,
      label: 'Tiempo Estimado',
      render: (value: unknown) => `${value as number} minutos`,
    },
    {
      key: 'requiredResources' as keyof Operation,
      label: 'Recursos',
      render: (value: unknown) => {
        const resources = value as string[];
        return resources.length > 0 ? resources.join(', ') : 'Sin recursos';
      },
    },
    {
      key: 'createdAt' as keyof Operation,
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Operaciones</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Gestiona las operaciones de mantenimiento
            </p>
          </div>
          <button
            disabled
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-400 cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Operación
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={operations}
            columns={columns}
          />
        </div>
      </div>
    </div>
  );
}
