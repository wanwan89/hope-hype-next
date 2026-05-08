'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import './Stageroom.css'; // 🔥 FIX: Import CSS khusus Stage Room

// 👇 Kasih tau TypeScript kalau window punya fungsi naikKeStage 👇
declare global {
  interface Window {
    naikKeStage?: (index: number) => void;
  }
}

export default function Stageroom() {
  const { t } = useTranslation();

  return (
    // Wadah id="stage-grid" ini bakal ditimpa/diisi otomatis 
    // sama fungsi fetchStage() di file page.tsx lu.
    // Yang ada di bawah ini cuma tampilan skeleton/default sebelum data ke-load.
    <section id="stage-grid" className="stage-container">
      <div className="speaker-item empty">
        <div className="avatar" onClick={() => window.naikKeStage && window.naikKeStage(0)}>
          <span className="material-icons">add</span>
        </div>
        {/* 🔥 FIX: Support multi-bahasa 🔥 */}
        <span className="name-label">{t('empty_slot', 'KOSONG')}</span>
      </div>
    </section>
  );
}
