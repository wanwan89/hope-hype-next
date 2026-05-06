'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import confetti from 'canvas-confetti';
import './dailycek.css';

export default function PusatMisiPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSecurity, setShowSecurity] = useState(false);
  const [visitorId, setVisitorId] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dailyProgress, setDailyProgress] = useState({ listen: 0, like: 0, comment: 0, upload: 0 });
  const [claimedTypes, setClaimedTypes] = useState<string[]>([]);

  const REWARDS = [50, 50, 100, 50, 50, 100, 300];
  const MISSIONS = {
    listen: { target: 3, reward: 30, type: 'mission_listen' },
    like: { target: 5, reward: 25, type: 'mission_like' },
    comment: { target: 3, reward: 40, type: 'mission_comment' },
    upload: { target: 1, reward: 100, type: 'mission_upload' },
  };

  useEffect(() => {
    initMisi();
    // Handle PWA Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const initMisi = async () => {
    try {
      // 1. Ambil Fingerprint & IP
      const fp = await FingerprintJS.load();
      const { visitorId: vid } = await fp.get();
      setVisitorId(vid);

      const ipRes = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipRes.json();

      // 2. Auth Check
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');

      // 3. Load Profile
      const { data: prof, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error) throw error;

      // 4. Security Check (Device Multi-Account)
      const { data: dupe } = await supabase.from('profiles').select('id').eq('device_id', vid).neq('id', session.user.id).limit(1);
      if (dupe && dupe.length > 0) {
        setShowSecurity(true);
        return;
      }

      setProfile(prof);
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

    const ls = parseInt(localStorage.getItem('hh_daily_listens') || '0');
    setDailyProgress({
      listen: ls,
      like: likes.count || 0,
      comment: comments.count || 0,
      upload: uploads.count || 0
    });
    setClaimedTypes(claims.data?.map(c => c.transaction_type) || []);
  };

  // 🔥 CORE UPDATE LOGIC
  const secureUpdate = async (updateObj: any, history: any) => {
    try {
      const { error: pErr } = await supabase.from('profiles').update({ ...updateObj, device_id: visitorId }).eq('id', profile.id);
      if (pErr) throw pErr;
      await supabase.from('coin_history').insert({ user_id: profile.id, ...history });
      
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      showNotif(`Hadiah diklaim! +${history.amount} Koin`, "success");
      initMisi(); // Refresh data
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

  if (showSecurity) return (
    <div className="security-overlay">
      <span className="material-icons" style={{fontSize:'64px', color:'#ff4757'}}>shield</span>
      <h2>Akses Dibatasi</h2>
      <p>1 Perangkat hanya boleh untuk 1 akun misi.</p>
    </div>
  );

  return (
    <div className="mission-wrapper">
      <div className="mission-container">
        
        {/* HEADER */}
        <header className="mission-header">
          <button className="back-btn" onClick={() => router.back()}>
            <span className="material-icons">arrow_back_ios</span>
          </button>
          <h1 className="header-title">Pusat Misi</h1>
          <div className="header-coin">
            <span className="material-icons" style={{color:'#f59e0b', fontSize:'18px'}}>monetization_on</span>
            <span style={{color:'#f59e0b'}}>{profile?.mission_coins || 0}</span>
          </div>
        </header>

        {/* EXCHANGE */}
        <div className="mission-card" style={{background:'linear-gradient(135deg, #1e293b, #0f172a)', border:'none', color:'white'}}>
           <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
              <div className="m-icon-box" style={{background:'#38bdf8'}}><span className="material-icons">swap_horiz</span></div>
              <div style={{flex:1}}>
                 <h4 style={{fontSize:'0.9rem'}}>Tukar Koin Misi</h4>
                 <p style={{fontSize:'0.75rem', opacity:0.7}}>1000 Misi → 10 Hope</p>
                 <p style={{fontSize:'0.7rem', marginTop:4}}>Saldo Hope: <b style={{color:'#38bdf8'}}>{profile?.coins || 0}</b></p>
              </div>
              <button className="m-btn" onClick={handleExchange} style={{background:'#38bdf8', color:'white', border:'none'}}>Tukar</button>
           </div>
        </div>

        {/* CHECK-IN */}
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

        {/* MISI HARIAN */}
        <h3 className="section-title">Misi Harian</h3>
        <div className="mission-list">
          {Object.entries(MISSIONS).map(([key, m]) => {
            const current = dailyProgress[key as keyof typeof dailyProgress] || 0;
            const isDone = claimedTypes.includes(m.type);
            const canClaim = current >= m.target && !isDone;

            return (
              <div className="mission-item" key={key}>
                <div className={`m-icon-box bg-${key === 'listen' ? 'blue' : key === 'like' ? 'pink' : key === 'comment' ? 'green' : 'purple'}`}>
                   <span className="material-icons" style={{fontSize:'20px'}}>
                      {key === 'listen' ? 'headset' : key === 'like' ? 'favorite' : key === 'comment' ? 'chat' : 'cloud_upload'}
                   </span>
                </div>
                <div className="m-info">
                  <h4 className="m-title">{key.toUpperCase()} {m.target}X</h4>
                  <div className="m-reward"><div className="coin-dot" /> +{m.reward} Koin</div>
                  <div className="progress-bar"><div className="progress-fill" style={{width: `${(current/m.target)*100}%`}} /></div>
                  <span className="progress-text">{current}/{m.target}</span>
                </div>
                <button 
                  className={`m-btn ${canClaim ? 'btn-klaim' : isDone ? 'btn-done' : ''}`}
                  onClick={() => canClaim && secureUpdate({ mission_coins: profile.mission_coins + m.reward }, { type:'masuk', transaction_type: m.type, amount: m.reward, description:'Misi Harian' })}
                >
                  {isDone ? 'Selesai' : canClaim ? 'Klaim' : 'Mulai'}
                </button>
              </div>
            );
          })}
        </div>

        {/* INSTALL PWA */}
        {!profile?.apk_downloaded && (
          <>
            <h3 className="section-title">Misi Pemula</h3>
            <div className="mission-list">
              <div className="mission-item">
                <div className="m-icon-box" style={{background:'#10b981'}}><span className="material-icons">install_mobile</span></div>
                <div className="m-info">
                  <h4 className="m-title">Instal Aplikasi HopeHype</h4>
                  <div className="m-reward">+300 Koin</div>
                  <p style={{fontSize:'0.7rem', color:'gray'}}>Akses lebih cepat & ringan</p>
                </div>
                <button className="m-btn btn-klaim" onClick={handlePwaInstall}>Instal</button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
