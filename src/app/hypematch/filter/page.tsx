'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HypeMatchFilter() {
  const router = useRouter();
  
  // 1. State untuk Filter
  const [genderFilter, setGenderFilter] = useState('Semua');
  const [ageRange, setAgeRange] = useState([18, 40]);
  const [maxDistance, setMaxDistance] = useState(50); // Filter baru: Jarak dalam km
  const [goal, setGoal] = useState('Semua'); // Filter baru: Tujuan

  // 2. Load data dari LocalStorage saat halaman pertama kali dibuka
  useEffect(() => {
    const savedGender = localStorage.getItem('hm_filter_gender');
    const savedAge = localStorage.getItem('hm_filter_age');
    const savedDistance = localStorage.getItem('hm_filter_distance');
    const savedGoal = localStorage.getItem('hm_filter_goal');

    if (savedGender) setGenderFilter(savedGender);
    if (savedAge) setAgeRange(JSON.parse(savedAge));
    if (savedDistance) setMaxDistance(parseInt(savedDistance, 10));
    if (savedGoal) setGoal(savedGoal);
  }, []);

  // 3. Simpan data ke LocalStorage saat tombol Terapkan ditekan
  const handleApply = () => {
    localStorage.setItem('hm_filter_gender', genderFilter);
    localStorage.setItem('hm_filter_age', JSON.stringify(ageRange));
    localStorage.setItem('hm_filter_distance', maxDistance.toString());
    localStorage.setItem('hm_filter_goal', goal);

    // Di sini kamu bisa tambahkan logika Context / Supabase jika perlu
    
    router.back();
  };

  // Warna Aksen Biru
  const ACCENT_COLOR = '#007AFF'; // Warna biru ala iOS/Modern
  const ACCENT_BG = 'rgba(0, 122, 255, 0.1)';
  const ACCENT_SHADOW = 'rgba(0, 122, 255, 0.25)';

  return (
    <div 
      style={{ 
        backgroundColor: 'var(--bg-main, #ffffff)', 
        color: 'var(--text-main, #111111)', 
        minHeight: '100vh', 
        padding: '20px' 
      }}
    >
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <button 
          onClick={() => router.back()} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-main)', 
            cursor: 'pointer', 
            marginRight: '15px',
            display: 'flex',
            alignItems: 'center',
            padding: '5px'
          }}
        >
          {/* Icon Back */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Filter Pencarian</h2>
      </div>

      {/* Filter Options Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Filter 1: Gender Preference */}
        <div>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted, #757575)', marginBottom: '12px', fontWeight: '500' }}>
            Tampilkan kepadaku
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['Laki-laki', 'Perempuan', 'Semua'].map((g) => {
              const isActive = genderFilter === g;
              return (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  style={{
                    flex: 1,
                    padding: '12px 10px',
                    borderRadius: '12px',
                    border: isActive ? `2px solid ${ACCENT_COLOR}` : '1px solid var(--border-color, #e0e0e0)',
                    backgroundColor: isActive ? ACCENT_BG : 'var(--bg-secondary, #f5f5f5)',
                    color: isActive ? ACCENT_COLOR : 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter 2: Age Range */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted, #757575)', margin: 0, fontWeight: '500' }}>
              Batas Usia Maksimal
            </h3>
            <span style={{ fontWeight: '700', color: ACCENT_COLOR }}>
              {ageRange[1]} Tahun
            </span>
          </div>
          <input 
            type="range" 
            min="18" 
            max="60" 
            value={ageRange[1]} 
            onChange={(e) => setAgeRange([18, parseInt(e.target.value)])}
            style={{ 
              width: '100%', 
              accentColor: ACCENT_COLOR,
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Filter 3: Maksimal Jarak */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted, #757575)', margin: 0, fontWeight: '500' }}>
              Jarak Maksimal
            </h3>
            <span style={{ fontWeight: '700', color: ACCENT_COLOR }}>
              {maxDistance} km
            </span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={maxDistance} 
            onChange={(e) => setMaxDistance(parseInt(e.target.value))}
            style={{ 
              width: '100%', 
              accentColor: ACCENT_COLOR,
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Filter 4: Tujuan */}
        <div>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted, #757575)', marginBottom: '12px', fontWeight: '500' }}>
            Tujuan
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['Semua', 'Teman Baru', 'Kencan Santai', 'Hubungan Serius'].map((tujuan) => {
              const isActive = goal === tujuan;
              return (
                <button
                  key={tujuan}
                  onClick={() => setGoal(tujuan)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '20px', // Style pil/chip membulat
                    border: isActive ? `2px solid ${ACCENT_COLOR}` : '1px solid var(--border-color, #e0e0e0)',
                    backgroundColor: isActive ? ACCENT_BG : 'var(--bg-secondary, #f5f5f5)',
                    color: isActive ? ACCENT_COLOR : 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {tujuan}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Spacer agar tidak mentok bawah sebelum tombol */}
      <div style={{ height: '40px' }}></div>

      {/* Terapkan Button */}
      <button 
        onClick={handleApply}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: ACCENT_COLOR,
          color: '#ffffff',
          border: 'none',
          borderRadius: '100px', // Pil melengkung penuh
          fontSize: '1.05rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: `0 8px 20px ${ACCENT_SHADOW}`,
          position: 'sticky',
          bottom: '20px', // Supaya tetap mengambang di bawah jika layar di scroll
          transition: 'transform 0.1s ease'
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
        onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        Terapkan Filter
      </button>

    </div>
  );
}
