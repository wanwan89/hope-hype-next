'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

// Helper bawaan lu untuk optimasi gambar Cloudinary
const getOptimizedImage = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('res.cloudinary.com') && !cleanUrl.includes('f_auto')) {
    return cleanUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_300,h_400,c_fill/');
  }
  return cleanUrl;
};

export default function DraftsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDrafts = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        window.dispatchEvent(new CustomEvent('openLogin'));
        router.push('/');
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('creator_id', session.user.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Gagal load draf:", error);
        showNotif("Gagal memuat draf", "error");
      } else {
        setDrafts(data || []);
      }
      setIsLoading(false);
    };

    fetchDrafts();
  }, [router]);

  // 🔥 FUNGSI HAPUS DRAF LANGSUNG 🔥
  const handleDeleteDraft = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Mencegah trigger klik card untuk edit
    if (confirm("Yakin ingin menghapus draf ini secara permanen?")) {
      try {
        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) throw error;
        
        setDrafts(prev => prev.filter(d => d.id !== id));
        showNotif("Draf berhasil dihapus", "success");
      } catch (err) {
        console.error(err);
        showNotif("Gagal menghapus draf", "error");
      }
    }
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-main)', color: 'var(--text-main)', paddingBottom: '40px' }}>
      
      {/* HEADER (sticky, solid, tanpa glass) */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-main)', display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', borderBottom: '1px solid var(--border-card)' }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>Draf Postingan</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{drafts.length} item tersimpan</p>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px' }}>
        
        {/* LOADING STATE */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} style={{ aspectRatio: '3/4', background: 'var(--bg-secondary)', borderRadius: '12px', animation: 'pulse 1.5s infinite alternate' }} />
            ))}
          </div>
        ) : drafts.length === 0 ? (
          
          /* EMPTY STATE */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ background: 'var(--bg-secondary)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--border-card)' }}>
              <span className="material-icons" style={{ fontSize: '32px', color: 'var(--text-muted)' }}>inventory_2</span>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--text-main)', fontWeight: 800 }}>Draf Kosong</h3>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>Kamu tidak memiliki draf postingan saat ini.</p>
          </div>
        ) : (
          
          /* GRID LIST DRAF */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <AnimatePresence>
              {drafts.map(draft => {
                const images = draft.image_url ? draft.image_url.split(',') : [];
                const coverUrl = images.length > 0 ? images[0].trim() : null;
                const isVideo = !!draft.video_url;

                return (
                  <motion.div
                    key={draft.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={() => router.push(`/create?draft_id=${draft.id}`)} // 🔥 KEMBALI EDIT
                    style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border-card)' }}
                  >
                    {/* Media Preview */}
                    {coverUrl || isVideo ? (
                      <>
                        {coverUrl ? (
                          <img src={getOptimizedImage(coverUrl)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-icons" style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '30px' }}>videocam</span>
                          </div>
                        )}
                        {isVideo && (
                          <span className="material-icons" style={{ position: 'absolute', top: '8px', left: '8px', color: '#fff', fontSize: '18px', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>play_circle_filled</span>
                        )}
                      </>
                    ) : (
                      /* Text-only preview */
                      <div style={{ width: '100%', height: '100%', padding: '10px', fontSize: '11px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: 'var(--text-main)', background: 'var(--bg-secondary)' }}>
                        <div style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4', wordBreak: 'break-word', fontWeight: 600 }}>
                          {draft.bio || "Teks Kosong"}
                        </div>
                        <span className="material-icons" style={{ color: 'var(--text-muted)', fontSize: '16px' }}>article</span>
                      </div>
                    )}

                    {/* Tombol Category Badge (Adaptif) */}
                    <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'var(--bg-main)', border: '1px solid var(--border-card)', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, color: 'var(--text-main)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      {draft.category || 'Karya'}
                    </div>

                    {/* 🔥 TOMBOL SAMPAH (HAPUS) 🔥 */}
                    <button
                      onClick={(e) => handleDeleteDraft(e, draft.id)}
                      style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', transition: 'transform 0.1s' }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-icons" style={{ fontSize: '14px' }}>delete</span>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Tambahan style global buat efek pulsate skeleton */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}