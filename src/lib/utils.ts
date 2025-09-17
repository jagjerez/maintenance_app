import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  return dateObj.toLocaleDateString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date: string | Date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  return dateObj.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Client-safe date formatting to prevent hydration mismatches
export function formatDateSafe(date: string | Date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

// Create UTC date from local date input (for datetime-local inputs)
export function createUTCDateFromLocalInput(localDateTimeString: string): Date {
  // localDateTimeString format: "2024-01-15T14:30"
  const localDate = new Date(localDateTimeString);
  // Convert to UTC by adjusting for timezone offset
  const utcDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
  return utcDate;
}

// Create local date from UTC date (for datetime-local inputs)
export function createLocalDateFromUTC(utcDate: Date | string): string {
  const date = new Date(utcDate);
  if (isNaN(date.getTime())) {
    return '';
  }
  // Adjust for timezone offset to get local time
  const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

// Format date with timezone information
export function formatDateTimeWithTimezone(date: string | Date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  return dateObj.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getTypeColor(type: string) {
  switch (type) {
    case 'preventive':
      return 'bg-green-100 text-green-800';
    case 'corrective':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
