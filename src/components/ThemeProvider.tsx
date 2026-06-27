'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider 
      attribute="class" // 🔥 UBAH INI DARI "data-theme" JADI "class"
      defaultTheme="dark" 
      enableSystem={false} 
    >
      {children}
    </NextThemesProvider>
  );
}
