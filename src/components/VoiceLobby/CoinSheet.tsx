'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';

interface CoinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onSuccess: () => void;
}

export default function CoinSheet({ isOpen, onClose, currentUser, onSuccess }: CoinSheetProps) {
  const { t } = useTranslation();
  
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [customCoinAmount, setCustomCoinAmount] = useState('');
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);

  const loadMidtransForce = () => {
    return new Promise((resolve) => {
      if ((window as any).snap) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
      script.setAttribute("data-client-key", "SB-Mid-client-0T6dD0H1HkQvBf8G");
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const handleBuyCoin = async (price: number, coinsAmount: number, itemName: string) => {
    if (!currentUser) return showNotif(t('loading_data'), "error");
    
    setLoadingPackage(coinsAmount);
    setIsProcessingPayment(true);
    
    try {
      showNotif(t('preparing_pay'), "info");
      await loadMidtransForce();
      
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId: currentUser.id, amount: price, coins: coinsAmount, item_name: itemName }),
      });
      
      if (!response.ok) throw new Error(t('payment_service_error'));
      
      const result = await response.json();
      (window as any).snap.pay(result.token, {
        onSuccess: () => {
          showNotif(t('pay_success'), "success");
          onClose();
          onSuccess(); // Refresh user data
        },
        onPending: async () => {
          showNotif(t('pay_pending'), "warning");
          await supabase.from("notifications").insert({
            user_id: currentUser.id, type: "payment_pending",
            message: `Transaksi ${itemName} tertunda. Klik untuk bayar.`,
            is_read: false, token: result.token
          });
        },
        onError: () => showNotif(t('pay_failed'), "error"),
        onClose: async () => {
          showNotif(t('pay_closed'), "info");
        }
      });
    } catch (err: any) { 
      showNotif(err.message, "error"); 
    } finally { 
      setIsProcessingPayment(false); 
      setLoadingPackage(null); 
    }
  };

  const handleCustomCoinBuy = () => {
    const coins = parseInt(customCoinAmount);
    if (!coins || coins <= 0) return showNotif(t('invalid_coin_amount'), "warning");
    if (coins < 100) return showNotif(t('min_topup_warning'), "warning");
    if (coins > 10000) return showNotif(t('max_topup_warning'), "warning");
    
    handleBuyCoin(coins * 100, coins, `${coins} Koin Custom`);
  };

  return (
    <div className={`voice-bottom-sheet ${isOpen ? 'active' : ''}`}>
      <div className="voice-sheet-overlay" onClick={onClose}></div>
      <div className="voice-sheet-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="drag-handle"></div>
        <h3>{t('topup_title')}</h3>

        {[100, 300, 700].map(amt => (
          <div key={amt} className="coin-product-card" onClick={() => handleBuyCoin(amt * 100, amt, `${amt} Koin`)}>
            <div className="product-info-wrapper">
              <div className="product-icon">
                <img src="/asets/svg/koin.webp" alt="Koin" style={{width: '24px'}} />
              </div>
              <div className="product-text">
                <span className="p-name">{amt} Koin</span>
                <span className="p-price">Rp {(amt * 100).toLocaleString('id-ID')}</span>
              </div>
            </div>
            <button className={`buy-coin-btn ${loadingPackage === amt ? 'btn-loading' : ''}`} disabled={isProcessingPayment}>
              {t('buy')}
            </button>
          </div>
        ))}

        <div style={{
          width: '100%', height: '90px', borderRadius: '16px', margin: '16px 0',
          backgroundImage: 'url("@/assets/png/topup.webp")', backgroundSize: 'cover',
          backgroundPosition: 'center', boxShadow: 'none'
        }}></div>

        <div className="custom-topup">
          <h4>{t('custom_topup_title')}</h4>
          <input
            type="number" placeholder={t('custom_placeholder')}
            value={customCoinAmount} onChange={(e) => setCustomCoinAmount(e.target.value)}
          />
          {customCoinAmount && (
            <span style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'-5px', display:'block'}}>
              {t('price_label')}: <b style={{color: 'var(--primary)'}}>Rp {(parseInt(customCoinAmount) * 100).toLocaleString('id-ID')}</b>
            </span>
          )}
          <button
            id="buy-custom-coin-btn"
            className={loadingPackage === parseInt(customCoinAmount) ? 'btn-loading' : ''}
            onClick={handleCustomCoinBuy} disabled={isProcessingPayment}
            style={{marginTop: '10px'}}
          >
            {t('buy_custom')}
          </button>
        </div>

      </div>
    </div>
  );
}
