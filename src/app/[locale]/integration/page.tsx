'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [queueStatus, setQueueStatus] = useState<{
    pendingJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    nextJobToProcess?: {
      id: string;
      fileName: string;
      type: string;
      createdAt: Date;
    };
  } | null>(null);
  const [queueStats, setQueueStats] = useState<{
    totalJobs: number;
    successRate: number;
    averageProcessingTime: number;
    jobsByType: Record<string, number>;
    jobsByStatus: Record<string, number>;
  } | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    stuckJobs: Array<{
      id: string;
      fileName: string;
      type: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      stuckForMinutes: number;
    }>;
    jobsByStatus: Record<string, number>;
    recentJobs: Array<{
      id: string;
      fileName: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  } | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [localCronStatus, setLocalCronStatus] = useState<{
    isActive: boolean;
    message: string;
  } | null>(null);
  const [isLocal, setIsLocal] = useState(false);

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
      files: null as FileList | null
    }
  });

  const selectedType = watch('type');
  const watchedFiles = watch('files');

  const fetchJobs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/integration/jobs?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || data);
        setTotalPages(data.totalPages || Math.ceil((data.jobs || data).length / ITEMS_PER_PAGE));
        setTotalItems(data.totalItems || (data.jobs || data).length);
      } else {
        toast.error(t('errorFetchingJobs'));
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error(t('errorFetchingJobs'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchJobs(currentPage);
    fetchQueueStatus();
    fetchQueueStats();
    
    // Check if running locally
    setIsLocal(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    // Check local cron status if running locally
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      fetchLocalCronStatus();
    }
  }, [currentPage, fetchJobs]);

  // Poll queue status every 5 seconds when there are pending or processing jobs
  useEffect(() => {
    const interval = setInterval(() => {
      if ((queueStatus?.processingJobs ?? 0) > 0 || (queueStatus?.pendingJobs ?? 0) > 0) {
        fetchQueueStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [queueStatus]);

  useEffect(() => {
    if (watchedFiles && watchedFiles.length > 0) {
      setSelectedFiles(watchedFiles);
    } else {
      setSelectedFiles(null);
    }
  }, [watchedFiles]);

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('/api/integration/queue');
      if (response.ok) {
        const data = await response.json();
        setQueueStatus(data);
      }
    } catch (error) {
      console.error('Error fetching queue status:', error);
    }
  };

  const fetchQueueStats = async () => {
    try {
      const response = await fetch('/api/integration/stats?days=7');
      if (response.ok) {
        const data = await response.json();
        setQueueStats(data);
      }
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    }
  };

  const fetchDiagnosticInfo = async () => {
    try {
      const response = await fetch('/api/integration/diagnose');
      if (response.ok) {
        const data = await response.json();
        setDiagnosticInfo(data);
      }
    } catch (error) {
      console.error('Error fetching diagnostic info:', error);
    }
  };

  const resetStuckJobs = async () => {
    try {
      const response = await fetch('/api/integration/reset-stuck-jobs', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        fetchDiagnosticInfo();
        fetchJobs(currentPage);
        fetchQueueStatus();
      } else {
        toast.error(t('errorResettingJobs'));
      }
    } catch (error) {
      console.error('Error resetting stuck jobs:', error);
      toast.error(t('errorResettingJobs'));
    }
  };

  const testCron = async () => {
    try {
      const response = await fetch('/api/cron/test', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(t('cronTestSuccess'));
        console.log('Cron test result:', data);
        fetchJobs(currentPage);
        fetchQueueStatus();
      } else {
        const error = await response.json();
        toast.error(`Cron test failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error testing cron:', error);
      toast.error(t('errorTestingCron'));
    }
  };

  const fetchLocalCronStatus = async () => {
    try {
      const response = await fetch('/api/cron/local');
      if (response.ok) {
        const data = await response.json();
        setLocalCronStatus(data);
      }
    } catch (error) {
      console.error('Error fetching local cron status:', error);
    }
  };

  const controlLocalCron = async (action: 'start' | 'stop' | 'process') => {
    try {
      const response = await fetch('/api/cron/local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        fetchLocalCronStatus();
        if (action === 'process') {
          fetchJobs(currentPage);
          fetchQueueStatus();
        }
      } else {
        const error = await response.json();
        toast.error(`Local cron ${action} failed: ${error.error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing local cron:`, error);
      toast.error(t('errorLocalCron', { action }));
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

  const onSubmit = async (data: { type: string; files: FileList | null }) => {
    if (!data.files || !data.files[0] || !data.type) {
      toast.error(t('selectFileAndType'));
      return;
    }

    setUploading(true);
    const formData = new FormData();
    
    // Add all files
    for (let i = 0; i < data.files.length; i++) {
      formData.append('files', data.files[i]);
    }
    formData.append('type', data.type);

    try {
      const response = await fetch('/api/integration/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setShowUploadModal(false);
        reset();
        fetchJobs(currentPage);
        toast.success(t('filesUploadedSuccessfully', { count: result.jobIds.length }));
      } else {
        const error = await response.json();
        toast.error(error.message || t('errorUploadingFiles'));
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error(t('errorUploadingFiles'));
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
            {item.processedRows} / {item.totalRows} {t('rowsProcessed')}
            {item.limitedRows > 0 && (
              <span className="text-orange-600 dark:text-orange-400 ml-1">
                ({item.limitedRows} {t('limitedRows')})
              </span>
            )}
          </div>
          {item.totalRows > 0 && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${(item.processedRows / item.totalRows) * 100}%` }}
              ></div>
            </div>
          )}
          {item.limitedRows > 0 && (
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {t('onlyFirst100Rows')}
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {t('description')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setShowDiagnostic(true);
                fetchDiagnosticInfo();
              }}
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">{t('diagnose')}</span>
              <span className="xs:hidden">{t('diag')}</span>
            </button>
            <button
              onClick={testCron}
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">{t('testCron')}</span>
              <span className="xs:hidden">{t('test')}</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t('uploadFile')}
            </button>
          </div>
        </div>
      </div>

      {/* Item Count Indicator */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 dark:text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {jobs.length} {t('uploadHistory')}
              {jobs.length !== 1 ? "s" : ""}
            </span>
          </div>
          
          {/* Queue Status Indicator */}
          {queueStatus && ((queueStatus.processingJobs ?? 0) > 0 || (queueStatus.pendingJobs ?? 0) > 0) && (
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm">
              {(queueStatus.processingJobs ?? 0) > 0 && (
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  <span className="truncate">{t('processingFiles', { count: queueStatus.processingJobs })}</span>
                </div>
              )}
              {(queueStatus.pendingJobs ?? 0) > 0 && (
                <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="truncate">{t('filesInQueue', { count: queueStatus.pendingJobs })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Local Cron Status (only in development) - Moved to separate section for better visibility */}
      {isLocal && localCronStatus && (
        <div className="mb-4 sm:mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
            <div className={`flex items-center space-x-2 ${localCronStatus.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <div className={`w-3 h-3 rounded-full ${localCronStatus.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">{localCronStatus.message}</span>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {!localCronStatus.isActive ? (
                <button
                  onClick={() => controlLocalCron('start')}
                  className="px-4 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 font-medium shadow-sm"
                >
{t('startCron')}
                </button>
              ) : (
                <button
                  onClick={() => controlLocalCron('stop')}
                  className="px-4 py-2 text-xs sm:text-sm bg-red-600 text-white rounded-md hover:bg-red-700 font-medium shadow-sm"
                >
{t('stopCron')}
                </button>
              )}
              <button
                onClick={() => controlLocalCron('process')}
                className="px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium shadow-sm"
              >
{t('processNow')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue Statistics Panel */}
      {queueStats && (
        <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Jobs */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Database className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{t('totalJobs')}</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {queueStats.totalJobs}
                </p>
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{t('successRate')}</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {queueStats.successRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Average Processing Time */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{t('avgProcessingTime')}</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {queueStats.averageProcessingTime > 0 
                    ? `${queueStats.averageProcessingTime.toFixed(1)}s`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Current Queue Status */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {(queueStatus?.processingJobs ?? 0) > 0 ? (
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 animate-spin" />
                ) : (queueStatus?.pendingJobs ?? 0) > 0 ? (
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{t('queueStatus')}</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white truncate">
                  {(queueStatus?.processingJobs ?? 0) > 0 
                    ? `${queueStatus?.processingJobs} processing`
                    : (queueStatus?.pendingJobs ?? 0) > 0 
                    ? `${queueStatus?.pendingJobs} pending`
                    : t('idle')
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jobs by Type Chart */}
      {queueStats && queueStats.jobsByType && Object.keys(queueStats.jobsByType).length > 0 && (
        <div className="mb-4 sm:mb-6 bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">
            {t('jobsByType')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {Object.entries(queueStats.jobsByType).map(([type, count]) => {
              const typeInfo = types.find(t => t.value === type);
              return (
                <div key={type} className="text-center">
                  <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{typeInfo?.icon || '📄'}</div>
                  <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {typeInfo?.label || type}
                  </div>
                  <div className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
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
        className="mt-4 sm:mt-6"
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
              {...register('type', { required: t('typeRequired') })}
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
            <FormLabel required>{t('files')}</FormLabel>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              multiple
              {...register('files', { required: t('filesRequired') })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {errors.files && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.files.message}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('youCanSelectMultipleFiles')}
            </p>
            
            {/* Selected Files Preview */}
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('selectedFiles', { count: selectedFiles.length })}
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Array.from(selectedFiles).map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900 dark:text-white">{file.name}</span>
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </FormGroup>

          {/* Template Downloads */}
          {selectedType && (
            <FormGroup>
              <FormLabel>{t('downloadTemplate')}</FormLabel>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => downloadTemplate(selectedType, 'csv')}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  {t('csvTemplate')}
                </button>
                <button
                  type="button"
                  onClick={() => downloadTemplate(selectedType, 'xlsx')}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  {t('excelTemplate')}
                </button>
              </div>
            </FormGroup>
          )}

          {/* Processing Limit Warning */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3 sm:p-4">
            <div className="flex">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-orange-800 dark:text-orange-200">
                <p className="font-medium">{t('processingLimit')}</p>
                <p className="mt-1">
                  {t('processingLimitDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* ID Format Guide */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 sm:p-4">
            <div className="flex">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">{t('idFormatGuide')}</p>
                <p className="mt-1">
                  {t('idFormatGuideDescription')}
                </p>
                <a 
                  href="/templates/ID_FORMAT_GUIDE.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block break-all"
                >
                  {t('viewDetailedGuide')}
                </a>
              </div>
            </div>
          </div>

          <FormButton
            type="submit"
            disabled={isSubmitting || uploading}
            className="w-full"
          >
            {uploading 
              ? t('uploading') 
              : selectedFiles && selectedFiles.length > 0 
                ? `${t('uploadFile')} (${selectedFiles.length} files)`
                : t('uploadFile')
            }
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

      {/* Diagnostic Modal */}
      {showDiagnostic && (
        <Modal
          isOpen={showDiagnostic}
          onClose={() => setShowDiagnostic(false)}
          title={t('integrationJobsDiagnostic')}
          size="xl"
        >
          <div className="space-y-6">
            {/* Stuck Jobs */}
            {diagnosticInfo?.stuckJobs && diagnosticInfo.stuckJobs.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                  <h3 className="text-base sm:text-lg font-medium text-red-800 dark:text-red-200">
{t('stuckJobs', { count: diagnosticInfo.stuckJobs.length })}
                  </h3>
                  <button
                    onClick={resetStuckJobs}
                    className="px-3 py-1 bg-red-600 text-white text-xs sm:text-sm rounded-md hover:bg-red-700 w-full sm:w-auto"
                  >
{t('resetToPending')}
                  </button>
                </div>
                <div className="space-y-2">
                  {diagnosticInfo.stuckJobs.map((job) => (
                    <div key={job.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 bg-white dark:bg-gray-800 rounded border gap-1 sm:gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{job.fileName}</div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {job.type} • {t('stuckForMinutes', { minutes: job.stuckForMinutes })}
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                        {job.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Jobs by Status */}
            {diagnosticInfo?.jobsByStatus && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3">
{t('jobsByStatus')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {Object.entries(diagnosticInfo.jobsByStatus).map(([status, count]) => (
                    <div key={status} className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 capitalize">{status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Jobs */}
            {diagnosticInfo?.recentJobs && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3">
{t('recentJobs')}
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {diagnosticInfo.recentJobs.map((job) => (
                    <div key={job.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 bg-white dark:bg-gray-800 rounded border gap-1 sm:gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{job.fileName}</div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {new Date(job.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className={`text-xs sm:text-sm px-2 py-1 rounded ${
                        job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        job.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        job.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {job.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!diagnosticInfo?.stuckJobs || diagnosticInfo.stuckJobs.length === 0) && 
             (!diagnosticInfo?.jobsByStatus || Object.keys(diagnosticInfo.jobsByStatus).length === 0) && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
{t('noDiagnosticInfo')}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
