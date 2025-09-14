'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export function ThemeSync() {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const htmlElement = document.documentElement;
    const currentTheme = theme === 'system' ? systemTheme : theme;
    
    // Aplicar el tema correcto
    if (currentTheme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [theme, systemTheme, mounted]);

  // No renderizar nada hasta que esté montado en el cliente
  if (!mounted) {
    return null;
  }

  return null;
}
