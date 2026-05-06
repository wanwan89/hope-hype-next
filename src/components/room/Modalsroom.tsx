'use client';

// 👇 FIX: Daftarin semua fungsi modal yang nempel di window 👇
declare global {
  interface Window {
    closeRoomSetting?: () => void;
    saveRoomSetting?: () => void;
    closeConfirmModal?: () => void;
    prosesTurunMic?: () => void;
    closeTopGiftersModal?: () => void;
  }
}

export default function Modals() {
  return (
    <>
      {/* 1. MODAL SETTING ROOM */}
      <div id="setting-modal" className="modal-overlay">
        <div className="modal-box">
          <div className="modal-header">
            <h3>⚙️ Room Settings</h3>
            <button className="close-modal" onClick={() => window.closeRoomSetting && window.closeRoomSetting()}>
              <span className="material-icons">close</span>
            </button>
          </div>
          <div className="modal-body">
            <label>Nama Room Baru</label>
            <input type="text" id="edit-room-name" placeholder="Contoh: Klasikan Galau..." />
            <label>Pesan Sistem (Broadcast ke Chat)</label>
            <textarea id="system-message" placeholder="Tulis pesan pengumuman..."></textarea>
            <button className="btn-save-setting" onClick={() => window.saveRoomSetting && window.saveRoomSetting()}>
              SIMPAN PERUBAHAN
            </button>
          </div>
        </div>
      </div>

      {/* 2. MODAL KONFIRMASI (TURUN MIC) */}
      <div id="confirm-modal" className="modal-overlay" style={{ zIndex: 10005 }}>
        <div className="modal-box modal-confirm">
          <div className="confirm-icon-wrapper">
            <span className="material-icons">mic_off</span>
          </div>
          <h3>Turun Panggung?</h3>
          <p>Yakin mau turun dari panggung sekarang? Mic kamu akan otomatis dimatikan.</p>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => window.closeConfirmModal && window.closeConfirmModal()}>
              BATAL
            </button>
            <button className="btn-danger" onClick={() => window.prosesTurunMic && window.prosesTurunMic()}>
              YAKIN
            </button>
          </div>
        </div>
      </div>

      {/* 3. MODAL LEADERBOARD (SULTAN) */}
      <div id="top-gifters-modal" className="modal-overlay" style={{ zIndex: 10006 }}>
        <div className="modal-box modal-leaderboard">
          <div className="modal-header">
            <h3 className="gold-title">🏆 THE SULTAN</h3>
            <button className="close-modal" onClick={() => window.closeTopGiftersModal && window.closeTopGiftersModal()}>
              <span className="material-icons">close</span>
            </button>
          </div>
          <div id="top-gifters-list" className="leaderboard-list">
            {/* List Sultan akan di-inject JS ke sini */}
          </div>
        </div>
      </div>
    </>
  );
}
