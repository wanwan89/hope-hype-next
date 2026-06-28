'use client';

import React, { useEffect, useRef, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { getLevelBadgeHTML } from '@/lib/level-utils';
import './ChatBoxroom.css';

const ChatItem = memo(({ msgData }: { msgData: any }) => {
  const isSystem = msgData.type === 'system' || msgData.username?.startsWith("SISTEM");
  const isJoin = msgData.type === 'join';
  const isGift = msgData.type === 'gift';

  // 1. Render Pesan Ketika User Bergabung (Join)
  if (isJoin) {
    return (
      <div className="chat-msg-join" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        padding: '4px 8px',
        borderRadius: '4px',
        width: 'fit-content'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="#a1a1aa" d="M.975 7q0-2.5 1.763-4.262T7 .974V3Q5.35 3 4.175 4.175T3 7zM5.3 18.725Q3.025 16.45 3.025 13.25T5.3 7.775L7.05 6l.3.3q.725.725.725 1.762T7.35 9.826l-.35.35q-.3.3-.3.713t.3.712l.9.9q.65.65.65 1.575T7.9 15.65l1.075 1.075q1.1-1.1 1.1-2.637T8.95 11.425l-.55-.55q.65-.65.925-1.463T9.55 7.75l4.475-4.475q.3-.3.713-.3t.712.3t.3.712t-.3.713l-4.675 4.675l1.05 1.05l6.025-6q.3-.3.7-.3t.7.3t.3.7t-.3.7l-6 6.025l1.05 1.05l5.3-5.3q.3-.3.713-.3t.712.3t.3.713t-.3.712l-5.3 5.3l1.05 1.05l4.05-4.05q.3-.3.713-.3t.712.3t.3.713t-.3.712l-6 5.975Q13.975 21 10.775 21T5.3 18.725m11.7 4.3V21q1.65 0 2.825-1.175T21 17h2.025q0 2.5-1.763 4.263T17 23.025"/>
          </svg>
        </div>
        <div className="chat-text" style={{ color: '#a1a1aa', fontSize: '12px', fontStyle: 'italic' }}>
          <span style={{ fontWeight: 'bold' }}>{msgData.username}</span> telah bergabung
        </div>
      </div>
    );
  }

  // 2. Render Pesan Gift
  if (isGift) {
    return (
      <div className="chat-msg-gift" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1f3cff, #f59e0b)',
          color: '#ffffff',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          lineHeight: '1.4'
        }}>
          {msgData.text || `Telah mengirim ${msgData.giftName}`}
        </div>
      </div>
    );
  }

  // 3. Render Pesan Sistem
  if (isSystem) {
    return (
      <div className="chat-msg-system" style={{ display: 'flex', gap: '10px' }}>
         <div 
          className="chat-system-avatar-glass" 
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
            color: '#fbbf24'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512">
            <path fill="currentColor" d="M192 32c0 17.7 14.3 32 32 32c123.7 0 224 100.3 224 224c0 17.7 14.3 32 32 32s32-14.3 32-32C512 128.9 383.1 0 224 0c-17.7 0-32 14.3-32 32m0 96c0 17.7 14.3 32 32 32c70.7 0 128 57.3 128 128c0 17.7 14.3 32 32 32s32-14.3 32-32c0-106-86-192-192-192c-17.7 0-32 14.3-32 32m-96 16c0-26.5-21.5-48-48-48S0 117.5 0 144v224c0 79.5 64.5 144 144 144s144-64.5 144-144s-64.5-144-144-144h-16v96h16c26.5 0 48 21.5 48 48s-21.5 48-48 48s-48-21.5-48-48z"/>
          </svg>
        </div>
        <div className="chat-user-content" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="chat-text" style={{ color: '#fbbf24', fontSize: '13px', fontWeight: '500' }}>
            {msgData.text}
          </div>
        </div>
      </div>
    );
  }

  // 4. Render Pesan User Biasa
  const userLvl = msgData.level || 1;

  return (
    <div className="chat-msg-user" style={{ display: 'flex', gap: '10px' }}>
      <img
        src={msgData.avatar_url || '/asets/png/profile.webp'}
        className="chat-user-avatar"
        style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, objectFit: 'cover', cursor: 'pointer' }}
        onClick={() => window.openUserProfile?.(msgData.user_id)}
        alt="avatar"
      />
      <div className="chat-user-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="chat-user-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span 
            className="chat-badge-wrapper" 
            dangerouslySetInnerHTML={{ __html: getLevelBadgeHTML(userLvl) }} 
          />
          <span 
            className="chat-username" 
            style={{ fontWeight: '600', fontSize: '13px', color: '#f1f5f9', cursor: 'pointer' }}
            onClick={() => window.openUserProfile?.(msgData.user_id)}
          >
            {msgData.username}
          </span>
        </div>
        <div className="chat-text" style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '2px', wordBreak: 'break-word' }}>
          {msgData.text}
        </div>
      </div>
    </div>
  );
});

