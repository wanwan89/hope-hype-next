'use client';
import React from 'react';

const DoiSearchingOverlay: React.FC = () => (
  <div className="doi-search-overlay">
    <div className="radar-wrapper">
      <div className="radar-ring"></div>
      <div className="radar-ring delay-1"></div>
      <div className="radar-ring delay-2"></div>
      <span className="material-icons radar-center-icon">person_search</span>
      <div className="plane-container">
        <svg className="plane-svg" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </div>
      <div className="plane-container reverse">
        <svg className="plane-svg" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </div>
    </div>
    <h3 className="search-title-glow">Mencari kecocokan..</h3>
  </div>
);

export default React.memo(DoiSearchingOverlay);