'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type RepostModalProps = {
  isOpen: boolean;
  postId: string;
  creatorId: string;
  note: string;
  setNote: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isUnrepost?: boolean;
};

const RepostModal: React.FC<RepostModalProps> = ({
  isOpen,
  note,
  setNote,
  onClose,
  onConfirm,
  isUnrepost = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--modal-overlay)',
              zIndex: 99998,
            }}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--bg-main)', // ✅ Sesuai permintaan: background utama
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 30px',
              zIndex: 99999,
              maxWidth: '600px',
              margin: '0 auto',
              boxShadow: '0 -10px 30px rgba(0,0,0,0.3)',
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                width: '40px',
                height: '5px',
                background: 'var(--border-card)',
                borderRadius: '10px',
                margin: '0 auto 20px',
              }}
            />

            {/* Judul */}
            <h3
              style={{
                margin: '0 0 20px 0',
                fontSize: '18px',
                color: 'var(--text-main)',
                textAlign: 'center',
                fontWeight: 800,
              }}
            >
              {isUnrepost ? 'Batalkan Repost?' : 'Repost Karya Ini'}
            </h3>

            {/* Input catatan (hanya untuk repost) */}
            {!isUnrepost && (
              <>
                <input
                  type="text"
                  placeholder="Tambahkan catatan... (opsional)"
                  maxLength={15}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    border: '2px solid var(--border-card)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    outline: 'none',
                    marginBottom: '8px',
                    textAlign: 'center',
                    fontSize: '16px',
                    fontWeight: 700,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = 'var(--primary-bg)')
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = 'var(--border-card)')
                  }
                />
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                    width: '100%',
                    marginBottom: '24px',
                    fontWeight: 600,
                  }}
                >
                  {note.length}/15
                </div>
              </>
            )}

            {/* Tombol Aksi */}
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                }}
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = 'scale(0.95)')
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = 'scale(1)')
                }
              >
                Batal
              </button>
              <button
                onClick={onConfirm}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '14px',
                  border: 'none',
                  background: isUnrepost
                    ? 'var(--danger)'
                    : 'var(--primary-bg)',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                }}
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = 'scale(0.95)')
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = 'scale(1)')
                }
              >
                {isUnrepost ? 'Ya, Batalkan' : 'Repost'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RepostModal;