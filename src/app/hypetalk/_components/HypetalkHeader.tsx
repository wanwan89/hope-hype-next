'use client';
import React from 'react';

type Props = {
  onMenuClick: () => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  isSelectionMode: boolean;
  selectedCount: number;
  onCancelSelection: () => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
};

const HypetalkHeader: React.FC<Props> = ({ 
  onMenuClick, 
  searchQuery, 
  onSearchChange,
  isSelectionMode,
  selectedCount,
  onCancelSelection,
  onSelectAll,
  onDeleteSelected
}) => (
  <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap');
      .hypetalk-logo {
        font-family: 'Poppins', sans-serif;
        font-weight: 700;
        font-size: 1.5rem;
        margin: 0;
        line-height: 1;
        transition: all 0.3s ease;
      }
      .tg-header-actions button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
        color: var(--text-main, #ffffff);
      }
      .tg-header-actions button:active {
        background-color: rgba(255, 255, 255, 0.1);
      }
    `}</style>
    <header className="tg-header" style={{ paddingBottom: isSelectionMode ? '12px' : '0' }}>
      <div className="tg-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div className="tg-header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isSelectionMode && (
            <button className="icon-btn" onClick={onMenuClick}>
              <span className="material-icons">menu</span>
            </button>
          )}
          <h2 className="hypetalk-logo" style={{ marginLeft: isSelectionMode ? '16px' : '0' }}>
            {isSelectionMode ? `${selectedCount} Terpilih` : 'Hypetalk'}
          </h2>
        </div>

        {/* Action Menu (Hapus, Tandai Semua, Batal) */}
        {isSelectionMode && (
          <div className="tg-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginRight: '8px' }}>
            {/* Tandai Semua */}
            <button onClick={onSelectAll} title="Tandai Semua">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 512 512">
                <path fill="currentColor" d="M258.9 48C141.92 46.42 46.42 141.92 48 258.9c1.56 112.19 92.91 203.54 205.1 205.1c117 1.6 212.48-93.9 210.88-210.88C462.44 140.91 371.09 49.56 258.9 48m-16.79 192.47l51.55-59a16 16 0 0 1 24.1 21.06l-51.55 59a16 16 0 1 1-24.1-21.06m-38.86 90.85a16 16 0 0 1-22.62 0l-47.95-48a16 16 0 1 1 22.64-22.62l48 48a16 16 0 0 1-.07 22.62m176.8-128.79l-111.88 128a16 16 0 0 1-11.51 5.47h-.54a16 16 0 0 1-11.32-4.69l-47.94-48a16 16 0 1 1 22.64-22.62l29.8 29.83a8 8 0 0 0 11.68-.39l95-108.66a16 16 0 0 1 24.1 21.06Z"/>
              </svg>
            </button>
            {/* Hapus */}
            <button 
              onClick={onDeleteSelected} 
              disabled={selectedCount === 0} 
              style={{ color: selectedCount === 0 ? 'rgba(255, 255, 255, 0.4)' : '#ef4444', cursor: selectedCount === 0 ? 'not-allowed' : 'pointer' }} 
              title="Hapus"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
                <path fill="currentColor" d="M20 6h-4V5a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v1H4a1 1 0 0 0 0 2h1v11a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8h1a1 1 0 0 0 0-2M10 5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1h-4Zm7 14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8h10Z"/>
              </svg>
            </button>
            {/* Batal */}
            <button onClick={onCancelSelection} title="Batal">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="m8.4 16.308l3.6-3.6l3.6 3.6l.708-.708l-3.6-3.6l3.6-3.6l-.708-.708l-3.6 3.6l-3.6-3.6l-.708.708l3.6 3.6l-3.6 3.6zM12.003 21q-1.866 0-3.51-.708q-1.643-.709-2.859-1.924t-1.925-2.856T3 12.003t.709-3.51Q4.417 6.85 5.63 5.634t2.857-1.925T11.997 3t3.51.709q1.643.708 2.859 1.922t1.925 2.857t.709 3.509t-.708 3.51t-1.924 2.859t-2.856 1.925t-3.509.709"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Sembunyikan search jika mode seleksi */}
      {!isSelectionMode && (
        <div className="tg-search-container">
          <div className="tg-search-box">
            <span className="material-icons">search</span>
            <input type="text" placeholder="Cari obrolan..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
          </div>
        </div>
      )}
    </header>
  </>
);

export default React.memo(HypetalkHeader);
