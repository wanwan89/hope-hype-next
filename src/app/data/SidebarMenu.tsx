'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
};

// SVG Icons (Tetap sama)
const DompetIcon = () => ( ... );
const VipIcon = () => ( ... );
const TugasIcon = () => ( ... );

const SidebarMenu: React.FC<Props> = ({ isOpen, onClose, t }) => {
  const router = useRouter();

  const navTo = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <>
      <div 
        className={`p-sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose} 
        style={{ 
          backdropFilter: 'none', 
          WebkitBackdropFilter: 'none', 
          zIndex: 8998 // 🔥 TEMBAK LANGSUNG DI SINI
        }}
      />
      
      <aside 
        className={`p-sidebar-panel ${isOpen ? 'open' : ''}`}
        style={{ zIndex: 8999 }} // 🔥 TEMBAK LANGSUNG DI SINI
      >
        <div className="sidebar-search-container">
          <div className="sidebar-search">
            <span className="material-icons" style={{fontSize: '20px', color: '#8a8b91'}}>search</span>
            <input
              type="text"
              placeholder={t('search_placeholder', 'Cari...')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  router.push(`/?search=${encodeURIComponent(e.currentTarget.value.trim())}`);
                  onClose();
                }
              }}
            />
          </div>
        </div>
        
        <div className="menu-category-label">{t('wallet_assets', 'Aset Dompet')}</div>
        <div className="menu-item-tiktok" onClick={() => navTo('/saldo')}>
          <div className="icon-wrapper"><DompetIcon /></div>
          <div className="menu-text">{t('hypecoin_balance', 'Saldo Hypecoin')}</div>
          <div className="arrow-right">›</div>
        </div>
        <div className="menu-item-tiktok" onClick={() => navTo('/vip')}>
          <div className="icon-wrapper" style={{color: '#f59e0b'}}><VipIcon /></div>
          <div className="menu-text">{t('vip_subscription', 'Langganan VIP')}</div>
          <div className="arrow-right">›</div>
        </div>
        
        <div className="menu-category-label">{t('mission_rewards', 'Misi & Hadiah')}</div>
        <div className="menu-item-tiktok" onClick={() => navTo('/dailycek')}>
          <div className="icon-wrapper" style={{color: '#f59e0b'}}><TugasIcon /></div>
          <div className="menu-text">{t('mission_center', 'Pusat Misi')}</div>
          <div className="arrow-right">›</div>
        </div>
        
        <hr className="menu-divider" />
        
        <div className="menu-category-label">{t('personal_tools', 'Alat Pribadi')}</div>
        <div className="menu-item-tiktok" onClick={() => navTo('/settings')}>
          <div className="icon-wrapper"><span className="material-icons">settings</span></div>
          <div className="menu-text">{t('settings', 'Pengaturan')}</div>
          <div className="arrow-right">›</div>
        </div>
      </aside>
    </>
  );
};

export default React.memo(SidebarMenu);
