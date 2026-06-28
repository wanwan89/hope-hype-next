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
    <>
      {/* CSS Langsung untuk Animasi Berbicara Warna Abu-abu */}
      <style>{`
        @keyframes pulseGray {
          0% { box-shadow: 0 0 0 0 rgba(150, 150, 150, 0.6); }
          70% { box-shadow: 0 0 0 12px rgba(150, 150, 150, 0); }
          100% { box-shadow: 0 0 0 0 rgba(150, 150, 150, 0); }
        }
        .avatar.speaking {
          animation: pulseGray 1.5s infinite;
          border: none !important; /* Hilangkan border saat naik/berbicara */
        }
        .stage-container {
          /* Turunkan stage agak ke bawah */
          margin-top: 40px; 
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 0 20px;
        }
      `}</style>

      <section id="stage-grid" className="stage-container">
        {Array.from({ length: 6 }).map((_, index) => (
          <div 
            key={index} 
            className="speaker-item empty"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {/* SLOT LINGKARAN KOSONG */}
            <div
              className="avatar empty-avatar"
              onClick={() => window.naikKeStage && window.naikKeStage(index)}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: 'none',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                width: '60px',
                height: '60px',
              }}
            >
              <span className="material-icons" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '24px' }}>
                add
              </span>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
