// components/CommentInputBar.tsx
'use client';

import { getOptimizedImage } from '@/lib/comment-utils';
import { useTranslation } from 'react-i18next';

interface CommentInputBarProps {
  inputRef: React.RefObject<HTMLInputElement>;
  inputValue: string;
  isSubmitting: boolean;
  showMentions: boolean;
  mentionResults: any[];
  showStickers: boolean;
  stickers: any[];
  stickerQuery: string;
  replyToUsername: string | null;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSelectMention: (username: string) => void;
  setStickerQuery: (val: string) => void;
  handleSendSticker: (url: string) => void;
  toggleStickers: () => void;
  handleGiftClick: () => void;
}

export default function CommentInputBar({
  inputRef, inputValue, isSubmitting, showMentions, mentionResults,
  showStickers, stickers, stickerQuery, replyToUsername,
  handleInputChange, handleKeyDown, handleSelectMention, setStickerQuery,
  handleSendSticker, toggleStickers, handleGiftClick
}: CommentInputBarProps) {
  const { t } = useTranslation();

  const getPlaceholder = () => {
    if (isSubmitting) return t('sending');
    if (replyToUsername) return t('replying_to', { username: replyToUsername });
    return t('write_comment');
  };

  return (
    <div className="comment-input-wrap" style={{ position: 'relative' }}>
      {showMentions && (
        <div className="mention-popup">
          {mentionResults.length > 0 ? (
            mentionResults.map(user => (
              <div key={user.id} className="mention-item" onClick={() => handleSelectMention(user.username)}>
                <img src={getOptimizedImage(user.avatar_url) || '/asets/png/profile.webp'} loading="lazy" alt={user.username} />
                <div className="mention-info">
                  <span className="mention-name">{user.username}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="mention-empty">Tidak ditemukan...</div>
          )}
        </div>
      )}

      {showStickers && (
        <div className="sticker-popup-container">
          <input 
            type="text" 
            className="sticker-search" 
            placeholder="Cari stiker Giphy..." 
            value={stickerQuery}
            onChange={(e) => setStickerQuery(e.target.value)}
            autoFocus
          />
          <div className="sticker-grid">
            {stickers.length > 0 ? (
              stickers.map(st => (
                <img 
                  key={st.id} 
                  src={st.images.fixed_height_small.url} 
                  className="sticker-item" 
                  alt="sticker" 
                  onClick={() => handleSendSticker(st.images.fixed_height.url)}
                />
              ))
            ) : (
              <div className="sticker-empty">Memuat...</div>
            )}
          </div>
        </div>
      )}

      <div className="input-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input 
          ref={inputRef}
          type="text" 
          className="comment-input" 
          placeholder={getPlaceholder()} 
          autoComplete="off"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (showMentions && e.key === "Enter") {
              e.preventDefault();
              if (mentionResults.length > 0) handleSelectMention(mentionResults[0].username);
            } else {
              handleKeyDown(e);
            }
          }}
          disabled={isSubmitting}
          style={{ width: '100%', paddingRight: '75px' }} 
        />
        
        <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="modal-sticker-btn" 
            aria-label="Kirim Stiker" 
            onClick={toggleStickers}
            style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, display: 'flex', cursor: 'pointer' }}
          >
            <svg viewBox="0 0 24 24" style={{ color: showStickers ? 'var(--primary)' : 'var(--text-main)', fill: 'currentColor', width: '22px', height: '22px' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-9c.83 0 1.5-.67 1.5-1.5S10.33 8 9.5 8 8 8.67 8 9.5 8.67 11 9.5 11zm5 0c.83 0 1.5-.67 1.5-1.5S15.33 8 14.5 8 13 8.67 13 9.5 13.67 11 14.5 11zm-2.5 4.5c1.76 0 3.31-.89 4.22-2.25.18-.27-.05-.62-.37-.56-2.55.51-5.16.51-7.7 0-.32-.06-.55.29-.37.56.91 1.36 2.46 2.25 4.22 2.25z"/>
            </svg>
          </button>

          <button 
            className="modal-gift-btn" 
            aria-label="Kirim Hadiah" 
            onClick={handleGiftClick}
            style={{ position: 'static', background: 'transparent', border: 'none', padding: 0, margin: 0, display: 'flex', cursor: 'pointer' }}
          >
            <svg viewBox="0 0 24 24" style={{ color: 'var(--text-main)', fill: 'currentColor', width: '22px', height: '22px' }}><path d="M20 7h-2.18A3 3 0 0 0 12 3a3 3 0 0 0-5.82 4H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-8-2a1 1 0 0 1 1 1v1h-2V6a1 1 0 0 1 1-1Zm-4 1a1 1 0 0 1 2 0v1H8a1 1 0 0 1 0-2Zm9 13h-4v-7h4Zm-6 0H7v-7h4Zm8-9H5V9h14Z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
