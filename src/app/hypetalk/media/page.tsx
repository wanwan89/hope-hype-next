'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import './MediaPage.css';

export default function MediaChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams?.get('userId');

  const [activeTab, setActiveTab] = useState<'media' | 'links'>('media');
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [medias, setMedias] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (targetUserId) {
      loadData();
    }
  }, [targetUserId]);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');
      const myId = session.user.id;

      // Ambil Profil Target
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', targetUserId).single();
      setTargetProfile(profile);

      // Bentuk ID Room Chat
      const ids = [myId, targetUserId].sort();
      const roomId = `pv_${ids[0]}_${ids[1]}`;

      // Ambil Pesan dari Database
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (messages) {
        const extractedMedias: any[] = [];
        const extractedLinks: any[] = [];

        messages.forEach(msg => {
          // Cari Gambar/Stiker
          if (msg.sticker_url) {
            extractedMedias.push({ id: msg.id, url: msg.sticker_url, time: msg.created_at, type: 'image' });
          }
          // Cari Link di dalam pesan
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const foundLinks = msg.message?.match(urlRegex);
          if (foundLinks) {
            foundLinks.forEach((link: string) => {
              extractedLinks.push({ id: msg.id, url: link, time: msg.created_at, text: msg.message });
            });
          }
        });

        setMedias(extractedMedias);
        setLinks(extractedLinks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="media-page-wrapper">
      <header className="media-header">
        {/* 🔥 FIX WARNA ICON BACK: dari 'white' ke 'var(--text-main)' 🔥 */}
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', display: 'flex', cursor: 'pointer' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>{targetProfile ? `Media dengan ${targetProfile.username}` : 'Memuat...'}</h2>
      </header>

      <div className="media-tabs">
        <div className={`m-tab ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')}>Media ({medias.length})</div>
        <div className={`m-tab ${activeTab === 'links' ? 'active' : ''}`} onClick={() => setActiveTab('links')}>Tautan ({links.length})</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Memuat data...</div>
        ) : activeTab === 'media' ? (
          medias.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Belum ada foto/stiker yang dibagikan.</div>
          ) : (
            <div className="media-grid">
              {medias.map(m => (
                <img key={m.id} src={m.url} className="media-item" alt="media" />
              ))}
            </div>
          )
        ) : (
          links.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Belum ada tautan yang dibagikan.</div>
          ) : (
             <div className="link-list">
               {links.map((l, i) => (
                 <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="link-item" style={{ textDecoration: 'none' }}>
                   <div className="link-icon"><span className="material-icons">link</span></div>
                   <div className="link-info">
                     <span className="link-url">{l.url}</span>
                     <span className="link-date">{new Date(l.time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                   </div>
                 </a>
               ))}
             </div>
          )
        )}
      </div>
    </div>
  );
}
