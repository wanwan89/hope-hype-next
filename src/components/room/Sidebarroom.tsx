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
      <div 
        id="sidebar-overlay" 
        className="sidebar-overlay" 
        onClick={() => window.toggleSidebar && window.toggleSidebar()}
      ></div>

      <div id="sidebar" className="sidebar">
        <div className="sidebar-header">
          <button className="close-sidebar-btn" onClick={() => window.toggleSidebar && window.toggleSidebar()}>
            <span className="material-icons">chevron_right</span>
          </button>
          <div className="profile-img-wrapper">
            <img src="/asets/png/profile.png" id="sidebar-avatar" className="sidebar-profile-img" alt="Profile" />
          </div>
          <span id="sidebar-username">Username</span>
        </div>

        <div className="sidebar-menu">
          <a href="/data">
            <div className="menu-icon-box"><span className="material-icons">person</span></div>
            <span>Profil</span>
          </a>
          
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
