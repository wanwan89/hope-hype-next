'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils'; 
import './Story.css';

// Interface biar TypeScript gak rewel
interface Story {
  id: string;
  creator_id: string;
  image_url?: string;
  content?: string;
  audio_src?: string;
  title?: string;
  artist?: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

export default function StoryViewerPage() {
  const params = useParams();
  const router = useRouter();
  
  const storyId = params?.id as string;

  const [allUserStories, setAllUserStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // State Nangkap Blokir Audio
  const [audioError, setAudioError] = useState(false);
  
  // 🔥 STATE MODAL & INTERAKSI 🔥
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false); 
  
  // 🔥 STATE REPLY STORY 🔥
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // 🔥 STATE VIEWERS STORY 🔥
  const [viewers, setViewers] = useState<any[]>([]);
  const [isViewersModalOpen, setIsViewersModalOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const STORY_DURATION = 7000;

  // Initial Load
  useEffect(() => {
    if (storyId) {
      initMultiStory();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storyId]);

  // Logic pindah story: Handle like, audio, view, dan timer tiap ganti index
  useEffect(() => {
    if (allUserStories.length > 0) {
      const currentStory = allUserStories[currentIndex];
      checkIfLiked(currentStory.id);
      handleAudio(currentStory);
      fetchViewers(currentStory.id); // Ambil data orang yg udah liat
      recordView(currentStory.id);   // Catat kita ngeliat story ini
      resetTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, allUserStories]);

  // 🔥 Nahan timer & audio kalau Modal/Keyboard/Viewers lagi dibuka 🔥
  useEffect(() => {
    if (isMenuOpen || isReplying || isViewersModalOpen) {
      setIsPaused(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
    } else {
      setIsPaused(false);
      resetTimer();
      if (audioRef.current && !audioError) audioRef.current.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMenuOpen, isReplying, isViewersModalOpen]);

  async function initMultiStory() {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id || null);

    const { data: initStory } = await supabase
      .from('stories')
      .select('creator_id')
      .eq('id', storyId)
      .single();

    if (!initStory) return router.back();

    const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*, profiles(username, avatar_url)')
      .eq('creator_id', initStory.creator_id)
      .gte('created_at', timeLimit)
      .order('created_at', { ascending: true });

    if (error || !stories || stories.length === 0) return router.back();

    setAllUserStories(stories as any);
    
    const startIdx = stories.findIndex((s) => s.id === storyId);
    setCurrentIndex(startIdx === -1 ? 0 : startIdx);
    setLoading(false);
  }

  // ==========================================
  // 🔥 FUNGSI REKAM & AMBIL VIEWERS STORY 🔥
  // ==========================================
  async function recordView(sId: string) {
    if (!currentUserId) return;
    const currentStory = allUserStories[currentIndex];
    // Jangan catat kalau ini story sendiri
    if (currentStory && currentStory.creator_id === currentUserId) return;

    // Cek dulu udah pernah liat belum
    const { data } = await supabase.from('story_views')
      .select('id').match({ story_id: sId, user_id: currentUserId }).maybeSingle();
    
    if (!data) {
      await supabase.from('story_views').insert({ story_id: sId, user_id: currentUserId });
    }
  }

  async function fetchViewers(sId: string) {
    const currentStory = allUserStories[currentIndex];
    // Irit fetch: cuma ambil list viewers kalau ini story punya kita sendiri
    if (currentStory && currentStory.creator_id !== currentUserId) return;

    const { data, error } = await supabase
      .from('story_views')
      .select('user_id, profiles(id, username, avatar_url)')
      .eq('story_id', sId)
      .order('created_at', { ascending: false });

    if (data && !error) {
      const uniqueViewers = data.map((d: any) => d.profiles).filter(Boolean);
      setViewers(uniqueViewers);
    }
  }

  const handleAudio = (story: Story) => {
    if (audioRef.current) {
      if (story.audio_src) {
        audioRef.current.src = story.audio_src;
        audioRef.current.load();
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setAudioError(false);
            })
            .catch((err) => {
              console.warn("Autoplay diblokir browser:", err);
              setAudioError(true); 
            });
        }
      } else {
        audioRef.current.pause();
        audioRef.current.src = "";
        setAudioError(false);
      }
    }
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isPaused) {
      timerRef.current = setTimeout(nextStory, STORY_DURATION);
    }
  };

  const nextStory = () => {
    if (currentIndex < allUserStories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      router.back(); 
    }
  };

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(0); 
    }
  };

  async function checkIfLiked(sId: string) {
    if (!currentUserId) return;
    const { data } = await supabase
      .from('story_likes')
      .select('id')
      .match({ story_id: sId, user_id: currentUserId })
      .single();
    setIsLiked(!!data);
  }

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return alert("Login dulu bro!");
    
    const sId = allUserStories[currentIndex].id;
    const newLikeStatus = !isLiked;
    setIsLiked(newLikeStatus);

    if (newLikeStatus) {
      if (navigator.vibrate) navigator.vibrate(50);
      await supabase.from('story_likes').insert({ story_id: sId, user_id: currentUserId });
    } else {
      await supabase.from('story_likes').delete().match({ story_id: sId, user_id: currentUserId });
    }
  };

  const handleDeleteStory = async () => {
    const sId = allUserStories[currentIndex].id;
    setIsMenuOpen(false); 

    try {
      const { error } = await supabase.from('stories').delete().eq('id', sId);
      if (error) throw error;
      
      showNotif("Story berhasil dihapus", "success");
      router.back();
    } catch (err: any) {
      console.error(err);
      showNotif("Gagal menghapus story", "error");
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentUserId) return;

    const currentStory = allUserStories[currentIndex];
    const ids = [currentUserId, currentStory.creator_id].sort();
    const roomId = `pv_${ids[0]}_${ids[1]}`;

    let finalMessage = `Membalas ceritamu:\n"${replyText.trim()}"`;
    
    if (!currentStory.image_url && currentStory.content) {
      finalMessage = `Membalas ceritamu: "${currentStory.content}"\n\n👉 ${replyText.trim()}`;
    }

    try {
      await supabase.from('messages').insert([{
        room_id: roomId,
        user_id: currentUserId,
        message: finalMessage,
        sticker_url: currentStory.image_url || null, 
        status: 'sent'
      }]);
      
      showNotif('Balasan terkirim!', 'success');
      setReplyText('');
      setIsReplying(false); 
    } catch (err) {
      showNotif('Gagal mengirim balasan', 'error');
    }
  };

  if (loading) return <div className="story-full-viewer dark-bg"></div>;

  const currentStory = allUserStories[currentIndex];
  const isMyStory = currentUserId === currentStory.creator_id;

  return (
    <div className="story-full-viewer">
      
      {/* Tombol Darurat Putar Musik */}
      {audioError && currentStory.audio_src && !isMenuOpen && !isViewersModalOpen && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (audioRef.current) {
              audioRef.current.play();
              setAudioError(false);
            }
          }}
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 10050, background: 'rgba(0,0,0,0.65)', color: 'white', border: '1px solid rgba(255,255,255,0.3)',
            padding: '12px 24px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px',
            fontWeight: 800, fontSize: '14px', cursor: 'pointer', backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)', transition: 'transform 0.2s ease'
          }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>volume_off</span> 
          Ketuk untuk Putar Musik
        </button>
      )}

      {/* 🔥 FIX: Area Tap dibatasin tingginya biar ga numpuk input form & tombol bawah 🔥 */}
      <div className="tap-area" style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, bottom: '110px', zIndex: 10,
        pointerEvents: (isMenuOpen || isReplying || isViewersModalOpen) ? 'none' : 'auto' 
      }}>
        <div className="tap-left" onClick={prevStory} style={{ width: '30%', height: '100%', float: 'left' }}></div>
        <div className="tap-right" onClick={nextStory} style={{ width: '70%', height: '100%', float: 'right' }}></div>
      </div>

      {/* Progress Bars */}
      <div className="story-progress-container" style={{ position: 'absolute', top: '10px', left: 0, right: 0, zIndex: 10001, padding: '0 10px' }}>
        {allUserStories.map((_, idx) => (
          <div key={idx} className="bar-wrap">
            <div 
              className={`bar-inner ${idx === currentIndex ? 'active-anim' : ''}`}
              style={{ 
                transform: idx < currentIndex ? 'scaleX(1)' : 'scaleX(0)',
                animationDuration: idx === currentIndex ? `${STORY_DURATION}ms` : '0ms',
                animationPlayState: isPaused ? 'paused' : 'running'
              }}
            ></div>
          </div>
        ))}
      </div>

      {/* 🔥 FIX: Info User (Top) Dikasih absolute & z-index mantap 🔥 */}
      <div className="story-top-info" style={{ position: 'absolute', top: '25px', left: 0, right: 0, zIndex: 10000, pointerEvents: 'auto' }}>
        <div className="story-user" onClick={(e) => e.stopPropagation()}>
          <img 
            src={currentStory.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${currentStory.profiles?.username}`} 
            className="s-avatar" 
            alt="profile"
            onClick={() => router.push(`/data?id=${currentStory.creator_id}`)}
          />
          <div className="user-meta">
            <div className="user-meta-top">
              <span id="storyUser" onClick={() => router.push(`/data?id=${currentStory.creator_id}`)}>{currentStory.profiles?.username}</span>
              <span className="story-time">
                {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {currentStory.audio_src && (
              <div className="music-tag">
                <span className="material-icons" style={{ fontSize: '12px', color: 'white' }}>music_note</span>
                <div className="music-scroll-container">
                    <div className="music-scroll-text">
                        {currentStory.title || 'Musik Hype'} — {currentStory.artist || 'Unknown'}
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '15px' }}>
          {isMyStory && (
            <button 
              style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }}
            >
              <span className="material-icons" style={{ fontSize: '26px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>more_vert</span>
            </button>
          )}
          <button className="close-story" onClick={(e) => { e.stopPropagation(); router.back(); }} style={{ margin: 0 }}>✕</button>
        </div>
      </div>

      {/* Konten Utama */}
      <div className="story-display">
        {currentStory.image_url ? (
          <img src={currentStory.image_url} className="s-img" alt="Story content" />
        ) : (
          <div className="s-text">{currentStory.content}</div>
        )}
      </div>

      {/* 🔥 FIX: Bottom Info (Caption & Interaksi) Dikasih absolute & z-index mentok 🔥 */}
      <div className="story-bottom-info" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10000, pointerEvents: 'auto', paddingBottom: 'max(15px, env(safe-area-inset-bottom))' }}>
        <div className="footer-layout" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '0 15px' }}>
          
          {currentStory.content && (
            <div className="caption-container">
              <p className="story-caption">{currentStory.content}</p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
            
            {/* Input Reply */}
            {!isMyStory ? (
              <form 
                onSubmit={handleSendReply} 
                onClick={(e) => e.stopPropagation()} 
                style={{ flex: 1, display: 'flex', position: 'relative' }}
              >
                <input 
                  type="text" 
                  placeholder="Balas cerita ini..." 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsReplying(true)}
                  onBlur={() => setTimeout(() => setIsReplying(false), 200)}
                  onPointerDown={(e) => e.stopPropagation()} // Anti nyangkut di mobile
                  style={{ 
                    flex: 1, padding: '12px 18px', paddingRight: '45px', borderRadius: '30px', 
                    border: '1.5px solid rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.3)', 
                    color: 'white', outline: 'none', fontSize: '14px', backdropFilter: 'blur(5px)'
                  }}
                />
                <button 
                  type="submit" 
                  style={{ 
                    position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)',
                    background: replyText.trim() ? '#1f3cff' : 'transparent', 
                    border: 'none', color: 'white', cursor: replyText.trim() ? 'pointer' : 'default',
                    width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.3s ease'
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '18px', opacity: replyText.trim() ? 1 : 0.5 }}>send</span>
                </button>
              </form>
            ) : (
              // TOMBOL VIEWERS 
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsViewersModalOpen(true); }}
                  onPointerDown={(e) => e.stopPropagation()} // Anti nyangkut di mobile
                  style={{
                    background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white',
                    padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', fontSize: '14px', fontWeight: 600, backdropFilter: 'blur(5px)', transition: 'transform 0.2s'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span className="material-icons" style={{ fontSize: '18px' }}>visibility</span>
                  {viewers.length} Tayangan
                </button>
              </div>
            )}
            
            <button 
              className="story-like-btn" 
              onClick={toggleLike} 
              onPointerDown={(e) => e.stopPropagation()} 
              style={{ flexShrink: 0 }}
            >
              <svg viewBox="0 0 24 24" className={`heart-svg ${isLiked ? 'liked' : ''}`} style={{ width: '32px', height: '32px' }}>
                <path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z"/>
              </svg>
            </button>
          </div>

        </div>
      </div>

      <audio ref={audioRef} preload="auto" playsInline crossOrigin="anonymous" />

      {/* ==========================================
          🔥 MODAL OPSI STORY (SLIDE UP) 🔥
          ========================================== */}
      {isMenuOpen && (
        <div 
          style={{
            position: 'fixed', inset: 0, zIndex: 999999, 
            background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            animation: 'fadeInOverlay 0.3s ease'
          }}
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            style={{
              background: '#1a1a1a', width: '100%', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
              padding: '24px 20px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
              animation: 'slideUpModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1)',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()} 
          >
            <div style={{ width: '40px', height: '5px', background: '#333', borderRadius: '10px', margin: '0 auto 10px auto' }}></div>

            <button 
              onClick={handleDeleteStory}
              style={{
                width: '100%', padding: '16px', background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757', 
                border: 'none', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontSize: '16px', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span className="material-icons">delete</span> Hapus Story
            </button>

            <button 
              onClick={() => setIsMenuOpen(false)}
              style={{
                width: '100%', padding: '16px', background: '#333', color: 'white', 
                border: 'none', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: 600, cursor: 'pointer', transition: 'transform 0.2s'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          🔥 MODAL DAFTAR VIEWERS (SLIDE UP) 🔥
          ========================================== */}
      {isViewersModalOpen && (
        <div 
          style={{
            position: 'fixed', inset: 0, zIndex: 999999, 
            background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            animation: 'fadeInOverlay 0.3s ease'
          }}
          onClick={() => setIsViewersModalOpen(false)}
        >
          <div 
            style={{
              background: '#1a1a1a', width: '100%', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
              padding: '20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
              animation: 'slideUpModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1)',
              display: 'flex', flexDirection: 'column', maxHeight: '75vh'
            }}
            onClick={(e) => e.stopPropagation()} 
          >
            <div style={{ width: '40px', height: '5px', background: '#333', borderRadius: '10px', margin: '0 auto 15px auto' }}></div>
            
            <h3 style={{ color: 'white', margin: '0 0 15px 0', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <span className="material-icons">visibility</span> Tayangan
            </h3>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
              {viewers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                  <span className="material-icons" style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.5 }}>visibility_off</span>
                  <p style={{ margin: 0, fontSize: '14px' }}>Belum ada tayangan</p>
                </div>
              ) : (
                viewers.map(v => (
                  <div 
                    key={v.id} 
                    onClick={() => { setIsViewersModalOpen(false); router.push(`/data?id=${v.id}`); }}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 0', 
                      borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' 
                    }}
                  >
                    <img src={v.avatar_url || '/asets/png/profile.webp'} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '15px' }}>{v.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpModal {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

    </div>
  );
}
