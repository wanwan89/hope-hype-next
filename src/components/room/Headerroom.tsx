'use client';

import React, { useState, useEffect } from 'react';
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
  
  // State animasi dimulai dengan kondisi melebar (true)
  const [isFollowExpanded, setIsFollowExpanded] = useState(true);

  useEffect(() => {
    // 1. Setelah 3 detik pertama saat awal masuk, kecilkan tombol
    const initialTimer = setTimeout(() => {
      setIsFollowExpanded(false);
    }, 3000);

    // 2. Buat siklus: Setiap 15 detik, lebarkan tombol selama 3 detik lalu kecilkan lagi
    const cycleInterval = setInterval(() => {
      setIsFollowExpanded(true);
      
      setTimeout(() => {
        setIsFollowExpanded(false);
      }, 3000); // Tahan posisi melebar selama 3 detik
    }, 15000); // Dijalankan per 15 detik

    // Bersihkan timer saat komponen unmount
    return () => {
      clearTimeout(initialTimer);
      clearInterval(cycleInterval);
    };
  }, []);

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
    <div 
      className="vr-custom-header" 
      style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'transparent', 
        borderBottom: 'none', 
        padding: '12px 16px' 
      }}
    >
      <style>{`
        #top-gifters-container span { display: none !important; }
        #top-gifters-container img { 
          width: 18px !important; 
          height: 18px !important; 
          border: 1.5px solid #151515 !important; 
          margin-left: -6px !important;
        }
      `}</style>

      {/* BLOK KIRI: HOST INFO & ANIMATED FOLLOW BUTTON */}
      {/* Menggunakan motion.div dengan properti layout agar pill memanjang/memendek dengan mulus */}
      <motion.div 
        layout
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px', 
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '6px 10px 6px 6px',
          borderRadius: '30px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'none' /* Efek shadow dihilangkan agar lebih clean sesuai gambar */
        }}
      >
        <img
          src={roomInfo.ownerAvatar || '/asets/png/profile.webp'}
          className="vr-owner-avatar"
          onClick={() => window.openUserProfile?.(roomInfo.ownerId)}
          style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '50%', 
            objectFit: 'cover', 
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0 
          }}
          alt="Owner"
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', justifyContent: 'center', flexShrink: 0 }}>
          <h2 className="vr-room-name" style={{ 
            fontSize: '11px', 
            fontWeight: '800', 
            color: '#ffffff', 
            margin: 0, 
            textTransform: 'uppercase', 
            maxWidth: '90px', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>
            {roomInfo.name}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: '700' }}>
            <span className="material-icons" style={{ fontSize: '10px', color: '#ff4757' }}>favorite</span> 
            <span style={{ color: '#ffffff' }}>{totalTaps.toLocaleString()}</span>
          </div>
        </div>

        {/* Tombol Follow dengan siklus interval */}
        <AnimatePresence mode="wait">
          {roomInfo.ownerId && roomInfo.ownerId !== myUserId && !isFollowingHost && (
            <motion.button 
              layout /* Penting agar transisi lebarnya mendorong elemen lain dengan smooth */
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                width: isFollowExpanded ? '72px' : '24px', /* Ukuran statis agar tidak patah-patah */
                padding: isFollowExpanded ? '0 10px' : '0'
              }}
              exit={{ scale: 0, opacity: 0, width: 0, marginLeft: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              whileTap={{ scale: 0.9 }}
              className="vr-btn-follow" 
              onClick={handleFollow}
              style={{
                background: '#1f3cff',
                boxShadow: 'none', /* Efek shadow dihilangkan agar clean */
                border: 'none',
                color: '#fff',
                height: '24px', /* Diubah ke 24px agar bulat sempurna */
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: '800',
                cursor: 'pointer',
                marginLeft: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              {/* Animasi penggantian Teks agar tidak kaku */}
              <AnimatePresence mode="wait">
                <motion.span
                  key={isFollowExpanded ? 'expanded' : 'collapsed'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {isFollowExpanded ? '+ Follow' : '+'}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* BLOK KANAN: TOP GIFTERS & ONLINE COUNT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        
        {/* Pill 1: Top Gifter */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '4px 10px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'none', /* Mengikuti gaya clean */
            cursor: 'pointer'
          }}
          onClick={() => window.openTopGiftersModal?.()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path fill="#eab308" d="M22 8.162v.073c0 .86 0 1.291-.207 1.643s-.584.561-1.336.98l-.793.44c.546-1.848.729-3.834.796-5.532l.01-.221l.002-.052c.651.226 1.017.395 1.245.711c.283.393.283.915.283 1.958m-20 0v.073c0 .86 0 1.291.207 1.643s.584.561-1.336.98l.794.44c-.547-1.848-.73-3.834-.797-5.532l-.01-.221l-.001-.052c-.652.226-1.018.395-1.246.711C2 6.597 2 7.12 2 8.162"/>
            <path fill="#eab308" fillRule="evenodd" d="M16.377 2.347A26.4 26.4 0 0 0 12 2c-1.783 0-3.253.157-4.377.347c-1.139.192-1.708.288-2.184.874c-.475.586-.45 1.219-.4 2.485c.173 4.348 1.111 9.78 6.211 10.26V19.5H9.82a1 1 0 0 0-.98.804l-.19.946H6a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5h-2.65l-.19-.946a1 1 0 0 0-.98-.804h-1.43v-3.534c5.1-.48 6.039-5.911 6.211-10.26c.05-1.266.076-1.9-.4-2.485c-.476-.586-1.045-.682-2.184-.874" clipRule="evenodd"/>
          </svg>
          <div id="top-gifters-container" style={{ display: 'flex', alignItems: 'center' }}></div>
        </div>

        {/* Pill 2: Jumlah Penonton */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '4px 10px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'none', /* Mengikuti gaya clean */
            color: '#ffffff', 
            fontSize: '11px', 
            fontWeight: '800' 
          }}
        >
          <span id="online-count">{onlineUsers}</span>
        </div>
        
      </div>
    </div>
  );
}
