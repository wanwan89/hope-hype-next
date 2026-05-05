'use client';

export default function GiftDrawer() {
  return (
    <>
      {/* OVERLAY */}
      <div 
        id="drawer-overlay" 
        className="drawer-overlay" 
        onClick={() => window.toggleGiftDrawer && window.toggleGiftDrawer()}
      ></div>

      {/* LACI KADO */}
      <div id="gift-drawer" className="gift-drawer">
        <div className="handle"></div> 
        
        <div className="drawer-header">
          <span className="drawer-title">KIRIM HADIAH</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="coin-panel">
              <span id="user-coins">0</span>
            </div>
            <span 
              className="material-icons" 
              onClick={() => window.toggleGiftDrawer && window.toggleGiftDrawer()} 
              style={{ color: '#94a3b8', fontSize: '26px', cursor: 'pointer' }}
            >
              cancel
            </span>
          </div>
        </div>

        <div id="level-progress-container" style={{ margin: '15px 20px 5px 20px' }}></div>
        
        <div className="target-selection-container">
          <span className="target-label">KIRIM KE:</span>
          <div id="gift-targets" className="target-list"></div>
        </div>

        {/* DAFTAR KADO */}
        <div className="gift-list">
          <div className="gift-item" onClick={() => window.sendGift && window.sendGift('Love', 1, 1)}>
            <img src="/asets/png/gift1.png" className="gift-img" alt="Love" />
            <span className="gift-label">LOVE</span>
            <span className="gift-price">1</span>
          </div>
          <div className="gift-item" onClick={() => window.sendGift && window.sendGift('Daebak', 10, 2)}>
            <img src="/asets/png/gift2.png" className="gift-img" alt="Daebak" />
            <span className="gift-label">DAEBAK</span>
            <span className="gift-price">10</span>
          </div>
          <div className="gift-item" onClick={() => window.sendGift && window.sendGift('Omoomo', 50, 3)}>
            <img src="/asets/png/gift3.png" className="gift-img" alt="Omoomo" />
            <span className="gift-label">OMOOMO</span>
            <span className="gift-price">50</span>
          </div>
          <div className="gift-item" onClick={() => window.sendGift && window.sendGift('Oppa', 100, 4)}>
            <img src="/asets/png/gift4.png" className="gift-img" alt="Oppa" />
            <span className="gift-label">OPPA</span>
            <span className="gift-price">100</span>
          </div>
          <div className="gift-item" onClick={() => window.sendGift && window.sendGift('Fighting', 2000, 5)}>
            <img src="/asets/png/gift5.png" className="gift-img" alt="Fighting" />
            <span className="gift-label">FIGHTING</span>
            <span className="gift-price">2000</span>
          </div>
          <div className="gift-item" onClick={() => window.sendGift && window.sendGift('Saranghae', 5000, 6)}>
            <img src="/asets/png/gift6.png" className="gift-img" alt="Saranghae" />
            <span className="gift-label">SARANGHAE</span>
            <span className="gift-price">5000</span>
          </div>
          <div className="gift-item" onClick={() => window.sendGift && window.sendGift('Kiyowo', 10000, 7)}>
            <img src="/asets/png/gift7.png" className="gift-img" alt="Kiyowo" />
            <span className="gift-label">KIYOWO</span>
            <span className="gift-price">10000</span>
          </div>
          <div className="gift-item" onClick={() => window.sendGift && window.sendGift('Gomawo', 25000, 8)}>
            <img src="/asets/png/gift8.png" className="gift-img" alt="Gomawo" />
            <span className="gift-label">GOMAWO</span>
            <span className="gift-price">25000</span>
          </div>
          <div className="gift-item" onClick={() => window.sendGift && window.sendGift('Daesang', 50000, 9)}>
            <img src="/asets/png/gift9.png" className="gift-img" alt="Daesang" />
            <span className="gift-label">DAESANG</span>
            <span className="gift-price">50000</span>
          </div>
          <div className="gift-item" onClick={() => window.sendGift && window.sendGift('Sultan', 100000, 10)}>
            <img src="/asets/png/gift10.png" className="gift-img" alt="Sultan" />
            <span className="gift-label">SULTAN</span>
            <span className="gift-price">100000</span>
          </div>
        </div>
      </div>
    </>
  );
}
