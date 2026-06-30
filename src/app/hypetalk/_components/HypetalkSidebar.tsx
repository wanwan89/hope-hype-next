'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  isOpen: boolean;
  currentUser: any;
  onOpenModal: (name: string) => void;
  onHypeMatch: () => void;
};

// --- SVG Icons ---
const BuatGrupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.5 11.95q.725-.8 1.113-1.825T14 8t-.387-2.125T12.5 4.05q1.5.2 2.5 1.325T16 8t-1 2.625t-2.5 1.325M17.45 20q.275-.45.413-.962T18 18v-1q0-.9-.4-1.713t-1.05-1.437q1.275.45 2.363 1.163T20 17v1q0 .825-.587 1.413T18 20zM20 11h-1q-.425 0-.712-.288T18 10t.288-.712T19 9h1V8q0-.425.288-.712T21 7t.713.288T22 8v1h1q.425 0 .713.288T24 10t-.288.713T23 11h-1v1q0 .425-.288.713T21 13t-.712-.288T20 12zm-14.825-.175Q4 9.65 4 8t1.175-2.825T8 4t2.825 1.175T12 8t-1.175 2.825T8 12t-2.825-1.175M0 18v-.8q0-.85.438-1.562T1.6 14.55q1.55-.775 3.15-1.162T8 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T16 17.2v.8q0 .825-.587 1.413T14 20H2q-.825 0-1.412-.587T0 18m8-8q.825 0 1.413-.587T10 8t-.587-1.412T8 6t-1.412.588T6 8t.588 1.413T8 10m-6 8h12v-.8q0-.275-.137-.5t-.363-.35q-1.35-.675-2.725-1.012T8 15t-2.775.338T2.5 16.35q-.225.125-.363.35T2 17.2zm6 0"/>
  </svg>
);

const GembokIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 14 14" fill="currentColor">
    <path fillRule="evenodd" d="M7 2a2 2 0 0 0-2 2v1h4V4a2 2 0 0 0-2-2M3 4v1a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 3 14h8a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 11 5V4a4 4 0 1 0-8 0m4 6.75a1.25 1.25 0 1 0 0-2.5a1.25 1.25 0 0 0 0 2.5" clipRule="evenodd"/>
  </svg>
);

const MatchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 17c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2H6c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2zM4 19h16v2H4z"/>
  </svg>
);

const HypetalkSidebar: React.FC<Props> = ({ isOpen, currentUser, onOpenModal, onHypeMatch }) => (
  <>
    {/* Overlay dengan animasi fade */}
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="tg-sidebar-overlay active"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 99990,
          }}
        />
      )}
    </AnimatePresence>

    {/* Sidebar panel dengan animasi slide dari kanan */}
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            right: 0,
            width: '100%',
            maxWidth: '320px',
            backgroundColor: 'var(--bg-main)',
            zIndex: 99991,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
            borderLeft: '1px solid var(--border-card)',
          }}
        >
          <div className="sidebar-header">
            <img className="side-avatar" src={currentUser?.avatar_url || "/asets/png/profile.webp"} alt="me" />
            <div className="sidebar-user-info">
              <h3 className="side-username">{currentUser?.username || "User"}</h3>
              <p className="side-id">#{currentUser?.short_id || "0000"}</p>
            </div>
            <button className="btn-edit-bio" onClick={() => onOpenModal('bio')}>
              Edit Biodata
            </button>
          </div>
          <div className="sidebar-menu">
            <button className="menu-item" onClick={() => onOpenModal('group')}>
              <BuatGrupIcon />
              <span style={{ marginLeft: 12 }}>Buat Grup Baru</span>
            </button>
            <button className="menu-item" onClick={() => onOpenModal('privacy-settings')}>
              <GembokIcon />
              <span style={{ marginLeft: 12 }}>Privasi & Status</span>
            </button>
            <button className="menu-item btn-hype-match" onClick={onHypeMatch} style={{ marginTop: '10px' }}>
              <MatchIcon />
              <span style={{ marginLeft: 12 }}>Hype Match</span>
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  </>
);

export default React.memo(HypetalkSidebar);