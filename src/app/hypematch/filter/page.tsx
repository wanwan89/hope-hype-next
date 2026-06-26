// app/hypematch/filter/page.tsx
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HypeMatchFilter() {
  const router = useRouter();
  
  const [genderFilter, setGenderFilter] = useState('Semua');
  const [ageRange, setAgeRange] = useState([18, 40]);

  const handleApply = () => {
    // Simpan filter ke LocalStorage, Context, atau Supabase di sini
    router.back();
  };

  return (
    <div 
      style={{ 
        backgroundColor: 'var(--bg-main)', 
        color: 'var(--text-main)', 
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
            alignItems: 'center'
          }}
        >
          {/* Icon Back */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Filter Pencarian</h2>
      </div>

      {/* Filter Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* Gender Preference */}
        <div>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '500' }}>
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
                    padding: '14px 12px',
                    borderRadius: '12px',
                    // Jika aktif pakai warna accent brand (#ff4b4b), jika tidak pakai token border/input global
                    border: isActive ? '2px solid #ff4b4b' : '1px solid var(--bg-secondary)',
                    backgroundColor: isActive ? 'rgba(255, 75, 75, 0.1)' : 'var(--bg-input)',
                    color: isActive ? '#ff4b4b' : 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem'
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Age Range */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', margin: 0, fontWeight: '500' }}>
              Rentang Usia
            </h3>
            <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
              {ageRange[0]} - {ageRange[1]}
            </span>
          </div>
          <input 
            type="range" 
            min="18" 
            max="60" 
            value={ageRange[1]} 
            onChange={(e) => setAgeRange([ageRange[0], parseInt(e.target.value)])}
            style={{ 
              width: '100%', 
              accentColor: '#ff4b4b',
              cursor: 'pointer'
            }}
          />
        </div>

      </div>

      {/* Terapkan Button */}
      <button 
        onClick={handleApply}
        style={{
          width: '100%',
          padding: '16px',
          marginTop: '40px',
          backgroundColor: '#ff4b4b',
          color: '#ffffff',
          border: 'none',
          borderRadius: '100px', // Membuat pil melengkung sempurna (Simpel & Modern)
          fontSize: '1.05rem',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(255, 75, 75, 0.2)'
        }}
      >
        Terapkan Filter
      </button>

    </div>
  );
}
