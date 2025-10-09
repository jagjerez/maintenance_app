"use client";

import { LoadingIndicatorProps } from "./types";

export default function LoadingIndicator({
  isLoading,
  message = "Loading...",
  size = "md",
  variant = "default",
}: LoadingIndicatorProps) {
  if (!isLoading) return null;

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  const spinnerClasses = `border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin ${sizeClasses[size]}`;

  if (variant === "skeleton") {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center space-x-2">
        <div className={spinnerClasses} />
        <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center space-x-2">
        <div className={spinnerClasses} />
        <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>
      </div>
    </div>
  );
}
