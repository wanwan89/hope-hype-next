  // hooks/useGlobalRefresh.ts
import { useEffect } from 'react';

export const useGlobalRefresh = (refetchFunction: () => Promise<any>) => {
  useEffect(() => {
    // Mendaftarkan fungsi refetch halaman ke window global
    (window as any).pageRefreshHandler = refetchFunction;

    return () => {
      // Hapus saat pindah halaman
      (window as any).pageRefreshHandler = null;
    };
  }, [refetchFunction]);
};
