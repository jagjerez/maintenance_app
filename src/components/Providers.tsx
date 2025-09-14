'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './ThemeProvider';
import { CompanyThemeProvider } from './CompanyThemeProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="theme"
        value={{
          light: 'light',
          dark: 'dark',
          system: 'system'
        }}
      >
        <CompanyThemeProvider>
          {children}
        </CompanyThemeProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
