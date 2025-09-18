'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from '@/hooks/useTranslations';
import { 
  Image as ImageIcon, 
  Loader2, 
  Upload, 
  X, 
  Camera,
  Plus,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ImageUploadProps {
  onImageUpload: (image: {
    url: string;
    filename: string;
    uploadedAt: Date;
    uploadedBy?: string;
  }) => void;
  disabled?: boolean;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
}

interface PreviewImage {
  file: File;
  preview: string;
  id: string;
}

export default function ImageUpload({ 
  onImageUpload, 
  disabled = false, 
  multiple = false,
  maxFiles = 10,
  className = ""
}: ImageUploadProps) {
  const { t } = useTranslations();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return t("workOrders.invalidFileType");
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return t("workOrders.fileTooLarge");
    }

    return null;
  };

  const createPreview = (file: File): PreviewImage => ({
    file,
    preview: URL.createObjectURL(file),
    id: Math.random().toString(36).substr(2, 9)
  });

  const handleFiles = useCallback((files: FileList) => {
    if (disabled || isUploading) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate all files
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    // Show validation errors
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    // Check max files limit
    const totalFiles = previewImages.length + validFiles.length;
    if (totalFiles > maxFiles) {
      toast.error(t("workOrders.maxFilesExceeded", { max: maxFiles }));
      return;
    }

    // Create previews for valid files
    if (validFiles.length > 0) {
      const newPreviews = validFiles.map(createPreview);
      setPreviewImages(prev => [...prev, ...newPreviews]);
    }
  }, [disabled, isUploading, previewImages.length, maxFiles, t]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      onImageUpload({
        url: data.url,
        filename: data.filename,
        uploadedAt: new Date(),
        uploadedBy: 'Current User', // TODO: Get from session
      });

      toast.success(t("workOrders.imageUploadedSuccessfully"));

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : t("workOrders.imageUploadError"));
    } finally {
      setIsUploading(false);
    }
  };

  const uploadAllImages = async () => {
    if (previewImages.length === 0) return;

    setIsUploading(true);
    try {
      for (const preview of previewImages) {
        await handleFileUpload(preview.file);
      }
      setPreviewImages([]);
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removePreview = (id: string) => {
    setPreviewImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      // Clean up object URL to prevent memory leaks
      const toRemove = prev.find(img => img.id === id);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.preview);
      }
      return updated;
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    if (disabled || isUploading) return;
    // For mobile devices, this will open the camera
    const input = fileInputRef.current;
    if (input) {
      input.setAttribute('capture', 'environment');
      input.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
          dragActive
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
          multiple={multiple}
        />

        <div className="flex flex-col items-center space-y-3">
          {isUploading ? (
            <div className="relative">
              <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Plus className="h-3 w-3 text-white" />
              </div>
            </div>
          )}
          
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {isUploading ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("workOrders.uploadingImage")}</span>
                </span>
              ) : (
                <span className="text-blue-600 dark:text-blue-400">
                  {t("workOrders.clickToUpload")}
                </span>
              )}
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("workOrders.orDragAndDrop")}
            </p>
          </div>

          {/* Action Buttons */}
          {!isUploading && (
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                disabled={disabled}
              >
                <ImageIcon className="h-4 w-4 mr-1 inline" />
                {t("workOrders.selectFiles")}
              </button>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCameraClick();
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                disabled={disabled}
              >
                <Camera className="h-4 w-4 mr-1 inline" />
                {t("workOrders.takePhoto")}
              </button>
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="mt-4 space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("workOrders.supportedFormats")}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("workOrders.maxFileSize")} • {t("workOrders.maxFiles", { max: maxFiles })}
          </p>
        </div>
      </div>

      {/* Preview Images */}
      {previewImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {t("workOrders.previewImages")} ({previewImages.length})
            </h4>
            <button
              type="button"
              onClick={uploadAllImages}
              disabled={isUploading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition-colors flex items-center space-x-1"
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              <span>{t("workOrders.uploadAll")}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {previewImages.map((preview) => (
              <div
                key={preview.id}
                className="relative group bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm"
              >
                <img
                  src={preview.preview}
                  alt="Preview"
                  className="w-full h-24 object-cover"
                />
                
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removePreview(preview.id)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isUploading}
                >
                  <X className="h-3 w-3" />
                </button>

                {/* File info */}
                <div className="p-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {preview.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {(preview.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && previewImages.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {t("workOrders.uploadingImages")}...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}