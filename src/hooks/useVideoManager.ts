import { useEffect, useRef } from 'react';

export function useVideoManager(postIds: string[]) {
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            // Jika ada video lain yang bermain, pause dulu
            if (activeVideoRef.current && activeVideoRef.current !== video) {
              activeVideoRef.current.pause();
            }
            video.play().catch(() => {});
            activeVideoRef.current = video;
          } else {
            if (video === activeVideoRef.current) {
              video.pause();
              activeVideoRef.current = null;
            }
          }
        });
      },
      { threshold: [0.7] }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  const observeVideo = (el: HTMLVideoElement | null) => {
    if (el) observerRef.current?.observe(el);
  };

  const pauseAll = () => {
    if (activeVideoRef.current) {
      activeVideoRef.current.pause();
      activeVideoRef.current = null;
    }
  };

  return { observeVideo, pauseAll };
}