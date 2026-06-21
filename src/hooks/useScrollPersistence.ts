import { useEffect } from 'react';

export function useScrollPersistence(feedKey: string) {
  // Simpan posisi scroll dan halaman saat ini ke sessionStorage
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(
        `feed_scroll_${feedKey}`,
        String(window.scrollY)
      );
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [feedKey]);

  const restoreScroll = () => {
    const saved = sessionStorage.getItem(`feed_scroll_${feedKey}`);
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
      sessionStorage.removeItem(`feed_scroll_${feedKey}`);
    }
  };

  return { restoreScroll };
}