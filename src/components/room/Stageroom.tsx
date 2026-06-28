'use client';

import React from 'react';
import './Stageroom.css';

declare global {
  interface Window {
    naikKeStage?: (index: number) => void;
  }
}

export default function Stageroom() {
  return (
    <section id="stage-grid" className="stage-container">
      {Array.from({ length: 6 }).map((_, index) => (
        <div 
          key={index} 
          className="speaker-item empty"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* SLOT LINGKARAN - Gaya Abu-Abu Glass Tanpa Border */}
          <div
            className="avatar empty-avatar"
            onClick={() => window.naikKeStage && window.naikKeStage(index)}
            style={{
              background: 'rgba(255, 255, 255, 0.12)', /* Warna abu-abu transparan */
              backdropFilter: 'blur(12px)', /* Efek Glassmorphism */
              WebkitBackdropFilter: 'blur(12px)',
              border: 'none', /* Menghilangkan border bawaan */
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Ikon Plus (+) */}
            <span 
              className="material-icons" 
              style={{ 
                color: 'rgba(255, 255, 255, 0.6)', /* Warna icon putih agak transparan */
                fontSize: '24px' 
              }}
            >
              add
            </span>
          </div>
          
          {/* Teks "KOSONG" telah dihapus untuk tampilan yang lebih clean */}
        </div>
      ))}
    </section>
  );
}
