'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  doi: any;
  onClose: () => void;
  onChat: () => void;
};

const DoiCardModal: React.FC<Props> = ({ doi, onClose, onChat }) => {
  if (!doi) return null;
  return (
    <div className="tg-modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
      <div className="tg-modal-content doi-result-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Kecocokan Ditemukan!</h3><button className="close-modal-btn" onClick={onClose}><span className="material-icons">close</span></button></div>
        <div className="doi-profile-box" style={{ padding: '10px 0', textAlign: 'center' }}>
          <img src={doi.avatar_url || "/asets/png/profile.webp"} alt="Doi" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #1DA1F2', boxShadow: '0 0 15px rgba(29, 161, 242, 0.3)', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 15px 0', color: 'var(--text-main)' }}>{doi.username}, {doi.umur || '??'}</h2>
          <div className="doi-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
            {doi.pekerjaan && <span className="d-tag" style={{ background: 'var(--bg-secondary)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>{doi.pekerjaan}</span>}
            {doi.hobi && <span className="d-tag" style={{ background: 'var(--bg-secondary)', color: '#dc2626', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>{doi.hobi}</span>}
            {doi.zodiak && <span className="d-tag" style={{ background: 'var(--bg-secondary)', color: '#d97706', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>{doi.zodiak}</span>}
            {!doi.pekerjaan && !doi.hobi && !doi.zodiak && <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Belum mengisi bio lengkap</span>}
          </div>
        </div>
        <button className="action-btn love-btn" onClick={onChat} style={{ width: '100%', background: 'linear-gradient(135deg, #1DA1F2, #1f3cff)', borderRadius: '15px', fontWeight: '800', color: 'white', padding: '14px', border: 'none' }}>Chat Sekarang </button>
      </div>
    </div>
  );
};

export default React.memo(DoiCardModal);