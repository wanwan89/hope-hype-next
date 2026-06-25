import { motion, AnimatePresence } from 'framer-motion';

export default function ChatInputFooter({
  chatState, headerInfo, handleTolakRequest, handleTerimaRequest,
  isStickerOpen, setIsStickerOpen, fetchStickers, t, stickers, sendMessage,
  replyTo, setReplyTo, isRecording, recordTime, audioLevel,
  inputValue, handleTyping, handlePhotoClick, isUploadingImg, fileInputRef,
  handlePhotoSelect, canSend, handleMicTouchStart, stopVN, handleMicTouchMove,
  handleSendClick, editMessageId
}: any) {
  return (
    <footer className="chat-input-container" style={{ padding: '8px 10px', background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)' }}>
      {chatState === 'i_must_approve' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{headerInfo.title} bukan pengikutmu. Terima pesan untuk membalas dan melakukan panggilan.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleTolakRequest} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#ff4757', color: 'white', fontWeight: 600 }}>Tolak</button>
            <button onClick={handleTerimaRequest} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#1f3cff', color: 'white', fontWeight: 600 }}>Terima</button>
          </div>
        </div>
      ) : chatState === 'i_am_blocked_by_request' ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Menunggu permintaan pesan diterima oleh {headerInfo.title}.</p>
        </div>
      ) : (
        <>
          <AnimatePresence>
            {isStickerOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                id="sticker-menu" style={{ position: 'absolute', bottom: '100%', left: '10px', right: '10px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 -4px 15px rgba(0,0,0,0.1)', padding: '10px', zIndex: 10 }}
              >
                <div className="sticker-search-wrapper"><input placeholder={t('search_sticker')} onChange={(e) => fetchStickers(e.target.value)} /></div>
                <div id="sticker-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginTop: '10px' }}>
                  {stickers.map((s: any, idx: number) => (
                    <img 
                      key={idx} src={s.images.fixed_width_small.url} alt="sticker" 
                      style={{ width: '100%', height: 'auto', borderRadius: '8px', cursor: 'pointer' }}
                      onClick={() => {
                        sendMessage(undefined, s.images.fixed_width.url);
                        setIsStickerOpen(false); 
                      }} 
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {replyTo && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                style={{ display: 'flex', background: 'rgba(29, 161, 242, 0.05)', borderRadius: '12px', padding: '8px 12px', marginBottom: '8px', border: '1px solid rgba(29, 161, 242, 0.1)', position: 'relative' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{color: 'var(--primary-blue)', fontSize: '11px', fontWeight: 'bold'}}>{t('replying_to', { username: replyTo.profiles?.username })}</div>
                  <div style={{fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{replyTo.message || t('media_label')}</div>
                </div>
                <div onClick={() => setReplyTo(null)} style={{fontSize: '22px', cursor: 'pointer', color: '#94a3b8', padding: '0 5px'}}>&times;</div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}>
            {isRecording ? (
              <div className="slim-input-wrapper" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px', color: '#ff4757', fontWeight: 600 }}>
                  <span className="online-dot" style={{ background: '#ff4757' }}></span>
                  <span>{Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,'0')}</span>
                  
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '3px', height: '24px', overflow: 'hidden' }}>
                    {[...Array(12)].map((_, i) => (
                       <motion.div 
                         key={i} 
                         animate={{ height: Math.max(4, (audioLevel/255) * 24 + (Math.random() * 6 - 3)) }} 
                         transition={{ duration: 0.1 }}
                         style={{ width: '3px', background: '#ff4757', borderRadius: '2px' }} 
                       />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', opacity: 0.6, whiteSpace: 'nowrap' }}>&lt; Geser batal</span>
                </div>
              </div>
            ) : (
              <div className="slim-input-wrapper">
                <button className="action-icon-btn" onClick={() => { setIsStickerOpen(!isStickerOpen); if(!isStickerOpen) fetchStickers(); }}>
                  <span className="material-icons" style={{ color: 'var(--primary-blue)' }}>sentiment_satisfied_alt</span>
                </button>
                
                <textarea 
                  placeholder="Tulis pesan..." 
                  value={inputValue} 
                  onChange={handleTyping} 
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                  }}
                />
                
                <button className="action-icon-btn" onClick={handlePhotoClick} disabled={isUploadingImg}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </button>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handlePhotoSelect} />
              </div>
            )}
            
            <button 
              className="send-btn-round"
              onMouseDown={!canSend ? handleMicTouchStart : undefined} 
              onMouseUp={!canSend ? () => stopVN(false) : undefined} 
              onTouchStart={!canSend ? handleMicTouchStart : undefined} 
              onTouchEnd={!canSend ? () => stopVN(false) : undefined} 
              onTouchMove={!canSend ? handleMicTouchMove : undefined} 
              onClick={() => canSend && handleSendClick()}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={editMessageId ? 'edit' : canSend ? 'send' : 'mic'}
                  initial={{ scale: 0, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0, rotate: 45 }}
                  transition={{ duration: 0.15 }}
                  className="material-icons"
                  style={{ fontSize: '20px' }}
                >
                  {editMessageId ? 'check' : (canSend ? 'send' : 'mic')}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </>
      )}
    </footer>
  );
}
