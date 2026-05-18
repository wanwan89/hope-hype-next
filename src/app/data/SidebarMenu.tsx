'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
};

const SidebarMenu: React.FC<Props> = ({ isOpen, onClose, t }) => {
  const router = useRouter();

  const navTo = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleShareProfile = () => {
    onClose();
    // share logic akan diambil dari parent, tapi di sini kita panggil window.openGlobalShare
    if (window.openGlobalShare) {
      window.openGlobalShare(window.location.href, `Profil`, undefined, '');
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      <div className={`p-sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
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
          <div className="icon-wrapper"><span className="material-icons">toll</span></div>
          <div className="menu-text">{t('hypecoin_balance', 'Saldo Hypecoin')}</div>
          <div className="arrow-right">›</div>
        </div>
        <div className="menu-item-tiktok" onClick={() => navTo('/historycoin')}>
          <div className="icon-wrapper"><span className="material-icons">receipt_long</span></div>
          <div className="menu-text">{t('transaction_history', 'Riwayat Transaksi')}</div>
          <div className="arrow-right">›</div>
        </div>
        <div className="menu-item-tiktok" onClick={() => navTo('/vip')}>
          <div className="icon-wrapper" style={{color: '#f59e0b'}}><span className="material-icons">diamond</span></div>
          <div className="menu-text">{t('vip_subscription', 'Langganan VIP')}</div>
          <div className="arrow-right">›</div>
        </div>
        <div className="menu-category-label">{t('mission_rewards', 'Misi & Hadiah')}</div>
        <div className="menu-item-tiktok" onClick={() => navTo('/dailycek')}>
          <div className="icon-wrapper" style={{color: '#f59e0b'}}><span className="material-icons">emoji_events</span></div>
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
        <div className="menu-item-tiktok" onClick={() => navTo('/contact')}>
          <div className="icon-wrapper"><span className="material-icons">support_agent</span></div>
          <div className="menu-text">{t('contact_us', 'Hubungi Kami')}</div>
          <div className="arrow-right">›</div>
        </div>
        <div className="menu-item-tiktok" onClick={handleShareProfile}>
          <div className="icon-wrapper"><span className="material-icons">ios_share</span></div>
          <div className="menu-text">{t('share_profile', 'Bagikan Profil')}</div>
          <div className="arrow-right">›</div>
        </div>
        <div className="menu-item-tiktok logout" onClick={handleLogout}>
          <div className="icon-wrapper"><span className="material-icons">power_settings_new</span></div>
          <div className="menu-text">{t('logout', 'Keluar')}</div>
        </div>
      </aside>
    </>
  );
};

export default React.memo(SidebarMenu);