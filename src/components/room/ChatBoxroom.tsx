'use client';

import React, { useEffect, useRef, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { getLevelBadgeHTML } from '@/lib/level-utils';
import './ChatBoxroom.css';

const ChatItem = memo(({ msgData }: { msgData: any }) => {
  const isSystem = msgData.username?.startsWith("SISTEM");

  // Render Pesan Sistem
  if (isSystem) {
    return (
      <div className="chat-msg-system-wrapper" style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
        <div className="chat-msg-system" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          padding: '6px 16px',
          borderRadius: '20px',
          color: '#e2e8f0',
          fontSize: '11px',
          textAlign: 'center',
          width: 'fit-content',
          maxWidth: '85%'
        }}>
          {msgData.text}
        </div>
      </div>
    );
  }

  // Render Pesan User Biasa
  const userLvl = msgData.level || 1;

  return (
    <div className="chat-msg-user">
      <img
        src={msgData.avatar_url || '/asets/png/profile.webp'}
        className="chat-user-avatar"
        onClick={() => window.openUserProfile?.(msgData.user_id)}
        alt="avatar"
      />
      <div className="chat-user-content">
        <div className="chat-user-header">
          <span className="chat-badge-wrapper" dangerouslySetInnerHTML={{ __html: getLevelBadgeHTML(userLvl) }} />
          <span className="chat-username" onClick={() => window.openUserProfile?.(msgData.user_id)}>
            {msgData.username}
          </span>
          {/* Badge Role telah dihapus dari sini */}
        </div>
        <div className="chat-text">{msgData.text}</div>
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
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [displayMessages]);

  return (
    <>
      <style>{`
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
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-msg-user, .chat-msg-system-wrapper {
          animation: chatSlideUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>

      <div 
        id="chat-box" 
        className="chat-fade-mask" 
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '10px 16px',
        }}
      >
        <div style={{ flex: '1 1 auto', minHeight: '20px' }}></div>

        <div className="chat-msg-system-wrapper" style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
          <div className="chat-msg-system" style={{
            background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)',
            padding: '6px 16px', borderRadius: '20px', color: '#e2e8f0',
            fontSize: '11px', textAlign: 'center', width: 'fit-content', maxWidth: '85%'
          }}>
            {t('system_rule_msg', 'Selalu jawab dengan sopan, santai, dan tetap menghargai orang lain ya!')}
          </div>
        </div>

        {displayMessages.map((msgData, idx) => (
          <ChatItem key={msgData.id || idx} msgData={msgData} />
        ))}

        <div ref={endRef} style={{ height: '4px', flexShrink: 0 }} />
      </div>
    </>
  );
});
