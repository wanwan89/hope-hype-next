'use client';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, animate } from 'framer-motion';
import ChatItem from './ChatItem';
import RefreshableWrapper from '@/components/RefreshableWrapper';

// Lottie & trash animation
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import trashAnimationData from '@/assets/lottie/tempat-sampah.json';

type Props = {
  isLoading: boolean;
  filteredChats: any[];
  requestChats: any[];
  searchQuery: string;
  typingStatus: Record<string, string>;
  mutedChats: Set<string>;
  onlineUsers: Set<string>;
  currentUser: any;
  handleOpenChat: (chat: any) => void;
  handleAvatarClick: (e: React.MouseEvent, chatId: string, chatType: string) => void;
  renderReadReceipt: (chat: any) => React.ReactNode;
  isSelectionMode?: boolean;
  selectedChats?: Set<string>;
  onPressStart?: (chat: any) => void;
  onPressEnd?: () => void;
  onDeleteChat?: (chatIds: string[]) => void;
};

const SwipeableChatRow = ({
  chat,
  isSelectionMode,
  isSelected,
  onPressStart,
  onPressEnd,
  onDeleteChat,
  handleOpenChat,
  typingStatus,
  mutedChats,
  onlineUsers,
  currentUser,
  handleAvatarClick,
  renderReadReceipt,
}: any) => {
  const x = useMotionValue(0);
  const [isDeleted, setIsDeleted] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  const isGlobalOrActiveGroup =
    chat.type === 'global' || (chat.type === 'group' && chat.isMember);
  const canSwipe = !isSelectionMode && !isGlobalOrActiveGroup;

  const handleDrag = (_e: any, info: any) => {
    if (info.offset.x > 50 && lottieRef.current) {
      lottieRef.current.play();
    }
  };

  const handleDragEnd = (_e: any, info: any) => {
    const screenMiddle = typeof window !== 'undefined' ? window.innerWidth * 0.4 : 150;

    if (info.offset.x > screenMiddle) {
      setIsDeleted(true);
      animate(x, window.innerWidth, { duration: 0.2 }).then(() => {
        onDeleteChat?.([chat.id]);
      });
    } else {
      animate(x, 0, { type: 'spring', bounce: 0, duration: 0.4 });
      lottieRef.current?.stop();
    }
  };

  if (isDeleted) return null;

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      {canSwipe && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '24px',
          }}
        >
          <div style={{ width: '40px', height: '40px' }}>
            <Lottie
              lottieRef={lottieRef}
              animationData={trashAnimationData}
              loop={false}
              autoplay={false}
            />
          </div>
        </div>
      )}

      <motion.div
        style={{
          x,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: isSelected
            ? 'rgba(31, 60, 255, 0.08)'
            : 'var(--bg-main, transparent)',
          position: 'relative',
        }}
        drag={canSwipe ? 'x' : false}
        dragConstraints={{
          left: 0,
          right: typeof window !== 'undefined' ? window.innerWidth : 400,
        }}
        dragElastic={0.1}
        onDrag={canSwipe ? handleDrag : undefined}
        onDragEnd={canSwipe ? handleDragEnd : undefined}
        onTouchStart={() => onPressStart?.(chat)}
        onTouchEnd={() => onPressEnd?.()}
        onTouchMove={() => onPressEnd?.()}
        onMouseDown={() => onPressStart?.(chat)}
        onMouseUp={() => onPressEnd?.()}
        onMouseLeave={() => onPressEnd?.()}
      >
        {isSelectionMode && !isGlobalOrActiveGroup && (
          <div
            className="chat-checkbox"
            style={{
              padding: '0 8px 0 16px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => handleOpenChat(chat)}
          >
            <motion.div
              initial={false}
              animate={{
                backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                borderColor: isSelected ? 'var(--primary)' : '#d1d5db',
                scale: isSelected ? 1.05 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: '1.5px solid',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isSelected
                  ? '0 2px 6px rgba(31, 60, 255, 0.3)'
                  : 'none',
              }}
            >
              {isSelected && (
                <motion.svg
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </motion.svg>
              )}
            </motion.div>
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0, pointerEvents: isSelectionMode ? 'none' : 'auto' }}>
          <ChatItem
            chat={chat}
            typingStatus={typingStatus}
            mutedChats={mutedChats}
            onlineUsers={onlineUsers}
            currentUser={currentUser}
            onOpenChat={handleOpenChat}
            onAvatarClick={handleAvatarClick}
            renderReadReceipt={renderReadReceipt}
          />
        </div>
      </motion.div>
    </div>
  );
};

const ChatList: React.FC<Props> = ({
  isLoading,
  filteredChats,
  requestChats,
  searchQuery,
  typingStatus,
  mutedChats,
  onlineUsers,
  currentUser,
  handleOpenChat,
  handleAvatarClick,
  renderReadReceipt,
  isSelectionMode,
  selectedChats,
  onPressStart,
  onPressEnd,
  onDeleteChat,
}) => {
  const router = useRouter();

  const handleRefresh = async () => {
    window.dispatchEvent(new Event('global-refresh'));
    await new Promise((resolve) => setTimeout(resolve, 800));
  };

  return (
    <RefreshableWrapper onRefresh={handleRefresh}>
      <main
        className="tg-chat-list"
        style={{ overflowX: 'hidden', position: 'relative', minHeight: '100dvh' }}
      >
        <div>
          {/* ✅ BANNER PERMINTAAN PESAN – tampil jika ada dan tidak sedang mencari */}
          {!isLoading && requestChats.length > 0 && !searchQuery && (
            <div
              className="message-request-banner"
              onClick={() => router.push('/hypetalk/requests')}
            >
              <div className="req-left">
                <span className="material-icons">mark_email_unread</span>
                <div className="req-text">
                  <h4>Permintaan Pesan</h4>
                  <p>{requestChats.length} pesan belum dibalas</p>
                </div>
              </div>
              <span className="material-icons arrow">chevron_right</span>
            </div>
          )}

          {isLoading ? (
            [...Array(4)].map((_, index) => (
              <div key={index} className="tg-chat-item" style={{ pointerEvents: 'none' }}>
                <div className="tg-avatar skeleton-box" style={{ borderRadius: '50%' }} />
                <div
                  className="tg-chat-info"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="skeleton-box" style={{ width: '40%', height: '16px' }} />
                    <div className="skeleton-box" style={{ width: '30px', height: '12px' }} />
                  </div>
                  <div className="skeleton-box" style={{ width: '70%', height: '14px' }} />
                </div>
              </div>
            ))
          ) : (
            filteredChats.map((chat) => (
              <SwipeableChatRow
                key={chat.id}
                chat={chat}
                isSelectionMode={isSelectionMode}
                isSelected={selectedChats?.has(chat.id)}
                onPressStart={onPressStart}
                onPressEnd={onPressEnd}
                onDeleteChat={onDeleteChat}
                handleOpenChat={handleOpenChat}
                typingStatus={typingStatus}
                mutedChats={mutedChats}
                onlineUsers={onlineUsers}
                currentUser={currentUser}
                handleAvatarClick={handleAvatarClick}
                renderReadReceipt={renderReadReceipt}
              />
            ))
          )}
        </div>
      </main>
    </RefreshableWrapper>
  );
};

export default React.memo(ChatList);