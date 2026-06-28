'use client';
import React from 'react';
import { getUserBadge } from '@/lib/ui-utils';

type Props = {
  chat: any;
  typingStatus: Record<string, string>;
  mutedChats: Set<string>;
  onlineUsers: Set<string>;
  currentUser: any;
  onOpenChat: (chat: any) => void;
  onAvatarClick: (e: React.MouseEvent, chatId: string, chatType: string) => void;
  renderReadReceipt: (chat: any) => React.ReactNode;
};

const ChatItem: React.FC<Props> = ({
  chat,
  typingStatus,
  mutedChats,
  onlineUsers,
  currentUser,
  onOpenChat,
  onAvatarClick,
  renderReadReceipt,
}) => {
  const isMuted = mutedChats.has(chat.id);
  const isOnline = onlineUsers.has(chat.id);

  return (
    <div className="tg-chat-item" onClick={() => onOpenChat(chat)}>
      <div
        className="tg-avatar global-avatar"
        style={{ position: 'relative' }}
        onClick={(e) => onAvatarClick(e, chat.id, chat.type)}
      >
        {chat.type === 'global' ? (
          <span className="material-icons">public</span>
        ) : (
          <img
            src={chat.avatar || '/asets/png/profile.webp'}
            className="tg-avatar"
            alt="av"
          />
        )}

        {chat.type === 'private' && (
          <div
            style={{
              position: 'absolute',
              bottom: '0px',
              right: '0px',
              width: '13px',
              height: '13px',
              backgroundColor: isOnline ? '#2ecc71' : '#8a8b91',
              borderRadius: '50%',
              border: '2.5px solid var(--bg-main)',
              zIndex: 2,
            }}
          ></div>
        )}
      </div>

      <div
        className="tg-chat-info"
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          className="tg-chat-top"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <h4
            className="tg-name"
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-main)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {chat.name}
            {chat.type === 'group' && (
              <span
                className="material-icons"
                style={{ fontSize: '15px', color: 'var(--primary)', marginLeft: '4px' }} // ✅
              >
                groups
              </span>
            )}
            {chat.type === 'private' && (
              <span
                dangerouslySetInnerHTML={{
                  __html: getUserBadge(chat.role || 'user'),
                }}
                style={{ marginLeft: '4px' }}
              />
            )}
            {isMuted && (
              <span
                className="material-icons"
                style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  marginLeft: '6px',
                }}
              >
                notifications_off
              </span>
            )}
          </h4>
          <span
            className="tg-time"
            style={{
              fontSize: '11px',
              color: chat.unread > 0 ? 'var(--primary)' : 'var(--text-muted)', // ✅
              fontWeight: chat.unread > 0 ? 'bold' : 'normal',
              flexShrink: 0,
              marginLeft: '8px',
            }}
          >
            {chat.time}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            className="tg-preview-container"
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              minWidth: 0,
            }}
          >
            {!typingStatus[chat.id] && renderReadReceipt(chat)}
            <p
              className="tg-preview"
              style={{
                margin: 0,
                color: typingStatus[chat.id]
                  ? 'var(--primary)' // ✅
                  : 'var(--text-muted)',
                fontStyle: typingStatus[chat.id] ? 'italic' : 'normal',
                fontWeight: typingStatus[chat.id] ? 600 : 400,
                fontSize: '13px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {typingStatus[chat.id]
                ? `${typingStatus[chat.id]} sedang mengetik...`
                : chat.preview}
            </p>
          </div>
          {chat.unread > 0 && !isMuted && (
            <div
              style={{
                background: 'var(--primary)', // ✅ badge unread biru global
                color: 'white',
                borderRadius: '10px',
                padding: '0 6px',
                fontSize: '11px',
                fontWeight: 'bold',
                minWidth: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '8px',
                flexShrink: 0,
              }}
            >
              {chat.unread}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChatItem);