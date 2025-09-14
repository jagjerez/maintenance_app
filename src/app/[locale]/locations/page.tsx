'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from '@/hooks/useTranslations';
import { Plus, Edit, Trash2, MapPin, Folder, FolderOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Form, FormGroup, FormLabel, FormInput, FormTextarea, FormSelect, FormButton } from '@/components/Form';
import { Pagination } from '@/components/Pagination';
import { locationSchema } from '@/lib/validations';
import LocationTreeView from '@/components/LocationTreeView';

interface Machine {
  _id: string;
  model: {
    _id: string;
    name: string;
    manufacturer: string;
    brand: string;
    year: number;
  };
  maintenanceRange?: {
    _id: string;
    name: string;
    type: 'preventive' | 'corrective';
  };
  location: string;
}

interface Location {
  _id: string;
  name: string;
  description?: string;
  path: string;
  level: number;
  isLeaf: boolean;
  parentId?: string;
  machines: Machine[];
  children: Location[];
}

const ITEMS_PER_PAGE = 10;

export default function LocationsPage() {
  const { t } = useTranslations();
  const { data: session } = useSession();
  const [locations, setLocations] = useState<Location[]>([]);
  const [parentLocations, setParentLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; location: Location | null }>({
    isOpen: false,
    location: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(locationSchema),
  });

  // Fetch locations with pagination
  const fetchLocations = useCallback(async (page = 1) => {
    try {
      const response = await fetch(`/api/locations?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || data);
        setTotalPages(data.totalPages || Math.ceil((data.locations || data).length / ITEMS_PER_PAGE));
        setTotalItems(data.totalItems || (data.locations || data).length);
      } else {
        toast.error(t("locations.locationLoadError"));
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error(t("locations.locationLoadError"));
    }
  }, [t]);

  // Fetch all locations for parent selection
  const fetchAllLocations = useCallback(async () => {
    try {
      const response = await fetch('/api/locations?includeChildren=true&flat=true');
      if (response.ok) {
        const data = await response.json();
        setParentLocations(data);
      } else {
        toast.error(t("locations.locationLoadError"));
      }
    } catch (error) {
      console.error('Error fetching all locations:', error);
      toast.error(t("locations.locationLoadError"));
    }
  }, [t]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLocations(currentPage), fetchAllLocations()]);
      setLoading(false);
    };
    loadData();
  }, [currentPage, fetchLocations, fetchAllLocations]);

  const onSubmit = async (data: { name: string; description?: string; parentId?: string; companyId: string }) => {
    try {
      const url = editingLocation ? `/api/locations/${editingLocation._id}` : '/api/locations';
      const method = editingLocation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          companyId: session?.user?.companyId,
        }),
      });

      if (response.ok) {
        toast.success(editingLocation ? t("locations.locationUpdated") : t("locations.locationCreated"));
        await fetchLocations(currentPage);
        await fetchAllLocations();
        setRefreshTrigger(prev => prev + 1); // Trigger tree refresh
        setShowModal(false);
        setEditingLocation(null);
        reset();
      } else {
        const error = await response.json();
        toast.error(error.error || t("locations.locationError"));
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error(t("locations.locationError"));
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    reset({
      name: location.name,
      description: location.description || '',
      parentId: location.parentId || '',
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.location) return;

    try {
      const response = await fetch(`/api/locations/${deleteModal.location._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t("locations.locationDeleted"));
        await fetchLocations(currentPage);
        await fetchAllLocations();
        setRefreshTrigger(prev => prev + 1); // Trigger tree refresh
        setDeleteModal({ isOpen: false, location: null });
      } else {
        const error = await response.json();
        if (error.machinesCount) {
          toast.error(t("locations.cannotDeleteWithMachines"));
        } else if (error.childrenCount) {
          toast.error(t("locations.cannotDeleteWithChildren"));
        } else {
          toast.error(error.message || t("locations.locationError"));
        }
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error(t("locations.locationError"));
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLocationSelect = (location: Location) => {
    console.log('Selected location:', location);
  };

  const handleLocationEdit = (location: Location) => {
    handleEdit(location);
  };

  const handleLocationDelete = (location: Location) => {
    setDeleteModal({ isOpen: true, location });
  };

  const handleLocationAdd = (parentLocation?: Location) => {
    setEditingLocation(null);
    reset({
      name: '',
      description: '',
      parentId: parentLocation?._id || '',
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('locations.title')}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t("locations.subtitle")}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('locations.title')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t("locations.subtitle")}
        </p>
      </div>

      {/* Header with Add Button and View Toggle */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t("locations.title")}{totalItems !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'tree'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
              }`}
            >
              <Folder className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
              }`}
            >
              <MapPin className="h-4 w-4" />
            </button>
          </div>
          
          <FormButton
            onClick={() => handleLocationAdd()}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>{t("locations.newLocation")}</span>
          </FormButton>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'tree' ? (
        <LocationTreeView
          onLocationSelect={handleLocationSelect}
          onLocationEdit={handleLocationEdit}
          onLocationDelete={handleLocationDelete}
          onLocationAdd={handleLocationAdd}
          showActions={true}
          refreshTrigger={refreshTrigger}
          className="bg-white dark:bg-gray-800 shadow rounded-lg p-6"
        />
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          {locations.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {t("locations.noLocations")}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("locations.startAddingLocation")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {locations.map((location) => (
                <div key={location._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {location.isLeaf ? (
                            <Folder className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <FolderOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                            {location.name}
                          </h3>
                          {location.description && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                              {location.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{location.path}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>Level: {location.level}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FormButton
                        type="button"
                        variant="secondary"
                        onClick={() => handleEdit(location)}
                        className="p-2"
                      >
                        <Edit className="h-4 w-4" />
                      </FormButton>
                      <FormButton
                        type="button"
                        variant="danger"
                        onClick={() => setDeleteModal({ isOpen: true, location })}
                        className="p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </FormButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination for list view */}
      {viewMode === 'list' && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          className="mt-6"
        />
      )}

      {/* Add/Edit Location Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingLocation(null);
          reset();
        }}
        title={editingLocation ? t("locations.editLocation") : t("locations.newLocation")}
        size="md"
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          {/* Campo oculto para companyId */}
          <input
            type="hidden"
            {...register('companyId')}
            value={session?.user?.companyId || ''}
          />
          
          <FormGroup>
            <FormLabel required>{t("locations.locationName")}</FormLabel>
            <FormInput
              {...register('name')}
              error={errors.name?.message}
              placeholder={t("placeholders.locationName")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("locations.description")}</FormLabel>
            <FormTextarea
              {...register('description')}
              error={errors.description?.message}
              placeholder={t("placeholders.locationDescription")}
              rows={3}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("locations.parentLocation")}</FormLabel>
            <FormSelect
              {...register('parentId')}
              error={errors.parentId?.message}
            >
              <option value="">{t("locations.selectParentLocation")}</option>
              {parentLocations.map((location) => (
                <option key={location._id} value={location._id}>
                  {'  '.repeat(location.level)}{location.name}
                </option>
              ))}
            </FormSelect>
          </FormGroup>

          <div className="flex justify-end space-x-3 mt-6">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingLocation(null);
                reset();
              }}
            >
              {t("common.cancel")}
            </FormButton>
            <FormButton
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("common.saving") : editingLocation ? t("common.update") : t("common.create")}
            </FormButton>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, location: null })}
        onConfirm={handleDelete}
        title={t("modals.deleteLocation")}
        message={t("modals.deleteLocationMessage")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        variant="danger"
        itemDetails={deleteModal.location ? {
          name: deleteModal.location.name,
          description: deleteModal.location.description || '',
        } : undefined}
      />
    </div>
  );
}