ChatItem.displayName = 'ChatItem';

export default memo(function ChatBox({ messages = [] }: { messages?: any[] }) {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- LOGIKA POSISI RULES ---
  // Ref untuk melacak pesan lama terakhir (saat komponen pertama dimuat)
  const initialLastMsg = useRef<any>(null);
  const hasSetInitial = useRef(false);

  useEffect(() => {
    // Jika pesan sudah ada dan kita belum set pesan terakhir
    if (!hasSetInitial.current && messages.length > 0) {
      initialLastMsg.current = messages[messages.length - 1];
      hasSetInitial.current = true;
    }
  }, [messages]);
  // ---------------------------

  const displayMessages = useMemo(() => {
    return messages.slice(-50);
  }, [messages]);

  useEffect(() => {
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [displayMessages]);

  // Komponen Sistem Rules agar rapi
  const RuleMessage = () => (
    <div className="chat-rule-msg-wrapper" style={{ display: 'flex', gap: '10px', width: '100%', margin: '4px 0' }}>
      <div 
        className="chat-system-avatar-glass" 
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
          color: '#a1a1aa' // [Fix] Warna Icon jadi abu-abu
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512">
          <path fill="currentColor" d="M192 32c0 17.7 14.3 32 32 32c123.7 0 224 100.3 224 224c0 17.7 14.3 32 32 32s32-14.3 32-32C512 128.9 383.1 0 224 0c-17.7 0-32 14.3-32 32m0 96c0 17.7 14.3 32 32 32c70.7 0 128 57.3 128 128c0 17.7 14.3 32 32 32s32-14.3 32-32c0-106-86-192-192-192c-17.7 0-32 14.3-32 32m-96 16c0-26.5-21.5-48-48-48S0 117.5 0 144v224c0 79.5 64.5 144 144 144s144-64.5 144-144s-64.5-144-144-144h-16v96h16c26.5 0 48 21.5 48 48s-21.5 48-48 48s-48-21.5-48-48z"/>
        </svg>
      </div>
      <div className="chat-user-content" style={{ display: 'flex', alignItems: 'center' }}>
        <div className="chat-text" style={{ 
          color: '#a1a1aa', // [Fix] Warna Teks jadi abu-abu
          fontSize: '12px', 
          fontWeight: '600',
          lineHeight: '1.4'
        }}>
          {t('system_rule_msg', 'Jangan gunakan kata kasar, hinaan, atau bullying dalam bentuk apa pun. Selalu jawab dengan sopan, santai, dan tetap menghargai orang lain ya!')}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .chat-badge-wrapper img, 
        .chat-badge-wrapper svg, 
        .chat-badge-wrapper span {
          height: 11px !important; 
          max-height: 11px !important;
          width: auto !important;
          object-fit: contain;
          display: inline-flex;
          align-items: center;
        }
        
        .chat-fade-mask {
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 100%);
          mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 100%);
          overflow-y: auto;
          scrollbar-width: none;
        }
        .chat-fade-mask::-webkit-scrollbar {
          display: none;
        }

        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chat-msg-user, .chat-msg-system, .chat-msg-join, .chat-msg-gift, .chat-rule-msg-wrapper {
          animation: chatSlideUp 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
          transform-origin: bottom center;
        }
      `}</style>

      <div 
        id="chat-box" 
        className="chat-fade-mask" 
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          height: '100%',
          padding: '10px 16px',
        }}
      >
        <div style={{ flex: '1 1 auto', minHeight: '20px' }}></div>

        {/* Jika belum ada pesan sama sekali, letakkan di paling atas */}
        {displayMessages.length === 0 && <RuleMessage />}

        {/* List Komentar */}
        {displayMessages.map((msgData, idx) => {
          // Cek apakah ini adalah komentar terlama terakhir 
          // Jika iya, sisipkan RuleMessage tepat di bawahnya
          const isLastOldMessage = hasSetInitial.current
            ? (msgData === initialLastMsg.current || (msgData.id && msgData.id === initialLastMsg.current?.id))
            : idx === displayMessages.length - 1;

          return (
            <React.Fragment key={msgData.id || idx}>
              <ChatItem msgData={msgData} />
              
              {/* [Fix] Muncul dinamis di bawah riwayat komentar lama */}
              {isLastOldMessage && <RuleMessage />}
            </React.Fragment>
          );
        })}

        <div ref={endRef} style={{ height: '2px', flexShrink: 0 }} />
      </div>
    </>
  );
});
