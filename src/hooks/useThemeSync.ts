'use client';

import { useTheme } from 'next-themes';

export function useThemeSync() {
  const { theme, setTheme } = useTheme();

  // Función para sincronizar el tema con la clase HTML
  const syncTheme = (newTheme: string) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (newTheme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Wrapper para setTheme que también actualiza la clase HTML
  const setThemeWithSync = (newTheme: string) => {
    setTheme(newTheme);
    syncTheme(newTheme);
  };

  return { theme, setTheme: setThemeWithSync };
}
