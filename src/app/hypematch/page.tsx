'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import HypeMatchOpening from '@/components/HypeMatch/HypeMatchOpening';
import MatchSuccessOverlay from '@/components/HypeMatch/MatchSuccessOverlay';
import BiodataSlide from '@/components/HypeMatch/BiodataSlide';
import Lottie from 'lottie-react';
import fireAnimation from '@/assets/lottie/fire.json';
import emptyAnimation from '@/assets/lottie/empty.json';

import './HypeMatchOverlay.css';

export type MatchUser = {
  id: string;
  username: string;
  avatar_url: string;
  bio_hype: string;
  gender: string;
  umur?: number | string;
  pekerjaan?: string;
  hobi?: string;
  zodiak?: string;
  lokasi?: string;
  foto_tambahan?: string[];
  pendidikan?: string;
  minat?: string[];
  preferensi?: string;
  tinggi_badan?: number;
  bahasa?: string[];
  agama?: string;
  merokok?: string;
  alkohol?: string;
  olahraga?: string;
  tujuan?: string;
  ig_username?: string;
  spotify_url?: string;
  tiktok_username?: string;
  role?: string;
};

const SvgIcon = ({ name, className = "", size = 20, style }: { name: string, className?: string, size?: number, style?: React.CSSProperties }) => {
  const stroke = "currentColor";
  const fill = "none";
  const strokeWidth = "2";

  const icons: Record<string, React.ReactNode> = {
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
    filter: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" />,
    location: <><path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {icons[name] || icons.location}
    </svg>
  );
};

