'use client';

export default function Header() {
  return (
    <header className="main-header">
      <div className="header-left">
        <h1 className="room-title">KLASIKAN NYANYI</h1>
        
        <div className="online-status">
          <div className="online-dot"></div>
          <span className="material-icons" style={{ fontSize: '13px' }}>people</span>
          <span><b id="online-count">1</b> orang di room</span>
        </div>
      </div>
      
      <div className="header-right" style={{ display: 'flex', alignItems: 'center' }}>
        <div 
          id="top-gifters-container" 
          className="top-gifters-wrapper" 
          onClick={() => window.openTopGiftersModal && window.openTopGiftersModal()}
        ></div>
        
        <button className="menu-btn" onClick={() => window.toggleSidebar && window.toggleSidebar()}>
          <span className="material-icons" style={{ fontSize: '28px' }}>menu</span>
        </button>
      </div>
    </header>
  );
}
