'use client';

// 👇 FIX: Daftarin semua fungsi sidebar yang nempel di window 👇
declare global {
  interface Window {
    toggleSidebar?: () => void;
    toggleMicSidebar?: (event?: any) => void;
    openRoomSetting?: () => void;
    keluarRoom?: () => void;
  }
}

export default function Sidebar() {
  return (
    <>
      {/* OVERLAY: Area transparan di luar menu. Kalo di-tap, bakal manggil toggleSidebar (nutup menu) */}
      <div 
        id="sidebar-overlay" 
        className="sidebar-overlay" 
        onClick={() => window.toggleSidebar && window.toggleSidebar()}
      ></div>

      <div id="sidebar" className="sidebar">
        {/* 🔥 Bagian foto profil, nama user, dan tombol panah udah DIBASMI total dari sini 🔥 */}

        <div className="sidebar-menu">
          <a href="#" id="menu-mic" onClick={(event) => window.toggleMicSidebar && window.toggleMicSidebar(event)}>
            <div className="menu-icon-box"><span className="material-icons" id="mic-icon">mic</span></div>
            <span id="mic-text">Matikan Mic</span>
          </a>
          
          <a href="#" id="menu-setting" style={{ display: 'none' }} onClick={() => window.openRoomSetting && window.openRoomSetting()}>
            <div className="menu-icon-box"><span className="material-icons">settings</span></div>
            <span>Room Settings</span>
          </a>
          
          <div className="menu-divider"></div>

          <a href="#" onClick={() => window.keluarRoom && window.keluarRoom()} className="logout-item">
            <div className="menu-icon-box logout-box"><span className="material-icons">logout</span></div>
            <span>Keluar Ruangan</span>
          </a>
        </div>
      </div> 
    </>
  );
}
