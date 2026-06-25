import React from 'react';

export default function HypeMatchOpening() {
  return (
    <div className="hm-overlay hm-flex-center" style={{ zIndex: 9999 }}>
      <div className="hm-backdrop" style={{ backgroundColor: '#0f172a' }}></div>
      
      <div className="hm-content" style={{ zIndex: 10, textAlign: 'center' }}>
        <h1 className="hm-title-animate">
          HYPE MATCH
        </h1>
        <p className="hm-subtitle-animate">
          Mencari koneksi baru di sekitarmu...
        </p>
      </div>

      <style>{`
        .hm-title-animate {
          font-size: 1.8rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 2px;
          margin-bottom: 8px;
          animation: textPulse 2s infinite ease-in-out;
        }

        .hm-subtitle-animate {
          color: #94a3b8;
          font-size: 0.9rem;
          font-weight: 400;
          animation: fadeInOut 2s infinite ease-in-out;
        }

        @keyframes textPulse {
          0%, 100% { opacity: 0.8; letter-spacing: 2px; }
          50% { opacity: 1; letter-spacing: 4px; }
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
