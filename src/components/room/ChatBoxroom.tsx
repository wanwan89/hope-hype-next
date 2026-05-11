'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserBadge } from '@/lib/ui-utils';

// 🔥 IMPORT RUMUS SAKTI DARI FILE BARU 🔥
import { getLevelBadgeHTML } from '@/lib/level-utils'; 

import './ChatBoxroom.css';

export default function ChatBox({ messages = [] }: { messages?: any[] }) {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement>(null);

  // Auto Scroll instan ke bawah pas chat update
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🔥 FUNGSI getLevelColor DAN renderLevelBadge UDAH DIHAPUS DARI SINI BIAR GAK NYAMPAH 🔥

  return (
    <div id="chat-box" className="chat-display" style={{ flex: 1, overflowY: 'auto', padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '20px' }}>
      
      <div className="msg system" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '8px 14px', borderRadius: '16px', fontSize: '11px', textAlign: 'center', margin: '8px auto', width: 'fit-content' }}>
        {t('system_rule_msg', 'Selalu jawab dengan sopan, santai, dan tetap menghargai orang lain ya!')}
      </div>

      {messages.map((msgData, idx) => {
        const isGift = msgData.username === "SISTEM_GIFT";
        const isSystem = msgData.username.startsWith("SISTEM");

        if (isGift) {
          return (
            <div key={msgData.id || idx} style={{ background: 'linear-gradient(135deg, #ff4757, #1f3cff)', color: '#fff', padding: '6px 12px', borderRadius: '16px', fontSize: '11px', textAlign: 'center', margin: '0 auto', width: 'fit-content', fontWeight: 'bold' }}>
              <span>🎁 {msgData.text}</span>
            </div>
          );
        }

        if (isSystem) {
          return (
            <div key={msgData.id || idx} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', borderRadius: '16px', fontSize: '11px', textAlign: 'center', margin: '0 auto', width: 'fit-content' }}>
              <span>{msgData.text}</span>
            </div>
          );
        }

        // 🔥 AMBIL LEVEL YANG UDAH SINKRON DARI DATABASE/STATE 🔥
        const userLvl = msgData.level || 1;

        return (
          <div key={msgData.id || idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', width: '100%' }}>
            <img 
               src={msgData.avatar_url || '/asets/png/profile.webp'} 
               style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: '2px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }} 
               onClick={() => window.openUserProfile?.(msgData.user_id)} 
               alt="avatar"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                 <span onClick={() => window.openUserProfile?.(msgData.user_id)} style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 800, fontSize: '13px', cursor: 'pointer', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {msgData.username}
                 </span>
                 
                 {/* 🔥 PANGGIL FUNGSI getLevelBadgeHTML DARI FILE level-utils.ts 🔥 */}
                 <span dangerouslySetInnerHTML={{ __html: getLevelBadgeHTML(userLvl) }} />
                 
                 <span dangerouslySetInnerHTML={{ __html: getUserBadge(msgData.role || '') }} />
               </div>
               <div style={{ color: '#fff', fontSize: '14px', lineHeight: 1.4, wordWrap: 'break-word', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                 {msgData.text}
               </div>
            </div>
          </div>
        );
      })}
      
      <div ref={endRef} style={{ height: '1px' }} />
    </div>
  );
}
