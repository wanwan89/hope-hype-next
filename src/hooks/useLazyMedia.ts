import { useEffect, useRef } from 'react';

export function useLazyMedia(rootMargin = '200px') {
  const imgObserver = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    imgObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLImageElement;
            const realSrc = el.getAttribute('data-src');
            if (realSrc) {
              el.src = realSrc;
              el.removeAttribute('data-src');
              imgObserver.current?.unobserve(el);
            }
          }
        });
      },
      { rootMargin }
    );

    return () => imgObserver.current?.disconnect();
  }, [rootMargin]);

  const observeImage = (el: HTMLImageElement | null) => {
    if (el) imgObserver.current?.observe(el);
  };

  return { observeImage };
}