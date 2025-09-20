'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Clock, X, Database } from 'lucide-react';
import { IIntegrationJob } from '@/models/IntegrationJob';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { Form, FormGroup, FormLabel, FormButton } from '@/components/Form';
import { Pagination } from '@/components/Pagination';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

interface IntegrationJobWithId extends IIntegrationJob {
  _id: string;
}

const ITEMS_PER_PAGE = 10;

export default function IntegrationPage() {
  const t = useTranslations('Integration');
  const [jobs, setJobs] = useState<IntegrationJobWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showErrors, setShowErrors] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [uploading, setUploading] = useState(false);

  const types = [
    { value: 'locations', label: 'Locations', icon: '🏢' },
    { value: 'machine-models', label: 'Machine Models', icon: '⚙️' },
    { value: 'machines', label: 'Machines', icon: '🔧' },
    { value: 'maintenance-ranges', label: 'Maintenance Ranges', icon: '📋' },
    { value: 'operations', label: 'Operations', icon: '⚡' },
  ];

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch } = useForm({
    defaultValues: {
      type: '',
      file: null as FileList | null
    }
  });

  const selectedType = watch('type');

  useEffect(() => {
    fetchJobs(currentPage);
  }, [currentPage]);

  const fetchJobs = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/integration/jobs?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || data);
        setTotalPages(data.totalPages || Math.ceil((data.jobs || data).length / ITEMS_PER_PAGE));
        setTotalItems(data.totalItems || (data.jobs || data).length);
      } else {
        toast.error('Error fetching integration jobs');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Error fetching integration jobs');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = (type: string, format: 'csv' | 'xlsx') => {
    const link = document.createElement('a');
    link.href = `/templates/${type}_template.${format}`;
    link.download = `${type}_template.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onSubmit = async (data: { type: string; file: FileList | null }) => {
    if (!data.file || !data.file[0] || !data.type) {
      toast.error('Please select a file and type');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', data.file[0]);
    formData.append('type', data.type);

    try {
      const response = await fetch('/api/integration/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setShowUploadModal(false);
        reset();
        fetchJobs(currentPage);
        toast.success('File uploaded successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error uploading file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('pending');
      case 'processing':
        return t('processing');
      case 'completed':
        return t('completed');
      case 'failed':
        return t('failed');
      default:
        return status;
    }
  };

  const columns = [
    {
      key: "fileName" as keyof IntegrationJobWithId,
      label: t('file'),
      render: (value: unknown, item: IntegrationJobWithId) => (
        <div className="flex items-center">
          <FileText className="w-4 h-4 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {value as string}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {((item.fileSize || 0) / 1024).toFixed(1)} KB
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "type" as keyof IntegrationJobWithId,
      label: t('type'),
      render: (value: unknown) => {
        const type = types.find(t => t.value === value);
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {type?.icon} {type?.label || (value as string)}
          </span>
        );
      },
    },
    {
      key: "status" as keyof IntegrationJobWithId,
      label: t('status'),
      render: (value: unknown) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value as string)}`}>
          {getStatusIcon(value as string)}
          <span className="ml-1 capitalize">{getStatusText(value as string)}</span>
        </span>
      ),
    },
    {
      key: "progress" as keyof IntegrationJobWithId,
      label: t('progress'),
      render: (value: unknown, item: IntegrationJobWithId) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white">
            {item.processedRows} / {item.totalRows} rows
          </div>
          {item.totalRows > 0 && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${(item.processedRows / item.totalRows) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "createdAt" as keyof IntegrationJobWithId,
      label: t('date'),
      render: (value: unknown) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(value as string).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions" as keyof IntegrationJobWithId,
      label: t('actions'),
      render: (value: unknown, item: IntegrationJobWithId) => (
        item.status === 'completed' && item.errorRows > 0 ? (
          <button
            onClick={() => setShowErrors(item._id)}
            className="text-red-600 hover:text-red-900 flex items-center gap-1 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            {t('viewErrors')} ({item.errorRows})
          </button>
        ) : null
      ),
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

        <div className="mb-4 sm:mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 sm:h-5 sm:w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 sm:w-24 animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
            <div className="animate-pulse">
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
              {t('title')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('description')}
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('uploadFile')}
          </button>
        </div>
      </div>

      {/* Item Count Indicator */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {jobs.length} {t('uploadHistory')}
            {jobs.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={jobs}
            columns={columns}
            onEdit={undefined}
            onDelete={undefined}
            onBulkDelete={undefined}
            enableBulkDelete={false}
            selectedItems={[]}
            onSelectionChange={() => {}}
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

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          reset();
        }}
        title={t('uploadData')}
        size="xl"
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <FormLabel required>{t('dataType')}</FormLabel>
            <select
              {...register('type', { required: 'Type is required' })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{t('selectDataType')}</option>
              {types.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.type.message}</p>
            )}
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t('file')}</FormLabel>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              {...register('file', { required: 'File is required' })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {errors.file && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.file.message}</p>
            )}
          </FormGroup>

          {/* Template Downloads */}
          {selectedType && (
            <FormGroup>
              <FormLabel>{t('downloadTemplate')}</FormLabel>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadTemplate(selectedType, 'csv')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('csvTemplate')}
                </button>
                <button
                  type="button"
                  onClick={() => downloadTemplate(selectedType, 'xlsx')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('excelTemplate')}
                </button>
              </div>
            </FormGroup>
          )}

          <FormButton
            type="submit"
            disabled={isSubmitting || uploading}
            className="w-full"
          >
            {uploading ? t('uploading') : t('uploadFile')}
          </FormButton>
        </Form>
      </Modal>

      {/* Error Modal */}
      {showErrors && (
        <Modal
          isOpen={!!showErrors}
          onClose={() => setShowErrors(null)}
          title={t('processingErrors')}
          size="xl"
        >
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {jobs.find(j => j._id === showErrors)?.errors.map((error, index) => (
              <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="text-sm text-red-800 dark:text-red-200">
                  <strong>{t('row')} {error.row}:</strong> {error.field} - {error.message}
                </div>
                <div className="text-xs text-red-600 dark:text-red-300 mt-1">
                  {t('value')}: &ldquo;{error.value}&rdquo;
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
