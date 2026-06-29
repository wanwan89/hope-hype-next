'use client';
import React from 'react';
import { getUserBadge } from '@/lib/ui-utils';

// --- SVG Grup Baru ---
const GroupIconSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ display: 'block' }}
  >
    <path d="M.25 10.215c0-3.969 3.805-6.965 8.202-6.965c3.498 0 6.6 1.884 7.74 4.65a.198.198 0 0 1-.172.269q-.559.046-1.106.158a.21.21 0 0 1-.229-.114c-.963-1.979-3.33-3.463-6.233-3.463c-3.835 0-6.702 2.568-6.702 5.464c0 1.565.814 3.01 2.183 4.031a.75.75 0 0 1 .3.602v.94l1.549-.43a.75.75 0 0 1 .411.003c.61.179 1.264.287 1.945.313a.21.21 0 0 1 .2.2q.028.64.167 1.238a.056.056 0 0 1-.053.068a9.6 9.6 0 0 1-2.47-.32l-2.297.638a.75.75 0 0 1-.951-.723v-1.563C1.224 13.965.25 12.201.25 10.214" />
    <path d="M6.855 8.258a1.065 1.065 0 1 1-2.13 0a1.065 1.065 0 0 1 2.13 0m4.258 1.065a1.065 1.065 0 1 0 0-2.13a1.065 1.065 0 0 0 0 2.13m3.433 5.854a.931.931 0 1 0 0-1.862a.931.931 0 0 0 0 1.862m5.456-.931a.931.931 0 1 1-1.863 0a.931.931 0 0 1 1.863 0" />
    <path fillRule="evenodd" d="M16.786 9.859c3.71 0 6.96 2.532 6.96 5.928c0 1.68-.81 2.945-2.066 4.001v1.244a.75.75 0 0 1-.95.723l-1.882-.523a8 8 0 0 1-2.058.262c-3.71 0-6.96-2.532-6.96-5.928s3.245-5.707 6.956-5.707m5.464 5.707c0-2.324-2.311-4.429-5.46-4.429s-5.46 2.105-5.46 4.429s2.312 4.428 5.46 4.428a6.6 6.6 0 0 0 1.847-.26a.75.75 0 0 1 .412-.003l1.131.314v-.62a.75.75 0 0 1 .302-.6c1.114-.832 1.768-2.001 1.768-3.26" clipRule="evenodd" />
  </svg>
);

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
      {/* Avatar / Ikon */}
      <div
        className={`tg-avatar ${chat.type === 'global' ? 'global-avatar' : ''} ${chat.type === 'group' ? 'group-avatar' : ''}`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        onClick={(e) => onAvatarClick(e, chat.id, chat.type)}
      >
        {chat.type === 'global' ? (
          <span className="material-icons">public</span>
        ) : chat.type === 'group' ? (
          <GroupIconSvg />
        ) : (
          <img
            src={chat.avatar || '/asets/png/profile.webp'}
            className="tg-avatar"
            alt="av"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          />
        )}

        {/* Indikator online untuk chat private */}
        {chat.type === 'private' && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 13,
              height: 13,
              backgroundColor: isOnline ? '#2ecc71' : '#8a8b91',
              borderRadius: '50%',
              border: '2.5px solid var(--bg-main)',
              zIndex: 2,
            }}
          />
        )}
      </div>

      {/* Info Chat */}
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
            marginBottom: 4,
          }}
        >
          <h4
            className="tg-name"
            style={{
              margin: 0,
              fontSize: 15,
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

            {/* Ikon grup — sekarang pakai SVG, warna mengikuti teks */}
            {chat.type === 'group' && (
              <span style={{ marginLeft: 4, display: 'inline-flex' }}>
                <GroupIconSvg />
              </span>
            )}

            {/* Badge VIP / centang — dari helper getUserBadge */}
            {chat.type === 'private' && (
              <span
                dangerouslySetInnerHTML={{ __html: getUserBadge(chat.role || 'user') }}
                style={{ marginLeft: 4 }}
              />
            )}

            {isMuted && (
              <span
                className="material-icons"
                style={{
                  fontSize: 14,
                  color: 'var(--text-muted)',
                  marginLeft: 6,
                }}
              >
                notifications_off
              </span>
            )}
          </h4>

          <span
            className="tg-time"
            style={{
              fontSize: 11,
              color: chat.unread > 0 ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: chat.unread > 0 ? 'bold' : 'normal',
              flexShrink: 0,
              marginLeft: 8,
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
                color: typingStatus[chat.id] ? 'var(--primary)' : 'var(--text-muted)',
                fontStyle: typingStatus[chat.id] ? 'italic' : 'normal',
                fontWeight: typingStatus[chat.id] ? 600 : 400,
                fontSize: 13,
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
                background: 'var(--primary-bg)',   // ✅ latar biru tetap
                color: 'white',
                borderRadius: 10,
                padding: '0 6px',
                fontSize: 11,
                fontWeight: 'bold',
                minWidth: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 8,
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