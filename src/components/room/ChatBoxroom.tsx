'use client';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserBadge } from '@/lib/ui-utils';
import './ChatBoxroom.css';

export default function ChatBox({ messages = [] }: { messages?: any[] }) {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function getLevelColor(level: number) {
    if (level >= 40) return ["#ff0844", "#ffb199"]; 
    if (level >= 30) return ["#00c6ff", "#0072ff"]; 
    if (level >= 20) return ["#f6d365", "#fda085"]; 
    if (level >= 10) return ["#89f7fe", "#66a6ff"]; 
    return ["#1f3cff", "#89f7fe"]; // Warna default Biru HypeTalk
  }

  function renderLevelBadge(lvl: number) {
    const [c1, c2] = getLevelColor(lvl);
    return `<span style="display:inline-flex;align-items:center;background:linear-gradient(135deg,${c1},${c2});color:#fff;font-size:9px;font-weight:900;padding:2px 6px;border-radius:12px;box-shadow:0 2px 4px rgba(0,0,0,0.3);"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>&nbsp;${lvl}</span>`;
  }

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

        // 🔥 FIX 4: AMBIL LEVEL YANG UDAH SINKRON DARI DATABASE/STATE 🔥
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
                 <span dangerouslySetInnerHTML={{ __html: renderLevelBadge(userLvl) }} />
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
