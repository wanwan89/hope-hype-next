'use client';

import React, { useEffect, useRef, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { getLevelBadgeHTML } from '@/lib/level-utils';
import './ChatBoxroom.css';

const ChatItem = memo(({ msgData }: { msgData: any }) => {
  // Asumsi tipe pesan untuk Sistem dan Join, bisa sesuaikan dengan struktur API aslinya
  const isSystem = msgData.type === 'system' || msgData.username?.startsWith("SISTEM");
  const isJoin = msgData.type === 'join'; 

  // 1. Render Pesan Ketika User Bergabung (Join)
  if (isJoin) {
    return (
      <div className="chat-msg-join" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <path fill="#666666" d="M.975 7q0-2.5 1.763-4.262T7 .974V3Q5.35 3 4.175 4.175T3 7zM5.3 18.725Q3.025 16.45 3.025 13.25T5.3 7.775L7.05 6l.3.3q.725.725.725 1.762T7.35 9.826l-.35.35q-.3.3-.3.713t.3.712l.9.9q.65.65.65 1.575T7.9 15.65l1.075 1.075q1.1-1.1 1.1-2.637T8.95 11.425l-.55-.55q.65-.65.925-1.463T9.55 7.75l4.475-4.475q.3-.3.713-.3t.712.3t.3.712t-.3.713l-4.675 4.675l1.05 1.05l6.025-6q.3-.3.7-.3t.7.3t.3.7t-.3.7l-6 6.025l1.05 1.05l5.3-5.3q.3-.3.713-.3t.712.3t.3.713t-.3.712l-5.3 5.3l1.05 1.05l4.05-4.05q.3-.3.713-.3t.712.3t.3.713t-.3.712l-6 5.975Q13.975 21 10.775 21T5.3 18.725m11.7 4.3V21q1.65 0 2.825-1.175T21 17h2.025q0 2.5-1.763 4.263T17 23.025"/>
          </svg>
        </div>
        <div className="chat-text" style={{ color: '#a1a1aa', fontSize: '13px', fontStyle: 'italic' }}>
          <span style={{ fontWeight: 'bold' }}>{msgData.username}</span> sudah bergabung
        </div>
      </div>
    );
  }

  // 2. Render Pesan Sistem (seperti komen user tapi tanpa username + SVG abu glass)
  if (isSystem) {
    return (
      <div className="chat-msg-system" style={{ display: 'flex', gap: '10px' }}>
        <div 
          className="chat-system-avatar-glass" 
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
            color: '#e2e8f0'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512">
            <path fill="currentColor" d="M192 32c0 17.7 14.3 32 32 32c123.7 0 224 100.3 224 224c0 17.7 14.3 32 32 32s32-14.3 32-32C512 128.9 383.1 0 224 0c-17.7 0-32 14.3-32 32m0 96c0 17.7 14.3 32 32 32c70.7 0 128 57.3 128 128c0 17.7 14.3 32 32 32s32-14.3 32-32c0-106-86-192-192-192c-17.7 0-32 14.3-32 32m-96 16c0-26.5-21.5-48-48-48S0 117.5 0 144v224c0 79.5 64.5 144 144 144s144-64.5 144-144s-64.5-144-144-144h-16v96h16c26.5 0 48 21.5 48 48s-21.5 48-48 48s-48-21.5-48-48z"/>
          </svg>
        </div>
        <div className="chat-user-content" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="chat-text" style={{ color: '#e2e8f0', fontSize: '13px' }}>
            {msgData.text}
          </div>
        </div>
      </div>
    );
  }

  // 3. Render Pesan User Biasa
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

  const displayMessages = useMemo(() => {
    return messages.slice(-50);
  }, [messages]);

  useEffect(() => {
    // Memastikan auto-scroll ke bawah berjalan mulus
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [displayMessages]);

  return (
    <>
      <style>{`
        /* Memperbaiki tinggi badge level agar seimbang dengan username */
        .chat-badge-wrapper img, 
        .chat-badge-wrapper svg, 
        .chat-badge-wrapper span {
          height: 14px !important;
          max-height: 14px !important;
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

        /* Animasi pop dari bawah */
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-msg-user, .chat-msg-system, .chat-msg-join {
          animation: chatSlideUp 0.3s ease-out forwards;
        }
      `}</style>

      <div 
        id="chat-box" 
        className="chat-fade-mask" 
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px', /* Perbaikan jarak rapikan antar komentar */
          height: '100%',
          padding: '10px 16px',
        }}
      >
        {/* Pendorong flex untuk menahan komentar agar selalu menempel dan muncul dari dasar (bawah) */}
        <div style={{ flex: '1 1 auto', minHeight: '20px' }}></div>

        {/* Aturan Global / Pengumuman Teratas */}
        <div className="chat-rule-msg-wrapper" style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '0 0 4px 0' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)',
            padding: '8px 16px', borderRadius: '20px', color: '#e2e8f0',
            fontSize: '11px', textAlign: 'center', width: 'fit-content', maxWidth: '85%'
          }}>
            {t('system_rule_msg', 'Jangan gunakan kata kasar, hinaan, atau bullying dalam bentuk apa pun. Selalu jawab dengan sopan, santai, dan tetap menghargai orang lain ya!')}
          </div>
        </div>

        {/* List Komentar */}
        {displayMessages.map((msgData, idx) => (
          <ChatItem key={msgData.id || idx} msgData={msgData} />
        ))}

        <div ref={endRef} style={{ height: '2px', flexShrink: 0 }} />
      </div>
    </>
  );
});
