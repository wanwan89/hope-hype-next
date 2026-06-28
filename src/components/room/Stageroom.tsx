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
                boxShadow: 'inset 0 0 0 1px rgba(128, 128, 128, 0.15)'
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
