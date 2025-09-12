'use client';

import { useCompanyTheme } from '@/hooks/useCompanyTheme';

interface CompanyThemeProviderProps {
  children: React.ReactNode;
}

export function CompanyThemeProvider({ children }: CompanyThemeProviderProps) {
  useCompanyTheme();
  return <>{children}</>;
}
