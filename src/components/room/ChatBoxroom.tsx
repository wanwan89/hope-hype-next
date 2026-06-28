'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserBadge } from '@/lib/ui-utils';
import { getLevelBadgeHTML } from '@/lib/level-utils';
import './ChatBoxroom.css';

export default function ChatBox({ messages = [] }: { messages?: any[] }) {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div id="chat-box" className="chat-display">
      {/* Pesan sistem statis (info room) */}
      <div className="chat-msg-system-static">
        {t('system_rule_msg', 'Selalu jawab dengan sopan, santai, dan tetap menghargai orang lain ya!')}
      </div>

      {messages.map((msgData, idx) => {
        const isGift = msgData.username === "SISTEM_GIFT";
        const isSystem = msgData.username?.startsWith("SISTEM");

        // Pesan gift
        if (isGift) {
          return (
            <div key={msgData.id || idx} className="chat-msg-gift">
              <span>🎁 {msgData.text}</span>
            </div>
          );
        }

        // Pesan sistem biasa
        if (isSystem) {
          return (
            <div key={msgData.id || idx} className="chat-msg-system">
              <span>{msgData.text}</span>
            </div>
          );
        }

        // Pesan user biasa
        const userLvl = msgData.level || 1;

        return (
          <div key={msgData.id || idx} className="chat-msg-user">
            <img
              src={msgData.avatar_url || '/asets/png/profile.webp'}
              className="chat-user-avatar"
              onClick={() => window.openUserProfile?.(msgData.user_id)}
              alt="avatar"
            />
            <div className="chat-user-content">
              <div className="chat-user-header">
                <span
                  className="chat-username"
                  onClick={() => window.openUserProfile?.(msgData.user_id)}
                >
                  {msgData.username}
                </span>
                {/* Level badge (dari level-utils) */}
                <span dangerouslySetInnerHTML={{ __html: getLevelBadgeHTML(userLvl) }} />
                {/* Role badge (dari ui-utils) */}
                <span dangerouslySetInnerHTML={{ __html: getUserBadge(msgData.role || '') }} />
              </div>
              <div className="chat-text">{msgData.text}</div>
            </div>
          </div>
        );
      })}

      <div ref={endRef} style={{ height: '1px' }} />
    </div>
  );
}