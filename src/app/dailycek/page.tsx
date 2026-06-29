'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import confetti from 'canvas-confetti';
import './dailycek.css';

declare global {
  interface Window {
    openGlobalShare?: (url?: string, title?: string, text?: string, name?: string) => void;
  }
}

function MisiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSecurity, setShowSecurity] = useState(false);
  const [visitorId, setVisitorId] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const [dailyProgress, setDailyProgress] = useState({ like: 0, comment: 0, upload: 0 });
  const [claimedTypes, setClaimedTypes] = useState<string[]>([]);
  
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  const REWARDS = [50, 50, 100, 50, 50, 100, 300];
  
  const MISSIONS = {
    like: { target: 5, reward: 25, type: 'mission_like', icon: 'favorite', color: '#ec4899' },
    comment: { target: 3, reward: 40, type: 'mission_comment', icon: 'chat', color: '#10b981' },
    upload: { target: 1, reward: 100, type: 'mission_upload', icon: 'cloud_upload', color: '#8b5cf6' },
  };

  useEffect(() => {
    initMisi();
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const initMisi = async () => {
    try {
      const fp = await FingerprintJS.load();
      const { visitorId: vid } = await fp.get();
      setVisitorId(vid);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');

      const { data: prof, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error) throw error;

      const { data: dupe } = await supabase.from('profiles').select('id').eq('device_id', vid).neq('id', session.user.id).limit(1);
      if (dupe && dupe.length > 0) {
        setShowSecurity(true);
        return;
      }

      let currentProfile = prof;
      if (!currentProfile.invite_code) {
         const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
         await supabase.from('profiles').update({ invite_code: newCode }).eq('id', session.user.id);
         currentProfile.invite_code = newCode;
      }

      setProfile(currentProfile);
      await loadDailyProgress(session.user.id);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      showNotif("Gagal memuat data misi", "error");
    }
  };

  const loadDailyProgress = async (uid: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isoDate = today.toISOString();

    const [likes, comments, uploads, claims] = await Promise.all([
      supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', uid).gte('created_at', isoDate),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', uid).gte('created_at', isoDate),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('creator_id', uid).gte('created_at', isoDate),
      supabase.from('coin_history').select('transaction_type').eq('user_id', uid).gte('created_at', isoDate)
    ]);

    setDailyProgress({
      like: likes.count || 0,
      comment: comments.count || 0,
      upload: uploads.count || 0
    });
    setClaimedTypes(claims.data?.map(c => c.transaction_type) || []);
  };

  const secureUpdate = async (updateObj: any, history: any) => {
    try {
      const { error: pErr } = await supabase.from('profiles').update({ ...updateObj, device_id: visitorId }).eq('id', profile.id);
      if (pErr) throw pErr;
      await supabase.from('coin_history').insert({ user_id: profile.id, ...history });
      
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      showNotif(`Hadiah diklaim! +${history.amount} Koin`, "success");
      initMisi(); 
    } catch (err: any) {
      showNotif(err.message, "error");
    }
  };

  const handleCheckin = async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    
    let streak = profile.checkin_streak || 0;
    if (profile.last_checkin !== yesterday && profile.last_checkin !== today) streak = 0;
    if (streak >= 7) streak = 0;

    const newStreak = streak + 1;
    const reward = REWARDS[newStreak - 1];

    await secureUpdate(
      { mission_coins: (profile.mission_coins || 0) + reward, last_checkin: today, checkin_streak: newStreak },
      { type: 'masuk', transaction_type: 'checkin', amount: reward, description: `Checkin Hari ${newStreak}` }
    );
  };

  const handleExchange = async () => {
    if (profile.mission_coins < 1000) return showNotif("Koin misi minimal 1000", "warning");
    if (!confirm("Tukar 1000 Koin Misi ke 10 Hope?")) return;

    await secureUpdate(
      { mission_coins: profile.mission_coins - 1000, coins: (profile.coins || 0) + 10 },
      { type: 'masuk', transaction_type: 'exchange', amount: 10, description: 'Tukar koin misi' }
    );
  };

  const handlePwaInstall = async () => {
    if (!deferredPrompt) return showNotif("Gunakan Chrome/Edge untuk instal", "info");
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      await secureUpdate(
        { mission_coins: (profile.mission_coins + 300), apk_downloaded: true },
        { type: 'masuk', transaction_type: 'mission_apk', amount: 300, description: 'Instal Aplikasi' }
      );
    }
  };

  const handleClaimInviteCode = async () => {
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) return showNotif("Masukkan kode teman", "warning");
    if (code === profile.invite_code) return showNotif("Tidak bisa memakai kodemu sendiri", "error");
    
    setIsSubmittingInvite(true);
    try {
      const { data: friend, error: fErr } = await supabase.from('profiles').select('id, mission_coins').eq('invite_code', code).single();
      if (fErr || !friend) throw new Error("Kode tidak ditemukan atau salah");

      const { error: uErr } = await supabase.from('profiles').update({
        referred_by: code,
        mission_coins: (profile.mission_coins || 0) + 200,
        device_id: visitorId
      }).eq('id', profile.id);
      if (uErr) throw uErr;

      await supabase.from('profiles').update({
        mission_coins: (friend.mission_coins || 0) + 500
      }).eq('id', friend.id);

      await supabase.from('coin_history').insert([
        { user_id: profile.id, type: 'masuk', transaction_type: 'referral_used', amount: 200, description: 'Memakai kode undangan' },
        { user_id: friend.id, type: 'masuk', transaction_type: 'referral_bonus', amount: 500, description: 'Teman memakai kodemu' }
      ]);

      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      showNotif("Berhasil! +200 Koin Misi", "success");
      initMisi();
    } catch (err: any) {
      showNotif(err.message, "error");
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleShareLink = () => {
    const link = `${window.location.origin}/dailycek?ref=${profile?.invite_code}`;
    const textDesc = `Yuk gabung HypeTalk dan klaim hadiah koin misi! Masukkan kode undanganku: ${profile?.invite_code}`;
    
    if (window.openGlobalShare) {
      window.openGlobalShare(link, 'Undang Teman HypeTalk', textDesc, profile?.username);
    } else {
      navigator.clipboard.writeText(link);
      showNotif("Link disalin!", "success");
    }
  };

  if (showSecurity) return (
    <div className="security-overlay">
      <span className="material-icons" style={{fontSize:'64px', color:'#ff4757'}}>shield</span>
      <h2>Akses Dibatasi</h2>
      <p>1 Perangkat hanya boleh untuk 1 akun misi.</p>
    </div>
  );

  if (isLoading) return null;

  return (
    <div className="mission-wrapper">
      <div className="mission-container">

        {/* 🔥 STRUKTUR BARU: BUNGKUS HEADER & EXCHANGE AGAR TETAP DI ATAS */}
        <div className="sticky-top-wrapper">
          <header className="mission-header">
            <button className="back-btn" onClick={() => router.back()}>
              <span className="material-icons">arrow_back_ios</span>
            </button>
            <h1 className="header-title">Pusat Misi</h1>
            <div className="header-coin">
              <span style={{color:'#f59e0b', fontSize: '15px'}}>{profile?.mission_coins || 0}</span>
            </div>
          </header>

          <div className="exchange-card-wrapper">
            <div className="mission-card exchange">
               <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                  <div className="m-icon-box" style={{background:'#38bdf8'}}><span className="material-icons">swap_horiz</span></div>
                  <div style={{flex:1}}>
                     <h4 style={{fontSize:'0.9rem'}}>Tukar Koin Misi</h4>
                     <p style={{fontSize:'0.75rem', opacity:0.7}}>1000 Misi → 10 Hope</p>
                     <p style={{fontSize:'0.7rem', marginTop:4}}>Saldo Hope: <b style={{color:'#38bdf8'}}>{profile?.coins || 0}</b></p>
                  </div>
                  <button className="m-btn btn-klaim" onClick={handleExchange} style={{background:'#38bdf8', color:'white', border:'none'}}>Tukar</button>
               </div>
            </div>
          </div>
        </div>

        {/* 🔥 AREA SCROLL BAGIAN BAWAH (BIAR BISA DIGULIR) */}
        <div className="mission-scroll-area">
          
          <div className="mission-card">
            <h2 className="streak-title">Check-in 7 Hari</h2>
            <p className="streak-desc">Klaim koin gratis tiap hari!</p>
            <div className="streak-days-container">
              {REWARDS.map((rew, i) => {
                const isDone = (i + 1) <= (profile?.checkin_streak || 0) && profile?.last_checkin === new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Jakarta'});
                const isActive = (i + 1) === ((profile?.checkin_streak || 0) + 1) && !isDone;
                return (
                  <div key={i} className={`day-card ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                    <span className="day-label">Hari {i+1}</span>
                    <span className="material-icons" style={{color:'#f59e0b', margin:'5px 0'}}>stars</span>
                    <span className="day-reward">+{rew}</span>
                  </div>
                );
              })}
            </div>
            <button 
              className="claim-main-btn" 
              disabled={profile?.last_checkin === new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Jakarta'})}
              onClick={handleCheckin}
            >
              {profile?.last_checkin === new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Jakarta'}) ? 'Sudah Check-in' : 'Ambil Hadiah'}
            </button>
          </div>

          <h3 className="section-title">Misi Pemula</h3>
          <div className="mission-list">
            {!profile?.apk_downloaded && (
              <div className="mission-item">
                <div className="m-icon-box" style={{background:'#10b981'}}><span className="material-icons">install_mobile</span></div>
                <div className="m-info">
                  <h4 className="m-title">Instal Aplikasi</h4>
                  <div className="m-reward">+300 Koin</div>
                </div>
                <button className="m-btn btn-klaim" onClick={handlePwaInstall}>Instal</button>
              </div>
            )}

            <div className="mission-item" style={{ flexWrap: 'wrap' }}>
              <div className="m-icon-box" style={{background:'#f97316'}}><span className="material-icons">card_giftcard</span></div>
              <div className="m-info">
                <h4 className="m-title">Masukkan Kode Undangan</h4>
                {!profile?.referred_by ? (
                  <input 
                    type="text" 
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                    placeholder="Kode teman..." 
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '13px', 
                      borderRadius: '8px', border: '1px solid var(--border-card)', 
                      background: 'var(--bg-main)', color: 'var(--text-main)', 
                      outline: 'none', marginTop: '6px'
                    }} 
                  />
                ) : (
                  <span className="progress-text" style={{color: '#10b981'}}>✓ Berhasil diklaim</span>
                )}
              </div>
              {!profile?.referred_by && (
                <button className="m-btn btn-klaim" onClick={handleClaimInviteCode} disabled={isSubmittingInvite}>Klaim</button>
              )}
            </div>
          </div>

          <h3 className="section-title">Misi Harian</h3>
          <div className="mission-list">
            {Object.entries(MISSIONS).map(([key, m]) => {
              const current = dailyProgress[key as keyof typeof dailyProgress] || 0;
              const isDone = claimedTypes.includes(m.type);
              const canClaim = current >= m.target && !isDone;

              return (
                <div className="mission-item" key={key}>
                  <div className="m-icon-box" style={{ backgroundColor: m.color }}>
                     <span className="material-icons" style={{ fontSize: '20px', color: 'white' }}>{m.icon}</span>
                  </div>
                  <div className="m-info">
                    <h4 className="m-title">{key.toUpperCase()} {m.target}X</h4>
                    <div className="m-reward">+{m.reward} Koin</div>
                    <div className="progress-bar"><div className="progress-fill" style={{width: `${Math.min((current/m.target)*100, 100)}%`}} /></div>
                  </div>
                  <button 
                    className={`m-btn ${canClaim ? 'btn-klaim' : isDone ? 'btn-done' : ''}`}
                    onClick={() => {
                      if (isDone) return;
                      if (canClaim) secureUpdate({ mission_coins: profile.mission_coins + m.reward }, { type:'masuk', transaction_type: m.type, amount: m.reward, description:'Misi Harian' });
                      else router.push('/');
                    }}
                  >
                    {isDone ? 'Selesai' : canClaim ? 'Klaim' : 'Mulai'}
                  </button>
                </div>
              );
            })}
          </div>

          <h3 className="section-title" style={{ marginTop: '1.25rem' }}>Program Referral</h3>
          <div className="mission-list" style={{ marginBottom: '2rem' }}>
            <div className="mission-item">
              <div className="m-icon-box" style={{background: '#ef4444'}}><span className="material-icons">group_add</span></div>
              <div className="m-info">
                <h4 className="m-title">Undang & Dapat Koin</h4>
                <div className="m-reward">+500 Koin / Teman</div>
                <span className="progress-text">Kode: <b style={{color: 'var(--primary)', fontFamily: 'monospace'}}>{profile?.invite_code || '...'}</b></span>
              </div>
              <button className="m-btn" onClick={handleShareLink}>Bagikan</button>
            </div>
          </div>

        </div> 
      </div>
    </div>
  );
}

export default function PusatMisiPage() {
  return (
    <Suspense fallback={null}>
      <MisiContent />
    </Suspense>
  );
}