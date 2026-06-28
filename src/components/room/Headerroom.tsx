'use client';

import { supabase as sb } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderRoomProps {
  roomInfo: {
    name: string;
    ownerAvatar: string;
    ownerName: string;
    ownerId: string;
  };
  onlineUsers: number;
  totalTaps: number;
  myUserId: string | null;
  isFollowingHost: boolean;
  setIsFollowingHost: (val: boolean) => void;
}

export default function HeaderRoom({
  roomInfo,
  onlineUsers,
  totalTaps,
  myUserId,
  isFollowingHost,
  setIsFollowingHost,
}: HeaderRoomProps) {
  
  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!myUserId || !roomInfo.ownerId) return;
    
    setIsFollowingHost(true);
    const { error } = await sb.from('followers').insert({ 
      follower_id: myUserId, 
      following_id: roomInfo.ownerId 
    });
    
    if (!error) {
      showNotif(`Mengikuti ${roomInfo.ownerName}`, 'success');
    } else {
      setIsFollowingHost(false);
      showNotif('Gagal mengikuti, coba lagi', 'error');
    }
  };

  return (
    <div className="vr-custom-header" style={{ background: 'transparent', borderBottom: 'none', padding: '12px 16px' }}>
      {/* CSS Overrider untuk menyembunyikan piala bawaan script panggung & merapikan avatar donor */}
      <style>{`
        #top-gifters-container span { display: none !important; }
        #top-gifters-container img { 
          width: 22px !important; 
          height: 22px !important; 
          border: 1.5px solid #151515 !important; 
          margin-left: -6px !important;
        }
      `}</style>

      {/* BLOK KIRI: HOST INFO & ANIMATED FOLLOW BUTTON */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '6px 14px 6px 8px',
          borderRadius: '30px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}
      >
        <img
          src={roomInfo.ownerAvatar || '/asets/png/profile.webp'}
          className="vr-owner-avatar"
          onClick={() => window.openUserProfile?.(roomInfo.ownerId)}
          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)', cursor: 'pointer' }}
          alt="Owner"
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <h2 className="vr-room-name" style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', margin: 0, textTransform: 'uppercase', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {roomInfo.name}
          </h2>
          {/* Stats Tap Layar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '700' }}>
            <span className="material-icons" style={{ fontSize: '12px', color: '#ff4757' }}>favorite</span> 
            <span style={{ color: '#ffffff' }}>{totalTaps.toLocaleString()}</span>
          </div>
        </div>

        {/* Tombol Follow dengan Animasi Pop-in Motion (Warna Biru) */}
        <AnimatePresence>
          {roomInfo.ownerId && roomInfo.ownerId !== myUserId && !isFollowingHost && (
            <motion.button 
              initial={{ scale: 0, opacity: 0, x: -10 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              className="vr-btn-follow" 
              onClick={handleFollow}
              style={{
                background: '#1f3cff',
                boxShadow: '0 2px 8px rgba(31, 60, 255, 0.4)',
                border: 'none',
                color: '#fff',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                marginLeft: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              + Follow
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* BLOK KANAN: TOP GIFTERS (DENGAN SVG KUSTOM) & ONLINE COUNT */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '6px 14px',
          borderRadius: '30px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}
      >
        {/* Kontainer Top Gifter */}
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
          onClick={() => window.openTopGiftersModal?.()}
        >
          {/* SVG Piala Kustom */}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path fill="#eab308" d="M22 8.162v.073c0 .86 0 1.291-.207 1.643s-.584.561-1.336.98l-.793.44c.546-1.848.729-3.834.796-5.532l.01-.221l.002-.052c.651.226 1.017.395 1.245.711c.283.393.283.915.283 1.958m-20 0v.073c0 .86 0 1.291.207 1.643s.584.561 1.336.98l.794.44c-.547-1.848-.73-3.834-.797-5.532l-.01-.221l-.001-.052c-.652.226-1.018.395-1.246.711C2 6.597 2 7.12 2 8.162"/>
            <path fill="#eab308" fill-rule="evenodd" d="M16.377 2.347A26.4 26.4 0 0 0 12 2c-1.783 0-3.253.157-4.377.347c-1.139.192-1.708.288-2.184.874c-.475.586-.45 1.219-.4 2.485c.173 4.348 1.111 9.78 6.211 10.26V19.5H9.82a1 1 0 0 0-.98.804l-.19.946H6a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5h-2.65l-.19-.946a1 1 0 0 0-.98-.804h-1.43v-3.534c5.1-.48 6.039-5.911 6.211-10.26c.05-1.266.076-1.9-.4-2.485c-.476-.586-1.045-.682-2.184-.874" clip-rule="evenodd"/>
          </svg>
          
          {/* Target injeksi foto profile donatur oleh fungsi parent page */}
          <div id="top-gifters-container" style={{ display: 'flex', alignItems: 'center', paddingLeft: '4px' }}></div>
        </div>

        {/* Garis Pembatas Halus */}
        <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.15)' }}></div>

        {/* Jumlah Penonton / Online Terbanyak di Pojok Kanan */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffffff', fontSize: '12px', fontWeight: '800' }}>
          <span className="material-icons" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>group</span>
          <span id="online-count">{onlineUsers}</span>
        </div>
      </div>
    </div>
  );
}
