'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface SearchHeaderProps {
  initialQuery: string;
  onSearch: (keyword: string) => void;
}

export default function SearchHeader({ initialQuery, onSearch }: SearchHeaderProps) {
  const router = useRouter();
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Update local query jika URL berubah
  useEffect(() => {
    setLocalQuery(initialQuery);
    setShowSuggestions(false);
  }, [initialQuery]);

  // Fetch saran pencarian (autocomplete)
  useEffect(() => {
    if (localQuery.trim().length > 1 && localQuery !== initialQuery) {
      fetchSuggestions(localQuery);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSearchSuggestions([]);
    }
  }, [localQuery, initialQuery]);

  const fetchSuggestions = async (text: string) => {
    try {
      const { data } = await supabase
        .from('search_history')
        .select('query')
        .ilike('query', `%${text}%`)
        .limit(30);
        
      if (data) {
        const uniqueSuggestions = Array.from(new Set(data.map(item => item.query.toLowerCase())));
        setSearchSuggestions(uniqueSuggestions.slice(0, 6));
      }
    } catch (err) {
      console.error("Gagal mengambil saran", err);
    }
  };

  const handleSearchEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && localQuery.trim() !== '') {
      setShowSuggestions(false);
      onSearch(localQuery);
    }
  };

  const executeSuggestion = (keyword: string) => {
    setLocalQuery(keyword);
    setShowSuggestions(false);
    onSearch(keyword);
  };

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--bg-main)',
      padding: '12px 20px',
      borderBottom: '1px solid var(--border-card)',
      display: 'flex', alignItems: 'center', gap: '15px'
    }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <span className="material-icons">arrow_back</span>
      </button>
      
      <div ref={wrapperRef} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span className="material-icons" style={{ position: 'absolute', left: '12px', color: isFocused ? 'var(--primary)' : 'var(--text-muted)', fontSize: '18px', zIndex: 2, transition: 'color 0.3s ease' }}>search</span>
        <input 
          type="text" 
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={handleSearchEnter}
          onFocus={() => { 
            setIsFocused(true);
            if (localQuery.length > 1) setShowSuggestions(true); 
          }}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Cari kreator, postingan, #hashtag..."
          style={{ 
            width: '100%', padding: '10px 15px 10px 38px', borderRadius: '24px', 
            background: 'var(--bg-input)', color: 'var(--text-main)', 
            border: '1px solid var(--border-card)',
            boxShadow: isFocused ? '0 0 0 3px var(--primary-soft)' : 'none',
            transition: 'box-shadow 0.3s ease',
            fontSize: '14px', outline: 'none', position: 'relative', zIndex: 1
          }}
        />

        {showSuggestions && searchSuggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '48px', left: 0, right: 0,
            background: 'var(--bg-card)', borderRadius: '16px',
            border: '1px solid var(--border-card)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 100,
            display: 'flex', flexDirection: 'column'
          }}>
            {searchSuggestions.map((sugg, idx) => (
              <div 
                key={idx}
                onMouseDown={() => executeSuggestion(sugg)} 
                style={{
                  padding: '12px 16px', color: 'var(--text-main)', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                  borderBottom: idx === searchSuggestions.length - 1 ? 'none' : '1px solid var(--border-card)'
                }}
              >
                <span className="material-icons" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>search</span>
                <span>
                  {sugg.split(new RegExp(`(${localQuery})`, 'gi')).map((part, i) => 
                    part.toLowerCase() === localQuery.toLowerCase() ? <strong key={i} style={{ color: 'var(--primary)' }}>{part}</strong> : <span key={i} style={{ color: 'var(--text-muted)' }}>{part}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
