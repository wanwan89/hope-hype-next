'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ChatInputFooter({
  chatState, headerInfo, handleTolakRequest, handleTerimaRequest,
  isStickerOpen, setIsStickerOpen, fetchStickers, t, stickers, sendMessage,
  replyTo, setReplyTo, isRecording, recordTime, audioLevel,
  inputValue, handleTyping, 
  setIsImageModalOpen, // 🔥 TAMBAHAN: Masukkan prop ini agar bisa membuka modal
  isUploadingImg, canSend, 
  handleMicTouchStart, stopVN, handleMicTouchMove, handleSendClick, editMessageId
}: any) {

  return (
    <footer className="chat-input-container">
      {chatState === 'i_must_approve' ? (
        <div style={{ width: '100%', background: 'var(--bg-panel)', padding: '16px', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-muted)' }}>{headerInfo.title} bukan pengikutmu. Terima pesan untuk membalas dan melakukan panggilan.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleTolakRequest} style={{ flex: 1, padding: '12px', borderRadius: '16px', border: 'none', background: '#ff4757', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Tolak</button>
            <button onClick={handleTerimaRequest} style={{ flex: 1, padding: '12px', borderRadius: '16px', border: 'none', background: 'var(--primary-blue)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Terima</button>
          </div>
        </div>
      ) : chatState === 'i_am_blocked_by_request' ? (
        <div style={{ width: '100%', background: 'var(--bg-panel)', padding: '12px', borderRadius: '24px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Menunggu permintaan pesan diterima oleh {headerInfo.title}.</p>
        </div>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          
          <div className="input-row">
            <AnimatePresence>
              {isStickerOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  id="sticker-menu"
                >
                  <div className="sticker-search-wrapper"><input placeholder={t('search_sticker')} onChange={(e) => fetchStickers(e.target.value)} /></div>
                  <div id="sticker-list">
                    {stickers?.map((s: any, idx: number) => (
                      <img 
                        key={idx} src={s.images.fixed_width_small.url} alt="sticker" 
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

            <div className="input-group-wrapper" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', gap: 0 }}>
              
              <AnimatePresence>
                {replyTo && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    style={{ width: '100%', overflow: 'hidden' }}
                  >
                    <div style={{ 
                      display: 'flex', padding: '12px 14px 6px 14px', borderLeft: '4px solid var(--primary-blue)', borderBottom: '1px solid var(--border-color)', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)' 
                    }}>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ color: 'var(--primary-blue)', fontSize: '13px', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Membalas {replyTo.profiles?.username}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                          {replyTo.message || 'Media'}
                        </div>
                      </div>
                      <button onClick={() => setReplyTo(null)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)', paddingLeft: '12px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        &times;
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isRecording ? (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0 16px', gap: '12px', height: '48px' }}>
                  <span className="online-dot"></span>
                  <span style={{ color: '#ff4757', fontWeight: 600, flexShrink: 0, fontSize: '15px' }}>
                    {Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,'0')}
                  </span>
                  
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '3px', height: '24px', overflow: 'hidden' }}>
                    {[...Array(12)].map((_, i) => (
                       <motion.div 
                         key={i} 
                         animate={{ height: Math.max(4, (audioLevel/255) * 24 + (Math.random() * 6 - 3)) }} 
                         transition={{ duration: 0.1 }}
                         style={{ width: '3px', background: 'var(--text-color)', borderRadius: '2px' }} 
                       />
                    ))}
                  </div>
                  <span style={{ fontSize: '12px', opacity: 0.8, whiteSpace: 'nowrap', color: 'var(--text-muted)', flexShrink: 0 }}>&lt; Geser batal</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <button 
                    style={{ background: 'transparent', border: 'none', padding: '12px 0 12px 14px', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }} 
                    onClick={() => { setIsStickerOpen(!isStickerOpen); if(!isStickerOpen) fetchStickers(); }}
                  >
                    <span className="material-icons">sentiment_satisfied_alt</span>
                  </button>
                  
                  <textarea 
                    id="chat-input"
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
                  
                  {/* 🔥 PERBAIKAN: Tombol ini sekarang hanya bertugas membuka modal gambar */}
                  <button 
                    style={{ background: 'transparent', border: 'none', padding: '12px 14px 12px 0', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }} 
                    onClick={() => setIsImageModalOpen(true)} 
                    disabled={isUploadingImg}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </button>
                </div>
              )}
            </div>
            
            <button 
              id="action-btn"
              className={isRecording ? 'is-recording' : ''}
              onMouseDown={!canSend ? handleMicTouchStart : undefined} 
              onMouseUp={!canSend ? () => stopVN(false) : undefined} 
              onTouchStart={!canSend ? handleMicTouchStart : undefined} 
              onTouchEnd={!canSend ? () => stopVN(false) : undefined} 
              onTouchMove={!canSend ? handleMicTouchMove : undefined} 
              onClick={() => canSend && handleSendClick()}
            >
              <AnimatePresence mode="wait">
                {editMessageId ? (
                  <motion.span
                    key="edit"
                    initial={{ scale: 0, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.15 }}
                    className="material-icons"
                    style={{ fontSize: '20px' }}
                  >
                    check
                  </motion.span>
                ) : canSend ? (
                  <motion.span
                    key="send"
                    initial={{ scale: 0, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                      <path fill="currentColor" fillRule="evenodd" d="M2.345 2.245a1 1 0 0 1 1.102-.14l18 9a1 1 0 0 1 0 1.79l-18 9a1 1 0 0 1-1.396-1.211L4.613 13H10a1 1 0 1 0 0-2H4.613L2.05 3.316a1 1 0 0 1 .294-1.071z" clipRule="evenodd"/>
                    </svg>
                  </motion.span>
                ) : (
                  <motion.span
                    key="mic"
                    initial={{ scale: 0, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512">
                      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="M192 448h128m64-240v32c0 70.4-57.6 128-128 128h0c-70.4 0-128-57.6-128-128v-32m128 160v80"/>
                      <path fill="currentColor" d="M256 320a78.83 78.83 0 0 1-56.55-24.1A80.9 80.9 0 0 1 176 239V128a79.69 79.69 0 0 1 80-80c44.86 0 80 35.14 80 80v111c0 44.66-35.89 81-80 81"/>
                    </svg>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}
