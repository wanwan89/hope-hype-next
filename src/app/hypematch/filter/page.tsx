 // app/hypematch/filter/page.tsx
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import './HypeMatchFilter.css'; // Opsional jika butuh styling khusus

export default function HypeMatchFilter() {
  const router = useRouter();
  
  // State untuk filter sederhana (Bisa disesuaikan dengan kebutuhan Supabase nantinya)
  const [genderFilter, setGenderFilter] = useState('Semua');
  const [ageRange, setAgeRange] = useState([18, 40]);

  const handleApply = () => {
    // Di sini kamu bisa simpan filter ke LocalStorage, Context, atau Supabase
    router.back();
  };

  return (
    <div style={{ backgroundColor: '#111', color: '#fff', minHeight: '100vh', padding: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginRight: '15px' }}
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
          <h3 style={{ fontSize: '1rem', color: '#aaa', marginBottom: '10px' }}>Tampilkan kepadaku</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['Laki-laki', 'Perempuan', 'Semua'].map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: genderFilter === g ? '2px solid #ff4b4b' : '1px solid #333',
                  backgroundColor: genderFilter === g ? 'rgba(255, 75, 75, 0.1)' : '#222',
                  color: genderFilter === g ? '#ff4b4b' : '#fff',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Age Range (Mockup) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '1rem', color: '#aaa', margin: 0 }}>Rentang Usia</h3>
            <span style={{ fontWeight: 'bold' }}>{ageRange[0]} - {ageRange[1]}</span>
          </div>
          <input 
            type="range" 
            min="18" 
            max="60" 
            value={ageRange[1]} 
            onChange={(e) => setAgeRange([ageRange[0], parseInt(e.target.value)])}
            style={{ width: '100%', accentColor: '#ff4b4b' }}
          />
        </div>

      </div>

      {/* Terapkan Button */}
      <button 
        onClick={handleApply}
        style={{
          width: '100%',
          padding: '15px',
          marginTop: '40px',
          backgroundColor: '#ff4b4b',
          color: 'white',
          border: 'none',
          borderRadius: '25px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Terapkan Filter
      </button>

    </div>
  );
}
