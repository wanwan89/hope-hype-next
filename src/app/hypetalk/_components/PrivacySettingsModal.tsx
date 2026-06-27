'use client';
import React from 'react';

type Props = {
  privacySettings: { show_online: boolean; last_seen: string };
  setPrivacySettings: (s: any) => void;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
};

const PrivacySettingsModal: React.FC<Props> = ({ privacySettings, setPrivacySettings, isSaving, onSave, onClose }) => (
  <div className="tg-modal-overlay" onClick={onClose}>
    <div className="tg-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Privasi & Status</h3>
        <button className="close-modal-btn" onClick={onClose}>
          <span className="material-icons">close</span>
        </button>
      </div>
      
      <div className="settings-row" style={{ marginTop: '10px' }}>
        <div>
          <strong style={{ display: 'block', fontSize: '15px' }}>Tampilkan Status Online</strong>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Munculkan titik hijau saat Anda aktif</span>
        </div>
        <input 
          type="checkbox" 
          className="ios-toggle" 
          checked={privacySettings.show_online} 
          onChange={(e) => setPrivacySettings({ ...privacySettings, show_online: e.target.checked })} 
        />
      </div>

      <div style={{ padding: '15px 0', borderBottom: '1px solid var(--border-card)' }}>
        <strong style={{ display: 'block', fontSize: '15px', marginBottom: '8px' }}>Siapa yang bisa melihat "Terakhir Dilihat"?</strong>
        <div className="input-group" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '4px 10px' }}>
          <span className="material-icons" style={{ color: 'var(--text-muted)' }}>visibility</span>
          <select 
            value={privacySettings.last_seen} 
            onChange={(e) => setPrivacySettings({ ...privacySettings, last_seen: e.target.value })}
            style={{ width: '100%', background: 'transparent', color: 'var(--text-main)', border: 'none', padding: '10px', outline: 'none' }}
          >
            <option value="public">Semua Orang</option>
            <option value="mutuals">Hanya Teman (Saling Mengikuti)</option>
            <option value="nobody">Tidak Ada</option>
          </select>
        </div>
      </div>

      <button className="action-btn" style={{ marginTop: '20px' }} onClick={onSave} disabled={isSaving}>
        Simpan Pengaturan
      </button>
    </div>
  </div>
);

export default React.memo(PrivacySettingsModal);
