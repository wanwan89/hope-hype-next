'use client';

import React, { useEffect, useRef, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserBadge } from '@/lib/ui-utils';
import { getLevelBadgeHTML } from '@/lib/level-utils';
import './ChatBoxroom.css';

// ==========================================
// SUB-KOMPONEN: Item Chat yang di-Memoize
// Meningkatkan performa secara drastis dengan mencegah 
// re-render pada pesan lama ketika pesan baru masuk.
// ==========================================
const ChatItem = memo(({ msgData }: { msgData: any }) => {
  const isGift = msgData.username === "SISTEM_GIFT";
  const isSystem = msgData.username?.startsWith("SISTEM");

  // 1. Render Pesan Gift
  if (isGift) {
    return (
      <div className="chat-msg-gift">
        <span>🎁 {msgData.text}</span>
      </div>
    );
  }

  // 2. Render Pesan Sistem
  if (isSystem) {
    return (
      <div className="chat-msg-system">
        <span>{msgData.text}</span>
      </div>
    );
  }

  // 3. Render Pesan User Biasa
  const userLvl = msgData.level || 1;

  return (
    <div className="chat-msg-user">
      {/* KIRI: Foto Profil */}
      <img
        src={msgData.avatar_url || '/asets/png/profile.webp'}
        className="chat-user-avatar"
        onClick={() => window.openUserProfile?.(msgData.user_id)}
        alt="avatar"
      />
      
      {/* KANAN: Konten Chat */}
      <div className="chat-user-content">
        {/* Header: Badge Level -> Username -> Role */}
        <div className="chat-user-header">
          {/* Level badge */}
          <span 
            className="chat-badge-wrapper"
            dangerouslySetInnerHTML={{ __html: getLevelBadgeHTML(userLvl) }} 
          />
          
          {/* Username */}
          <span
            className="chat-username"
            onClick={() => window.openUserProfile?.(msgData.user_id)}
          >
            {msgData.username}
          </span>
          
          {/* Role badge */}
          {msgData.role && (
            <span 
              className="chat-badge-wrapper"
              dangerouslySetInnerHTML={{ __html: getUserBadge(msgData.role) }} 
            />
          )}
        </div>
        
        {/* Teks Pesan */}
        <div className="chat-text">{msgData.text}</div>
      </div>
    </div>
  );
});

// Set display name untuk debugging React DevTools
ChatItem.displayName = 'ChatItem';


// ==========================================
// KOMPONEN UTAMA: ChatBox
// ==========================================
export default memo(function ChatBox({ messages = [] }: { messages?: any[] }) {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement>(null);

  // OPTIMASI PERFORMA & LIMIT HISTORI
  // Hanya menampilkan maksimal 50 pesan terakhir agar browser tidak lag.
  // (Ubah angka -50 menjadi -10 jika ingin benar-benar strict 10 pesan awal).
  const displayMessages = useMemo(() => {
    return messages.slice(-50);
  }, [messages]);

  // Auto-scroll ke bawah setiap ada pesan baru
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  return (
    <div id="chat-box" className="chat-display">
      {/* Pesan sistem statis (info room) */}
      <div className="chat-msg-system-static">
        {t('system_rule_msg', 'Selalu jawab dengan sopan, santai, dan tetap menghargai orang lain ya!')}
      </div>

      {/* Looping pesan yang sudah difilter & di-memoize */}
      {displayMessages.map((msgData, idx) => (
        <ChatItem key={msgData.id || idx} msgData={msgData} />
      ))}

      {/* Elemen jangkar untuk auto-scroll */}
      <div ref={endRef} style={{ height: '1px', flexShrink: 0 }} />
    </div>
  );
});
