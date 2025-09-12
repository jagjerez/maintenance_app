'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export function useCompanyTheme() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.company) {
      const company = session.user.company;
      
      // Apply company branding colors
      if (company.branding?.primaryColor) {
        document.documentElement.style.setProperty(
          '--company-primary',
          company.branding.primaryColor
        );
      }
      
      if (company.branding?.secondaryColor) {
        document.documentElement.style.setProperty(
          '--company-secondary',
          company.branding.secondaryColor
        );
      }
      
      if (company.branding?.accentColor) {
        document.documentElement.style.setProperty(
          '--company-accent',
          company.branding.accentColor
        );
      }

      // Apply company theme preference
      if (company.theme && company.theme !== 'system') {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(company.theme);
      }
    }
  }, [session?.user?.company]);

  return {
    company: session?.user?.company,
    primaryColor: session?.user?.company?.branding?.primaryColor || '#3b82f6',
    secondaryColor: session?.user?.company?.branding?.secondaryColor || '#1e40af',
    accentColor: session?.user?.company?.branding?.accentColor || '#60a5fa',
    appName: session?.user?.company?.appName || 'Sistema de Mantenimiento',
  };
}
