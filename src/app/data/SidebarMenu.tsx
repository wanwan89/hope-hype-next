'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
};

// SVG Icons
const DompetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 7V5c0-1.103-.897-2-2-2H5C3.346 3 2 4.346 2 6v12c0 2.201 1.794 3 3 3h15c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2m-2 9h-2v-4h2zM5 7a1.001 1.001 0 0 1 0-2h13v2z"/>
  </svg>
);

const VipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <path fill="currentColor" d="M11.5 3a.5.5 0 0 0-.464.686l2 5A.5.5 0 0 0 13.5 9h4a.5.5 0 0 0 .429-.757l-3-5A.5.5 0 0 0 14.5 3z"/>
    <path fill="currentColor" d="M5.5 3a.5.5 0 0 0-.429.243l-3 5A.5.5 0 0 0 2.5 9h4a.5.5 0 0 0 .464-.314l2-5A.5.5 0 0 0 8.5 3z"/>
    <path fill="currentColor" d="M8.5 3a.5.5 0 0 0-.464.314l-2 5A.5.5 0 0 0 6.5 9h7a.5.5 0 0 0 .464-.686l-2-5A.5.5 0 0 0 11.5 3z"/>
    <path fill="currentColor" d="M13.5 8a.5.5 0 0 0-.466.319l-3.5 9a.5.5 0 0 0 .85.501l7.5-9A.5.5 0 0 0 17.5 8z"/>
    <path fill="currentColor" d="M2.5 8a.5.5 0 0 0-.384.82l7.5 9a.5.5 0 0 0 .85-.501l-3.5-9A.5.5 0 0 0 6.5 8z"/>
    <path fill="currentColor" d="M6.16 8s-.222.387-.126.681l3.5 9a.5.5 0 0 0 .932 0l3.5-9C14.091 8.36 13.84 8 13.84 8z"/>
    <path fill="currentColor" fillOpacity=".7" fillRule="evenodd" d="M5.071 3.243A.5.5 0 0 1 5.5 3h9a.5.5 0 0 1 .429.243l2.996 4.993a.5.5 0 0 1-.04.584l-7.498 8.997l-.043.046a.5.5 0 0 1-.731-.046L2.119 8.823a.5.5 0 0 1-.047-.582z" clipRule="evenodd"/>
  </svg>
);

const TugasIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 22q-.825 0-1.412-.587T3 20V6q0-.825.588-1.412T5 4h1V2h2v2h8V2h2v2h1q.825 0 1.413.588T21 6v14q0 .825-.587 1.413T19 22zm0-2h14V10H5z"/>
  </svg>
);

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
        style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
      />
      
      <aside className={`p-sidebar-panel ${isOpen ? 'open' : ''}`}>
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