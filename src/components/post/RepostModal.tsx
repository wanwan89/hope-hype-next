'use client';

import { motion, AnimatePresence } from 'framer-motion';

type RepostModalProps = {
  isOpen: boolean;
  postId: string;
  creatorId: string;
  note: string;
  setNote: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

const RepostModal: React.FC<RepostModalProps> = ({ isOpen, postId, creatorId, note, setNote, onClose, onConfirm }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', zIndex: 99998 }} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: '-50%', x: '-50%' }}
            animate={{ scale: 1, opacity: 1, y: '-50%', x: '-50%' }}
            exit={{ scale: 0.9, opacity: 0, y: '-50%', x: '-50%' }}
            style={{
              position: 'fixed', top: '50%', left: '50%',
              background: 'var(--bg-secondary)', borderRadius: '24px', padding: '24px',
              zIndex: 99999, width: '85%', maxWidth: '340px',
              boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}
          >
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: 'var(--text-main)', textAlign: 'center', fontWeight: 800 }}>Repost Karya Ini</h3>
            <input
              type="text"
              placeholder="Tambahkan catatan... (opsional)"
              maxLength={15}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px',
                border: '2px solid var(--border-card)', background: 'var(--bg-main)',
                color: 'var(--text-main)', outline: 'none', marginBottom: '8px',
                textAlign: 'center', fontSize: '16px', fontWeight: 700, transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#1f3cff'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-card)'}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', width: '100%', marginBottom: '24px', fontWeight: 600 }}>{note.length}/15</div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button onClick={onClose}
                style={{
                  flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                  background: 'var(--border-card)', color: 'var(--text-main)', fontWeight: 700,
                  cursor: 'pointer', transition: 'transform 0.1s'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                Batal
              </button>
              <button onClick={onConfirm}
                style={{
                  flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                  background: '#1f3cff', color: 'white', fontWeight: 700,
                  cursor: 'pointer', transition: 'transform 0.1s'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                Repost
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RepostModal;