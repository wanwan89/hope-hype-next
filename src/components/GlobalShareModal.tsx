'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { showNotif } from '@/lib/ui-utils';
import { Copy, X, Send, Lock, Unlock, MessageSquareOff, MessageSquare, Trash2, Twitter, Download, Flag, Pin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import './GlobalShareModal.css';

// 🔥 IMPORT CUSTOM CONFIRM HOOK KAMU DI SINI
import { useConfirm } from '@/components/ConfirmProvider'; 

declare global {
  interface Window {
    openGlobalShare?: (
      url?: string, 
      title?: string, 
      text?: string, 
      name?: string, 
      postId?: string, 
      isOwner?: boolean,
      isPrivate?: boolean
    ) => void;
  }
}

export default function GlobalShareModal() {
  const { t } = useTranslation();
  
  // 🔥 INISIALISASI HOOK
  const { confirm } = useConfirm();

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const [shareData, setShareData] = useState({ 
    url: '', 
    title: '', 
    text: '', 
    postId: '', 
    isOwner: false,
    isPrivate: false 
  });

  const [postSettings, setPostSettings] = useState({
    isPinned: false,
    commentsDisabled: false
  });

  const [myId, setMyId] = useState<string | null>(null);
  const [mutuals, setMutuals] = useState<any[]>([]);
  const [isLoadingMutuals, setIsLoadingMutuals] = useState(false);

  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      // 🔥 FIX 1: Reset semua state saat ditutup agar data postingan tidak bocor/nyangkut ke postingan berikutnya
      setMutuals([]);
      setShareData({ url: '', title: '', text: '', postId: '', isOwner: false, isPrivate: false });
      setPostSettings({ isPinned: false, commentsDisabled: false });
    }, 300);
  }, []);

  useEffect(() => {
    window.openGlobalShare = (url, title, text, name, postId, isOwner, isPrivate) => {
      // 🔥 FIX 2: Penentuan URL Dinamis. 
      // Jika URL kosong tapi ada postId, arahkan ke route spesifik post tersebut.
      let finalUrl = url;
      if (!finalUrl) {
        finalUrl = postId ? `${window.location.origin}/post/${postId}` : window.location.href;
      }
      
      const finalTitle = title || 'HypeTalk';
      
      let finalText = text;
      if (!finalText) {
        finalText = name 
          ? t('share_profile_text', { name: name }) 
          : t('share_room_text', 'Ayo gabung di HypeTalk!'); 
      }

      setShareData({ 
        url: finalUrl, 
        title: finalTitle, 
        text: finalText,
        postId: postId || '',
        isOwner: !!isOwner,
        isPrivate: !!isPrivate
      });
      
      setIsOpen(true);
      fetchMutualFriends(); 
      
      if (postId) {
        fetchPostSettings(postId);
      }
    };

    return () => {
      delete window.openGlobalShare;
    };
  }, [t]);

  const fetchPostSettings = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('is_pinned, comments_disabled')
        .eq('id', id)
        .single();
        
      if (data && !error) {
        setPostSettings({
          isPinned: !!data.is_pinned,
          commentsDisabled: !!data.comments_disabled
        });
      }
    } catch (err) {
      console.error("Gagal load setting post:", err);
    }
  };

  const fetchMutualFriends = async () => {
    setIsLoadingMutuals(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const userId = session.user.id;
      setMyId(userId);

      const [followsRes, followersRes] = await Promise.all([
        supabase.from('followers').select('following_id').eq('follower_id', userId),
        supabase.from('followers').select('follower_id').eq('following_id', userId)
      ]);

      if (followsRes.data && followersRes.data) {
        const followingSet = new Set(followsRes.data.map(f => String(f.following_id)));
        const followerSet = new Set(followersRes.data.map(f => String(f.follower_id)));
        const mutualIds = [...followingSet].filter(x => followerSet.has(x));

        if (mutualIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', mutualIds).limit(15);
          setMutuals(profiles || []);
        }
      }
    } catch (err) { console.error(err); } finally { setIsLoadingMutuals(false); }
  };

  const sendToChat = async (friendId: string, friendName: string) => {
    if (!myId) return showNotif('Anda harus login', 'error');
    try {
      const ids = [myId, friendId].sort();
      const roomIdStr = `pv_${ids[0]}_${ids[1]}`;
      const messageContent = `Membagikan Tautan:\n${shareData.text}\n${shareData.url}`;

      const { error } = await supabase.from('messages').insert([{ room_id: roomIdStr, user_id: myId, message: messageContent, status: 'sent' }]);
      if (error) throw error;
      
      showNotif(`Dikirim ke ${friendName}`, 'success');
      closeModal();
    } catch (err) { showNotif('Gagal mengirim pesan', 'error'); }
  };

  const togglePrivacy = async () => {
    if (!shareData.postId) return;
    const newStatus = !shareData.isPrivate;
    
    setShareData(prev => ({ ...prev, isPrivate: newStatus }));
    
    try {
      const { error } = await supabase.from('posts').update({ is_private: newStatus }).eq('id', shareData.postId);
      if (error) throw error;
      showNotif(newStatus ? 'Postingan menjadi Privat' : 'Postingan menjadi Publik', 'success');
    } catch (err) { 
      setShareData(prev => ({ ...prev, isPrivate: !newStatus }));
      showNotif('Gagal merubah privasi', 'error'); 
    }
  };

  const togglePin = async () => {
    if (!shareData.postId || !myId) return;
    const newStatus = !postSettings.isPinned;

    try {
      if (newStatus === true) {
        const { count, error: countError } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', myId)
          .eq('is_pinned', true);

        if (countError) throw countError;

        if (count && count >= 3) {
          showNotif('Batas maksimal sematan! Lepas sematan lain terlebih dahulu.', 'warning');
          return; 
        }
      }

      setPostSettings(prev => ({ ...prev, isPinned: newStatus }));
      
      const { error } = await supabase.from('posts').update({ is_pinned: newStatus }).eq('id', shareData.postId);
      if (error) throw error;
      showNotif(newStatus ? 'Postingan disematkan' : 'Sematan dilepas', 'success');
      
    } catch (err) { 
      setPostSettings(prev => ({ ...prev, isPinned: !newStatus }));
      showNotif('Gagal merubah sematan', 'error'); 
    }
  };

  const toggleComments = async () => {
    if (!shareData.postId) return;
    const newStatus = !postSettings.commentsDisabled;
    
    setPostSettings(prev => ({ ...prev, commentsDisabled: newStatus }));
    
    try {
      const { error } = await supabase.from('posts').update({ comments_disabled: newStatus }).eq('id', shareData.postId);
      if (error) throw error;
      showNotif(newStatus ? 'Komentar dinonaktifkan' : 'Komentar diaktifkan', 'success');
    } catch (err) { 
      setPostSettings(prev => ({ ...prev, commentsDisabled: !newStatus }));
      showNotif('Gagal merubah pengaturan komentar', 'error'); 
    }
  };

  // 🔥 PERUBAHAN UTAMA DI SINI
  const deletePost = async () => {
    if (!shareData.postId) return;

    // Menutup modal share opsional, jika kamu ingin saat dialog konfirmasi muncul, modal share tertutup
    // closeModal(); 
    
    // Panggil custom confirm yang mengembalikan Promise<boolean>
    const isConfirmed = await confirm("Yakin ingin menghapus postingan ini secara permanen?");
    
    if (isConfirmed) {
      try {
        const { error } = await supabase.from('posts').delete().eq('id', shareData.postId);
        if (error) throw error;
        
        showNotif("Postingan berhasil dihapus", "success");
        closeModal();
        
        setTimeout(() => window.location.reload(), 400); 
      } catch (err) {
        showNotif("Gagal menghapus postingan", "error");
      }
    }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareData.url); showNotif(t('link_copied', 'Tautan berhasil disalin!'), 'success'); closeModal(); } catch (err) { showNotif('Gagal menyalin tautan', 'error'); }
  };

  const shareToWhatsApp = () => { window.open(`https://wa.me/?text=${encodeURIComponent(`${shareData.text}\n\n${shareData.url}`)}`, '_blank'); closeModal(); };
  const shareToTelegram = () => { window.open(`https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.text)}`, '_blank'); closeModal(); };
  const shareToTwitter = () => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`, '_blank'); closeModal(); };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .g-scroll-row { display: flex; overflow-x: auto; gap: 16px; padding: 5px 20px 20px 20px; scrollbar-width: none; scroll-snap-type: x mandatory; }
        .g-scroll-row::-webkit-scrollbar { display: none; }
        .g-scroll-item { display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 64px; scroll-snap-align: start; cursor: pointer; transition: transform 0.2s; }
        .g-scroll-item:active { transform: scale(0.9); }
        .g-friend-avatar { width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-card); }
        .g-item-name { font-size: 11px; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 64px; text-align: center; }
        .g-icon-circle { width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); color: var(--text-main); }
        .g-icon-circle.wa { background: #25D366; color: white; }
        .g-icon-circle.tg { background: #0088cc; color: white; }
        .g-icon-circle.tw { background: #1DA1F2; color: white; }
        .g-icon-circle.copy { background: #1f3cff; color: white; }
        .g-icon-circle.danger { background: rgba(255, 71, 87, 0.1); color: #ff4757; }
        .g-section-title { font-size: 13px; font-weight: 700; color: var(--text-muted); margin: 0 0 10px 20px; text-transform: uppercase; letter-spacing: 0.5px; }
        .g-divider { height: 1px; background: var(--border-card); margin: 5px 20px 15px 20px; }
        .skeleton-circle { width: 54px; height: 54px; border-radius: 50%; background: var(--border-card); animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 0.8; } 100% { opacity: 0.5; } }
      `}</style>

      <div className={`global-share-overlay ${!isClosing ? 'show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className={`global-share-sheet ${!isClosing ? 'slide-up' : ''}`} style={{ padding: '0', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="sheet-handle" onClick={closeModal} style={{ margin: '15px auto' }}></div>
          
          <div className="share-header" style={{ padding: '0 20px 15px 20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Bagikan</h3>
            <button className="close-share" onClick={closeModal} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', padding: '6px', color: 'var(--text-main)' }}><X size={20} /></button>
          </div>
          
          <div className="share-body" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            
            <div className="g-section-title">Kirim ke Teman</div>
            <div className="g-scroll-row">
              {isLoadingMutuals ? (
                Array(5).fill(0).map((_, i) => <div key={i} className="g-scroll-item"><div className="skeleton-circle"></div></div>)
              ) : mutuals.length > 0 ? (
                mutuals.map(friend => (
                  <div key={friend.id} className="g-scroll-item" onClick={() => sendToChat(friend.id, friend.username)}>
                    <img src={friend.avatar_url || '/asets/png/profile.webp'} className="g-friend-avatar" alt="av" />
                    <span className="g-item-name">{friend.username}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', paddingLeft: '10px' }}>Belum ada teman yang mengikuti balik.</div>
              )}
            </div>

            <div className="g-divider"></div>

            <div className="g-section-title">Bagikan & Tindakan</div>
            <div className="g-scroll-row">
              <div className="g-scroll-item" onClick={shareToWhatsApp}><div className="g-icon-circle wa"><img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WA" style={{ width: '28px' }} /></div><span className="g-item-name">WhatsApp</span></div>
              <div className="g-scroll-item" onClick={shareToTelegram}><div className="g-icon-circle tg"><Send size={24} /></div><span className="g-item-name">Telegram</span></div>
              <div className="g-scroll-item" onClick={shareToTwitter}><div className="g-icon-circle tw"><Twitter size={24} /></div><span className="g-item-name">Twitter (X)</span></div>
              <div className="g-scroll-item" onClick={copyLink}><div className="g-icon-circle copy"><Copy size={24} /></div><span className="g-item-name">Salin</span></div>
              <div className="g-scroll-item" onClick={() => { showNotif("Fitur unduh segera tersedia", "info"); closeModal(); }}><div className="g-icon-circle"><Download size={24} /></div><span className="g-item-name">Unduh</span></div>
              {!shareData.isOwner && (
                <div className="g-scroll-item" onClick={() => { showNotif("Laporan dikirim untuk ditinjau", "info"); closeModal(); }}><div className="g-icon-circle danger"><Flag size={24} /></div><span className="g-item-name" style={{ color: '#ff4757' }}>Laporkan</span></div>
              )}
            </div>

            {shareData.isOwner && shareData.postId && (
              <>
                <div className="g-divider"></div>
                <div className="g-section-title" style={{ color: '#1f3cff' }}>Alat Kreator</div>
                <div className="g-scroll-row">
                  
                  {/* Sematkan */}
                  <div className="g-scroll-item" onClick={togglePin}>
                    <div className={`g-icon-circle ${postSettings.isPinned ? 'copy' : ''}`}>
                      <Pin size={24} />
                    </div>
                    <span className="g-item-name">{postSettings.isPinned ? 'Lepas Sematan' : 'Sematkan'}</span>
                  </div>

                  {/* Privasi */}
                  <div className="g-scroll-item" onClick={togglePrivacy}>
                    <div className="g-icon-circle">
                      {shareData.isPrivate ? <Lock size={24} /> : <Unlock size={24} />}
                    </div>
                    <span className="g-item-name">{shareData.isPrivate ? 'Buka Privat' : 'Privat Post'}</span>
                  </div>

                  {/* Komentar */}
                  <div className="g-scroll-item" onClick={toggleComments}>
                    <div className={`g-icon-circle ${postSettings.commentsDisabled ? 'danger' : ''}`}>
                      {postSettings.commentsDisabled ? <MessageSquareOff size={24} /> : <MessageSquare size={24} />}
                    </div>
                    <span className="g-item-name" style={{ color: postSettings.commentsDisabled ? '#ff4757' : 'var(--text-main)' }}>
                      {postSettings.commentsDisabled ? 'Komentar Off' : 'Komentar On'}
                    </span>
                  </div>

                  {/* Hapus */}
                  <div className="g-scroll-item" onClick={deletePost}>
                    <div className="g-icon-circle danger"><Trash2 size={24} /></div>
                    <span className="g-item-name" style={{ color: '#ff4757' }}>Hapus</span>
                  </div>

                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
