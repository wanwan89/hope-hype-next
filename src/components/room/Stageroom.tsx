'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import './Stageroom.css'; 

declare global {
  interface Window {
    naikKeStage?: (index: number) => void;
  }
}

export default function Stageroom() {
  const { t } = useTranslation();

  return (
    // Wadah id="stage-grid" ini bakal diisi dinamis oleh fetchStage() di page.tsx.
    // Skeleton ini sekarang didesain lebih premium buat loading state awal (Dark Mode).
    <section id="stage-grid" className="stage-container">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="speaker-item empty">
          <div 
            className="avatar empty-avatar-glass" 
            onClick={() => window.naikKeStage && window.naikKeStage(index)}
          >
            <span className="material-icons">add</span>
          </div>
          <span className="name-label">{t('empty_slot', 'KOSONG')}</span>
        </div>
      ))}
    </section>
  );
}
