'use client';

import React from 'react';
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
            const isSelected = selectedMessages.includes(msg.id);

            return (
              <div
                key={msg.id}
                className={`message-wrapper ${isSelectionMode ? 'selection-mode-active' : ''}`}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  width: '100%',
                  cursor: isSelectionMode ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleSelectMessage(msg.id);
                  }
                }}
              >
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
                    isSelected={isSelected}
                    onSelect={(id: string) => {
                      if (!isSelectionMode) {
                        setIsSelectionMode(true);
                        if (!selectedMessages.includes(id)) {
                          toggleSelectMessage(id);
                        }
                      } else {
                        toggleSelectMessage(id);
                      }
                    }}
                    onSelectAll={() => {
                      setIsSelectionMode(true);
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* PERUBAHAN: TYPING INDICATOR HANYA BERUPA ANIMASI LOADER */}
          {typingUser && (
            <div style={{ paddingLeft: '16px', marginBottom: '16px', marginTop: '8px' }}>
              <div className="loader"></div>
            </div>
          )}
        </>
      )}
      <div ref={refs.scroll} />
    </main>
  );
}
