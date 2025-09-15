'use client';

import { useState, useRef } from 'react';
import { useTranslations } from '@/hooks/useTranslations';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ImageUploadProps {
  onImageUpload: (image: {
    url: string;
    filename: string;
    uploadedAt: Date;
    uploadedBy?: string;
  }) => void;
  disabled?: boolean;
}

export default function ImageUpload({ onImageUpload, disabled = false }: ImageUploadProps) {
  const { t } = useTranslations();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (disabled || isUploading) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("workOrders.invalidFileType"));
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error(t("workOrders.fileTooLarge"));
      return;
    }

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
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragActive
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
      />

      <div className="flex flex-col items-center space-y-2">
        {isUploading ? (
          <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
        ) : (
          <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        )}
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {isUploading ? (
            <span>{t("workOrders.uploadingImage")}</span>
          ) : (
            <>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {t("workOrders.clickToUpload")}
              </span>
              <span className="block">
                {t("workOrders.orDragAndDrop")}
              </span>
            </>
          )}
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {t("workOrders.supportedFormats")}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {t("workOrders.maxFileSize")}
        </p>
      </div>
    </div>
  );
}
