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
    <section id="stage-grid" className="stage-container">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="speaker-item empty">
          <div
            className="avatar empty-avatar"
            onClick={() => window.naikKeStage && window.naikKeStage(index)}
          >
            {/* Ikon "+" tetap menggunakan Material Icons, warnanya diatur melalui CSS */}
            <span className="material-icons">add</span>
          </div>
          <span className="name-label">{t('empty_slot', 'KOSONG')}</span>
        </div>
      ))}
    </section>
  );
}