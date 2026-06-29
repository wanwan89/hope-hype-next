import { getUserBadge, showNotif } from '@/lib/ui-utils';

export default function ChatHeader({
  router, targetId, headerInfo, displayStatus, chatState, roomId,
  groupId, isOwner, setGroupModalTab, setIsGroupSettingsOpen, startCall,
  isSelectionMode, setIsSelectionMode, selectAllMessages, handleBulkDelete, selectedMessages
}: any) {
  
  // Tampilan Khusus jika Mode Seleksi Massal Aktif
  if (isSelectionMode) {
    return (
      <header className="chat-header selection-mode" style={{ background: 'var(--bg-panel)', display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid var(--border-color)' }}>
        <button className="menu-btn" onClick={() => setIsSelectionMode(false)} style={{ color: 'var(--text-color)', background: 'transparent', border: 'none', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
          Batal
        </button>
        <button onClick={selectAllMessages} style={{ color: 'var(--primary-blue)', background: 'transparent', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          Pilih Semua
        </button>
        <button onClick={handleBulkDelete} style={{ color: '#e74c3c', background: 'transparent', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }} disabled={selectedMessages.length === 0}>
          Hapus ({selectedMessages.length})
        </button>
      </header>
    );
  }

  // Tampilan Header Normal
  return (
    <header className="chat-header">
      <div className="header-left">
        <button className="menu-btn" onClick={() => router.push('/hypetalk')}><span className="material-icons">arrow_back</span></button>
        {targetId && <img src={headerInfo.avatar || '/asets/png/profile.webp'} alt="avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-color)' }} />}
        <div className="header-info">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {headerInfo.title}
            {roomId !== 'room-1' && targetId && headerInfo.role && <span dangerouslySetInnerHTML={{ __html: getUserBadge(headerInfo.role) }} />}
          </h3>
          <div className="status-container">
            <span className={displayStatus === 'Online' || displayStatus.includes('mengetik') ? "status-typing" : "status-online"} style={{ color: displayStatus === 'Online' ? '#2ecc71' : '' }}>
              {displayStatus}
            </span>
          </div>
        </div>
      </div>
      <div className="header-right">
        {targetId ? (
          <button className="btn-call" style={{ opacity: chatState === 'normal' ? 1 : 0.3 }} onClick={() => { if (chatState === 'normal') startCall(); else showNotif("Permintaan pesan belum disetujui", "warning"); }}>
            <span className="material-icons">call</span>
          </button>
        ) : groupId ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* ✅ INVITE BUTTON – fully isolated */}
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('INVITE clicked');
                setGroupModalTab('invite');
                setIsGroupSettingsOpen(true);
              }}
              style={{
                background: 'rgba(29, 161, 242, 0.1)',
                color: 'var(--primary-blue)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                zIndex: 9999,
                position: 'relative',
                isolation: 'isolate',
              }}
            >
              INVITE
            </button>

            {/* ✅ SETTINGS BUTTON – fully isolated */}
            {isOwner && (
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('SETTINGS clicked');
                  setGroupModalTab('settings');
                  setIsGroupSettingsOpen(true);
                }}
                style={{
                  background: 'var(--border-color)',
                  color: 'var(--text-color)',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  zIndex: 9999,
                  position: 'relative',
                  isolation: 'isolate',
                }}
              >
                SETTINGS
              </button>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}