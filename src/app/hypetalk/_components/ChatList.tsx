'use client';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, animate } from 'framer-motion';
import ChatItem from './ChatItem';
import RefreshableWrapper from '@/components/RefreshableWrapper';

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

// ══════════════════════════════════════════
// SwipeableChatRow – FULL FIX (Pan-Based + Anti Long-press Scroll)
// ══════════════════════════════════════════
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
  const [isDeleted, setIsDeleted] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  
  // Deteksi pergerakan jari untuk membatalkan long-press
  const touchStartPos = useRef({ x: 0, y: 0 });

  const isGlobalOrActiveGroup =
    chat.type === 'global' || (chat.type === 'group' && chat.isMember);
  const canSwipe = !isSelectionMode && !isGlobalOrActiveGroup;

  const threshold = 80; // px

  // --- Handlers Sentuh untuk Membatalkan Long-Press ---
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    onPressStart?.(chat);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    // Jika bergeser lebih dari 10px (horizontal atau vertikal), batalkan tekan-lama
    if (dx > 10 || dy > 10) {
      onPressEnd?.(); 
    }
  };

  // --- Pan handlers (Swipe Kiri/Kanan) ---
  const handlePanStart = () => {
    if (!canSwipe) return;
    onPressEnd?.(); // Ekstra proteksi membatalkan long press jika swipe terdeteksi framer motion
  };

  const handlePan = (_e: any, info: any) => {
    if (!canSwipe) return;
    
    const dx = info.offset.x;
    const dy = Math.abs(info.offset.y);

    // 1. Kunci mode swipe HANYA jika gesekan horizontal lebih dominan
    if (!isSwiping && dx > 10 && dx > dy * 1.5) {
      setIsSwiping(true);
      window.dispatchEvent(new Event('swipe-start')); // Beritahu RefreshableWrapper untuk diam
    }

    // 2. Update posisi jika sudah masuk mode swiping
    if (isSwiping) {
      // Math.max(0) mencegah geser ke kiri, Math.min(..., 150) membatasi maksimal geser 150px
      const currentX = Math.max(0, Math.min(dx, 150));
      setOffsetX(currentX);
      
      if (currentX > 40 && lottieRef.current) {
        lottieRef.current.play();
      }
    }
  };

  const handlePanEnd = (_e: any, info: any) => {
    // Jika tidak pernah swiping, abaikan
    if (!canSwipe || !isSwiping) {
      return;
    }

    const dx = info.offset.x;
    if (dx > threshold) {
      // Hapus
      setIsDeleted(true);
      animate(null, { /* dummy */ }, { duration: 0 }).then(() => {
        onDeleteChat?.([chat.id]);
      });
    } else {
      // Batal dan Kembali
      setOffsetX(0);
      lottieRef.current?.stop();
    }

    setIsSwiping(false);
    window.dispatchEvent(new Event('swipe-end'));
  };

  if (isDeleted) return null;

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      {/* Background merah di belakang item */}
      {canSwipe && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 24,
          }}
        >
          <div style={{ width: 40, height: 40 }}>
            <Lottie
              lottieRef={lottieRef}
              animationData={trashAnimationData}
              loop={false}
              autoplay={false}
            />
          </div>
        </div>
      )}

      {/* Item yang bisa diseret */}
      <motion.div
        style={{
          x: offsetX,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: isSelected ? 'rgba(31, 60, 255, 0.08)' : 'var(--bg-main)',
          position: 'relative',
          touchAction: 'pan-y', // Fix paling penting agar browser bisa scroll vertikal & swipe lancar
        }}
        animate={{ x: offsetX }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => {
          onPressEnd?.();
          if (!isSwiping) window.dispatchEvent(new Event('swipe-end'));
        }}
        onMouseDown={(e) => { if (e.button === 0) onPressStart?.(chat); }}
        onMouseUp={() => onPressEnd?.()}
        onMouseLeave={() => onPressEnd?.()}
      >
        {/* Checkbox seleksi (jika mode seleksi) */}
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
                backgroundColor: isSelected ? 'var(--primary-bg)' : 'transparent',
                borderColor: isSelected ? 'var(--primary-bg)' : '#d1d5db',
                scale: isSelected ? 1.05 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: '1.5px solid',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isSelected ? '0 2px 6px rgba(31, 60, 255, 0.3)' : 'none',
              }}
            >
              {isSelected && (
                <motion.svg
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </motion.svg>
              )}
            </motion.div>
          </div>
        )}

        {/* ChatItem */}
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

// ══════════════════════════════════════════
// ChatList
// ══════════════════════════════════════════
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
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="skeleton-box" style={{ width: '40%', height: 16 }} />
                    <div className="skeleton-box" style={{ width: 30, height: 12 }} />
                  </div>
                  <div className="skeleton-box" style={{ width: '70%', height: 14 }} />
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
