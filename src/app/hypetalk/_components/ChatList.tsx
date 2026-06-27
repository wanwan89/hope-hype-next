'use client';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, animate, useTransform } from 'framer-motion';
import ChatItem from './ChatItem';

// Import Lottie dan file JSON animasinya
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import trashAnimationData = require('@/assets/lottie/tempat-sampah.json'); 

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
  chat, isSelectionMode, isSelected, onPressStart, onPressEnd, onDeleteChat, handleOpenChat,
  typingStatus, mutedChats, onlineUsers, currentUser, handleAvatarClick, renderReadReceipt
}: any) => {
  const x = useMotionValue(0);
  const [isDeleted, setIsDeleted] = useState(false);
  
  // Referensi untuk mengontrol play/stop Lottie
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  const isGlobalOrActiveGroup = chat.type === 'global' || (chat.type === 'group' && chat.isMember);
  const canSwipe = !isSelectionMode && !isGlobalOrActiveGroup;

  // Fungsi untuk memutar animasi saat ditarik
  const handleDrag = (e: any, info: any) => {
    if (info.offset.x > 50 && lottieRef.current) {
      lottieRef.current.play();
    }
  };

  const handleDragEnd = (e: any, info: any) => {
    const screenMiddle = typeof window !== 'undefined' ? window.innerWidth * 0.4 : 150;
    
    if (info.offset.x > screenMiddle) {
      setIsDeleted(true);
      animate(x, window.innerWidth, { duration: 0.2 }).then(() => {
        if (onDeleteChat) onDeleteChat([chat.id]);
      });
    } else {
      animate(x, 0, { type: "spring", bounce: 0, duration: 0.4 });
      
      // Reset animasi jika swipe dibatalkan
      if (lottieRef.current) {
        lottieRef.current.stop();
      }
    }
  };

  if (isDeleted) return null; 

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      
      {/* Background Kotak Merah dengan Animasi Tong Sampah Lottie */}
      {canSwipe && (
        <div style={{
          position: 'absolute', inset: 0, backgroundColor: '#ef4444', 
          display: 'flex', alignItems: 'center', paddingLeft: '24px'
        }}>
          {/* Komponen Lottie */}
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

      {/* Konten Utama Chat List */}
      <motion.div
        style={{ 
          x, display: 'flex', alignItems: 'center', 
          backgroundColor: isSelected ? 'rgba(43, 147, 255, 0.15)' : 'var(--bg-main, transparent)', 
          position: 'relative' 
        }}
        drag={canSwipe ? "x" : false}
        dragConstraints={{ left: 0, right: typeof window !== 'undefined' ? window.innerWidth : 400 }}
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
        {/* CHECKBOX SELEKSI */}
        {isSelectionMode && !isGlobalOrActiveGroup && (
          <div className="chat-checkbox" style={{ padding: '0 0 0 16px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleOpenChat(chat)}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              border: isSelected ? 'none' : '2px solid #555', 
              backgroundColor: isSelected ? '#2b93ff' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease-in-out'
            }}>
              {isSelected && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
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
  isLoading, filteredChats, requestChats, searchQuery,
  typingStatus, mutedChats, onlineUsers, currentUser,
  handleOpenChat, handleAvatarClick, renderReadReceipt,
  isSelectionMode, selectedChats, onPressStart, onPressEnd, onDeleteChat
}) => {
  const router = useRouter();

  // --- LOGIKA PULL TO REFRESH ---
  const pullY = useMotionValue(0);
  const startY = useRef(0);
  const startX = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const isAtTop = typeof window !== 'undefined' && window.scrollY === 0;
    // Mengaktifkan fitur tarik hanya jika scroll kontainer berada di paling atas
    if (e.currentTarget.scrollTop === 0 && isAtTop) {
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current) return;

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    
    const diffY = currentY - startY.current;
    const diffX = Math.abs(currentX - startX.current);

    // Proteksi: Jika mendeteksi gerakan horizontal (X) lebih dominan, batalkan pull-down Y
    if (diffX > Math.abs(diffY) && pullY.get() === 0) {
      isPullingRef.current = false;
      return;
    }

    if (diffY > 0) {
      // Efek karet kembalul (rubber banding) maksimum tarikan 70px
      const resistance = Math.min(diffY * 0.4, 70);
      pullY.set(resistance);
      
      // Mencegah bounce bawaan browser/safari iOS saat menarik
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    // Jika tarikan melewati batas batas 55px, picu refresh data
    if (pullY.get() >= 55) {
      window.dispatchEvent(new Event('global-refresh'));
    }

    // Kembalikan posisi kontainer list ke semula dengan animasi spring halus
    animate(pullY, 0, { type: 'spring', bounce: 0, duration: 0.3 });
  };

  // Transformasi animasi untuk Icon Indikator Refresh
  const indicatorY = useTransform(pullY, [0, 60], [-35, 12]);
  const indicatorOpacity = useTransform(pullY, [0, 45], [0, 1]);
  const indicatorRotate = useTransform(pullY, [0, 60], [0, 360]);

  return (
    <main 
      className="tg-chat-list" 
      style={{ overflowX: 'hidden', position: 'relative' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* INDIKATOR ANIMASI PULL TO REFRESH */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          y: indicatorY,
          opacity: indicatorOpacity,
          pointerEvents: 'none',
          zIndex: 50,
        }}
      >
        <motion.span 
          className="material-icons"
          style={{
            rotate: indicatorRotate,
            color: '#2b93ff',
            fontSize: '28px',
          }}
        >
          autorenew
        </motion.span>
      </motion.div>

      {/* WRAPPER KONTEN UTAMA YANG TERDORONG KE BAWAH */}
      <motion.div style={{ y: pullY }}>
        {!isLoading && requestChats.length > 0 && !searchQuery && (
          <div className="message-request-banner" onClick={() => router.push('/hypetalk/requests')}>
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
          <>
            {[...Array(4)].map((_, index) => (
              <div key={index} className="tg-chat-item" style={{ pointerEvents: 'none' }}>
                <div className="tg-avatar skeleton-box" style={{ borderRadius: '50%' }}></div>
                <div className="tg-chat-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="skeleton-box" style={{ width: '40%', height: '16px' }}></div>
                    <div className="skeleton-box" style={{ width: '30px', height: '12px' }}></div>
                  </div>
                  <div className="skeleton-box" style={{ width: '70%', height: '14px' }}></div>
                </div>
              </div>
            ))}
          </>
        ) : (
          filteredChats.map(chat => (
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
      </motion.div>
    </main>
  );
};

export default React.memo(ChatList);
