'use client';

import React, { useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatMessageList({
  isLoading,
  t,
  messages,
  currentUser,
  setReplyTo,
  setMsgOptions,
  typingUser,
  refs,
  onEdit,
  onDelete,
  router,
  isSelectionMode,
  selectedMessages,
  toggleSelectMessage,
  setIsSelectionMode,
}: any) {
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (id: string) => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

    touchTimerRef.current = setTimeout(() => {
      setIsSelectionMode(true);
      if (!selectedMessages.includes(id)) {
        toggleSelectMessage(id);
      }
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  return (
    <main className="chat-messages">
      {isLoading ? (
        <div className="chat-loading-screen">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`skeleton-msg ${i % 2 === 0 ? 'left' : 'right'}`}>
              <div className="skeleton-avatar"></div>
              <div className="skeleton-bubble"></div>
            </div>
          ))}
          <div className="loading-chat-hint">{t('connecting_chat')}</div>
        </div>
      ) : (
        <>
          <div className="encryption-notice">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z" />
            </svg>
            <span>{t('encryption_notice')}</span>
          </div>

          {messages.map((msg: any, idx: number) => {
            // ✅ Deteksi pesan permintaan (asumsi: field is_request atau chat_type)
            const isMessageRequest = msg.is_request === true || msg.chat_type === 'request';

            // Jika ini adalah permintaan pesan, jangan render sebagai chat biasa
            if (isMessageRequest) {
              return (
                <div
                  key={msg.id}
                  className="message-request-entry"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    marginBottom: '8px',
                    border: '1px solid var(--bg-input)',
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push('/messages/requests')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-icons" style={{ color: 'var(--primary)' }}>mark_chat_unread</span>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                        Permintaan Pesan
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                        {msg.sender_name || 'Seseorang'} mengirim pesan baru
                      </p>
                    </div>
                  </div>
                  <span className="material-icons" style={{ color: 'var(--text-muted)' }}>chevron_right</span>
                </div>
              );
            }

            // --- Logika chat biasa ---
            const isUnread = msg.user_id !== currentUser?.id && msg.status !== 'read';
            let isFirstUnread = false;

            if (isUnread) {
              const prevMsg = messages[idx - 1];
              if (!prevMsg || prevMsg.status === 'read' || prevMsg.user_id === currentUser?.id) {
                isFirstUnread = true;
              }
            }

            let showDateSeparator = false;
            if (idx === 0) {
              showDateSeparator = true;
            } else {
              const prevMsg = messages[idx - 1];
              const currDate = new Date(msg.created_at).toDateString();
              const prevDate = new Date(prevMsg.created_at).toDateString();

              const prevTime = new Date(prevMsg.created_at).getTime();
              const currTime = new Date(msg.created_at).getTime();
              const diffInHours = (currTime - prevTime) / (1000 * 60 * 60);

              if (currDate !== prevDate || diffInHours >= 5) {
                showDateSeparator = true;
              }
            }

            const isMe = msg.user_id === currentUser?.id;

            return (
              <div
                key={msg.id}
                className={`message-wrapper ${isSelectionMode ? 'selection-mode-active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}
                onTouchStart={() => handleTouchStart(msg.id)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
              >
                {isSelectionMode && (
                  <div className="msg-checkbox-container" onClick={() => toggleSelectMessage(msg.id)} style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="msg-checkbox"
                      checked={selectedMessages.includes(msg.id)}
                      readOnly
                    />
                  </div>
                )}

                <div style={{ flex: 1, pointerEvents: isSelectionMode ? 'none' : 'auto' }}>
                  <MessageBubble
                    msg={msg}
                    currentUser={currentUser}
                    isMe={isMe}
                    onReply={setReplyTo}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isFirstUnread={isFirstUnread}
                    unreadCount={
                      isFirstUnread
                        ? messages.filter((m: any) => m.user_id !== currentUser?.id && m.status !== 'read').length
                        : 0
                    }
                    showDateSeparator={showDateSeparator}
                    router={router}
                    isSelectionMode={isSelectionMode}
                  />
                </div>
              </div>
            );
          })}

          {typingUser && (
            <div
              className="chat-message other"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: '8px',
                marginBottom: '8px',
                paddingLeft: '12px',
              }}
            >
              <img
                src={typingUser.avatar_url || '/asets/png/profile.webp'}
                alt="avatar"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  marginBottom: '2px',
                  border: '1px solid var(--border-color)',
                }}
              />
              <div
                className="content"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 'fit-content',
                  background: 'var(--bg-panel)',
                  padding: '8px 14px',
                  borderRadius: '14px 14px 14px 4px',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: 'var(--primary)',
                    marginBottom: '4px',
                  }}
                >
                  {typingUser.username}
                </div>
                <div
                  className="typing-bubble"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '14px' }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      background: 'var(--text-muted)',
                      borderRadius: '50%',
                      animation: 'typingBounce 1.4s infinite ease-in-out',
                    }}
                  ></span>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      background: 'var(--text-muted)',
                      borderRadius: '50%',
                      animation: 'typingBounce 1.4s infinite ease-in-out 0.2s',
                    }}
                  ></span>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      background: 'var(--text-muted)',
                      borderRadius: '50%',
                      animation: 'typingBounce 1.4s infinite ease-in-out 0.4s',
                    }}
                  ></span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={refs.scroll} />
    </main>
  );
}