export default function HypeMatch() {
  const router = useRouter();

  const [users, setUsers] = useState<MatchUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [matchedUser, setMatchedUser] = useState<MatchUser | null>(null);
  const [showBiodata, setShowBiodata] = useState(false);

  const dragRef = useRef({ startX: 0, startY: 0, isDragging: false });
  const activeUser = users?.[currentIndex];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data: authData } = await supabase.auth.getUser();
        let myId = null;
        let myGender = null;

        if (authData?.user) {
          myId = authData.user.id;
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('gender, avatar_url')
            .eq('id', myId)
            .single();

          setCurrentUser({
            id: myId,
            avatar_url: myProfile?.avatar_url || authData.user.user_metadata?.avatar_url || 'https://via.placeholder.com/150',
          });

          if (myProfile) myGender = myProfile.gender;
        }

        // UPDATE QUERY: Mengambil data dari profiles + JOIN ke user_bios
        let query = supabase
          .from('profiles')
          .select(`
            id, username, avatar_url, gender, umur, hobi, zodiak,
            lokasi, minat, preferensi, bahasa, ig_username, spotify_url, tiktok_username, role,
            user_bios (
              bio_hype, pendidikan, occupation, tinggi_badan, 
              agama, merokok, alkohol, olahraga, tujuan, photos
            )
          `)
          .limit(10);

        if (myId) query = query.neq('id', myId);

        if (myGender) {
          const genderLower = myGender.toLowerCase();
          if (genderLower === 'laki-laki' || genderLower === 'pria') {
            query = query.in('gender', ['Perempuan', 'Wanita']);
          } else if (genderLower === 'perempuan' || genderLower === 'wanita') {
            query = query.in('gender', ['Laki-laki', 'Pria']);
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          // UPDATE MAPPING: Gabungkan data dari profiles dan user_bios menjadi satu object flat
          const cleanUsers = data.map((profile: any) => ({
            id: profile.id,
            username: profile.username || 'Anonim',
            avatar_url: profile.avatar_url,
            gender: profile.gender,
            umur: profile.umur,
            lokasi: profile.lokasi,
            role: profile.role,
            hobi: profile.hobi,
            zodiak: profile.zodiak,
            minat: profile.minat,
            preferensi: profile.preferensi,
            bahasa: profile.bahasa,
            ig_username: profile.ig_username,
            spotify_url: profile.spotify_url,
            tiktok_username: profile.tiktok_username,

            // Data dari tabel user_bios (dengan fallback)
            bio_hype: profile.user_bios?.bio_hype || '',
            pendidikan: profile.user_bios?.pendidikan || '',
            pekerjaan: profile.user_bios?.occupation || '', // di mapped sbg 'pekerjaan' dari field 'occupation'
            tinggi_badan: profile.user_bios?.tinggi_badan || null,
            agama: profile.user_bios?.agama || '',
            merokok: profile.user_bios?.merokok || '',
            alkohol: profile.user_bios?.alkohol || '',
            olahraga: profile.user_bios?.olahraga || '',
            tujuan: profile.user_bios?.tujuan || '',
            foto_tambahan: profile.user_bios?.photos || [],
          }));
          
          setUsers(cleanUsers);
        }
      } catch (error) {
        console.error('Gagal mengambil data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDragStart = (clientX: number, clientY: number) => {
    if (showBiodata) return;
    dragRef.current = { startX: clientX, startY: clientY, isDragging: true };
  };

  const handleDragMove = (clientX: number) => {
    if (!dragRef.current.isDragging) return;
    setDragX(clientX - dragRef.current.startX);
  };

  const handleDragEnd = () => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;

    const threshold = 100;
    if (dragX < -threshold) {
      handleAction('pass');
    } else if (dragX > threshold) {
      handleAction('like');
    } else {
      setDragX(0);
    }
  };

  const handleAction = async (action: 'like' | 'pass') => {
    if (!activeUser || !currentUser) return;
    setDragX(action === 'like' ? 500 : -500);

    if (action === 'like') {
      try {
        await supabase.from('user_likes').upsert({
          user_id: currentUser.id,
          liked_user_id: activeUser.id,
        }, { onConflict: 'user_id,liked_user_id' });

        const { data: matchData } = await supabase
          .from('user_likes')
          .select('id')
          .eq('user_id', activeUser.id)
          .eq('liked_user_id', currentUser.id)
          .maybeSingle();

        if (matchData) {
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
          showNotif('Kamu mendapatkan Match baru!', 'success');
          setTimeout(() => { setMatchedUser(activeUser); }, 300);
          return;
        }
      } catch (err) {
        console.error("Gagal memproses like:", err);
      }
    }

    setTimeout(() => {
      nextCard();
    }, 300);
  };

  const nextCard = () => {
    setDragX(0);
    setShowBiodata(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleChatNow = () => {
    if (matchedUser) {
      router.push(`/hypetalk/room?from=${matchedUser.id}`);
    }
  };

  if (showIntro) return <HypeMatchOpening onComplete={() => setShowIntro(false)} />;
  if (isLoading) return <div className="hm-loading"><h2>Memuat Data...</h2></div>;

  const stackedUsers = users.slice(currentIndex, currentIndex + 3);
  const likeBtnScale = 1 + (dragX > 0 ? Math.min(dragX / 300, 0.3) : 0);
  const passBtnScale = 1 + (dragX < 0 ? Math.min(Math.abs(dragX) / 300, 0.3) : 0);

  return (
    <div className="hm-overlay">
      {/* Font Poppins */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap');
      `}</style>

      <div className="hm-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <h1
            className="hm-logo-text"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "1.6rem",       
              color: "#FF1493",
              letterSpacing: "0px",
              textTransform: "lowercase",
              margin: 0,
              lineHeight: 1,
              textShadow: "none"
            }}
          >
            hypematch
          </h1>
          <Lottie
            animationData={fireAnimation}
            loop={true}
            style={{ width: 28, height: 28, marginTop: '-2px' }}
          />
        </div>

        <button className="hm-icon-btn-transparent" onClick={() => router.push('/hypematch/filter')}>
          <SvgIcon name="filter" size={26} />
        </button>
      </div>

      <div className="hm-stack-container">
        {stackedUsers.length > 0 ? (
          stackedUsers.map((user, idx) => {
            const isTop = idx === 0;
            const bgColors = ['var(--bg-card)', 'var(--bg-secondary)', 'var(--border-card)'];

            return (
              <div
                key={user.id}
                className="hm-card-item"
                style={{
                  backgroundColor: bgColors[idx % bgColors.length],
                  zIndex: 10 - idx,
                  transform: isTop
                    ? `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`
                    : `scale(${1 - idx * 0.04}) translateY(${idx * 15}px)`,
                  opacity: 1 - (idx * 0.1),
                  transition: (isTop && dragRef.current.isDragging) ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease',
                }}
                onMouseDown={(e) => isTop && handleDragStart(e.clientX, e.clientY)}
                onMouseMove={(e) => isTop && handleDragMove(e.clientX)}
                onMouseUp={() => isTop && handleDragEnd()}
                onMouseLeave={() => isTop && handleDragEnd()}
                onTouchStart={(e) => isTop && handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => isTop && handleDragMove(e.touches[0].clientX)}
                onTouchEnd={() => isTop && handleDragEnd()}
              >
                <img src={user.avatar_url || 'https://via.placeholder.com/400x600'} alt="avatar" className="hm-card-img" draggable="false" />

                {isTop && (
                  <>
                    <div className="swipe-stamp stamp-like" style={{ opacity: dragX > 50 ? (dragX / 100) : 0 }}>LIKE</div>
                    <div className="swipe-stamp stamp-pass" style={{ opacity: dragX < -50 ? (Math.abs(dragX) / 100) : 0 }}>NOPE</div>
                  </>
                )}

                <div className="hm-card-info-overlay">
                  <h2 className="hm-card-title">
                    {user.username} {user.umur && <span>{user.umur}</span>}
                    {user.role && <div className="hm-role-badge-wrapper" dangerouslySetInnerHTML={{ __html: getUserBadge(user.role) as string }} />}
                  </h2>
                  <div className="hm-card-pills">
                    <div className="hm-pill"><SvgIcon name="location" size={14} style={{ marginRight: 4 }} /> {user.lokasi || "Lokasi disembunyikan"}</div>
                    {user.tujuan && <div className="hm-pill"><SvgIcon name="target" size={14} style={{ marginRight: 4 }} />{user.tujuan}</div>}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="hm-empty-state">
            <Lottie
              animationData={emptyAnimation}
              loop={true}
              style={{ width: 120, height: 120, margin: '0 auto 16px' }}
            />
            <p>Tidak ada lagi pengguna di sekitarmu.</p>
          </div>
        )}

        {activeUser && (
          <div className="hm-fixed-action-bar">
            {/* Tombol X (Pass) - Warna Merah */}
            <button className="hm-action-btn btn-pass" onClick={(e) => { e.stopPropagation(); handleAction('pass'); }} style={{ transform: `scale(${passBtnScale})` }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <path fill="#FF3B30" d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10s10-4.486 10-10S17.514 2 12 2m4.207 12.793l-1.414 1.414L12 13.414l-2.793 2.793l-1.414-1.414L10.586 12L7.793 9.207l1.414-1.414L12 10.586l2.793-2.793l1.414 1.414L13.414 12z" />
              </svg>
            </button>

            {/* Tombol Panah Atas (Biodata) - Warna Biru */}
            <button className="hm-action-btn btn-fire" onClick={(e) => { e.stopPropagation(); setShowBiodata(true); }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <path fill="#007AFF" d="M11 11.8V15q0 .425.288.713T12 16t.713-.288T13 15v-3.2l.9.9q.275.275.7.275t.7-.275t.275-.7t-.275-.7l-2.6-2.6q-.3-.3-.7-.3t-.7.3l-2.6 2.6q-.275.275-.275.7t.275.7t.7.275t.7-.275zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22" />
              </svg>
            </button>

            {/* Tombol Love (Like) - Warna Hijau */}
            <button className="hm-action-btn btn-like" onClick={(e) => { e.stopPropagation(); handleAction('like'); }} style={{ transform: `scale(${likeBtnScale})` }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <path fill="#34C759" d="M12 2C6.47 2 2 6.5 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2M9.75 7.82c.87 0 1.7.41 2.25 1.05c.55-.64 1.38-1.05 2.25-1.05c1.54 0 2.75 1.21 2.75 2.75c0 1.89-1.7 3.43-4.28 5.77L12 17l-.72-.66C8.7 14 7 12.46 7 10.57c0-1.54 1.21-2.75 2.75-2.75" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <BiodataSlide
        activeUser={activeUser}
        showBiodata={showBiodata}
        setShowBiodata={setShowBiodata}
      />

      <MatchSuccessOverlay
        matchedUser={matchedUser}
        currentUser={currentUser}
        onChatNow={handleChatNow}
        nextCard={nextCard}
        setMatchedUser={setMatchedUser}
      />
    </div>
  );
}
