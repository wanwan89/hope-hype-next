'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import './PostModal.css';

const CLOUDINARY_CLOUD_NAME = "dhhmkb8kl";
const CLOUDINARY_UPLOAD_PRESET = "post_hope";

interface PostModalProps {
  onClose: () => void;
}

export default function PostModal({ onClose }: PostModalProps) {
  const [postType, setPostType] = useState<'image' | 'text'>('image');
  const [destination, setDestination] = useState<'feed' | 'story'>('feed');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Karya');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchMusic, setSearchMusic] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔥 Tambahan State untuk Audio Preview
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // iTunes Music Search Logic
  useEffect(() => {
    if (!searchMusic.trim()) {
      setMusicResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchMusic)}&media=music&limit=10`);
        const data = await res.json();
        setMusicResults(data.results || []);
      } catch (err) {
        console.error("Music Search Error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchMusic]);

  // 🔥 Fungsi Toggle Play/Pause Audio
  const togglePlayPreview = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Biar gak auto-select pas mau preview doang

    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setPlayingUrl(url);
      
      audioRef.current.onended = () => setPlayingUrl(null);
    }
  };

  // 🔥 Cleanup audio pas modal ditutup
  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    onClose();
    document.body.style.overflow = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: fd
    });
    return await res.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !caption.trim()) {
      alert("Isi konten atau pilih foto dulu!");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.dispatchEvent(new CustomEvent('openLogin'));
        return;
      }

      let imageUrl = null;
      if (selectedFile && postType === 'image') {
        const cData = await uploadToCloudinary(selectedFile);
        imageUrl = cData.secure_url;
      }

      if (destination === "story") {
        await supabase.from("stories").insert({
          creator_id: session.user.id,
          image_url: imageUrl,
          content: caption,
          audio_src: selectedMusic?.previewUrl,
          title: selectedMusic?.trackName,
          artist: selectedMusic?.artistName
        });
      } else {
        const { data: prof } = await supabase.from("profiles").select("username").eq("id", session.user.id).single();
        await supabase.from("posts").insert({
          creator_id: session.user.id,
          name: prof?.username || "User",
          bio: caption,
          category: category,
          image_url: imageUrl,
          audio_src: selectedMusic?.previewUrl,
          title: selectedMusic?.trackName,
          artist: selectedMusic?.artistName,
          status: "pending"
        });
      }

      handleClose();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`post-modal active`}>
      <div className="post-modal-content">
        <button type="button" className="post-close-btn" onClick={handleClose}>&times;</button>

        <h2 className="post-modal-title">Upload Post</h2>
        <p className="post-modal-subtitle">Karya kamu akan dikirim untuk direview dulu ya</p>

        <form onSubmit={handleSubmit} className="post-form">
          
          <div className="destination-container">
            <p className="section-label">Kirim Ke:</p>
            <div className="dest-toggle-group">
              {['feed', 'story'].map((dest) => (
                <label key={dest} className="dest-option">
                  <input 
                    type="radio" 
                    name="postDestination" 
                    value={dest} 
                    checked={destination === dest} 
                    onChange={() => setDestination(dest as any)} 
                  />
                  <div className="dest-content">
                    <div className="dest-icon-box">
                      {dest === 'feed' ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      )}
                    </div>
                    <div className="dest-text">
                      <span className="dest-title">{dest === 'feed' ? 'Post Utama' : 'Cerita'}</span>
                      <span className="dest-desc">{dest === 'feed' ? 'Masuk ke feed & profil' : 'Hilang dalam 24 jam'}</span>
                    </div>
                    <div className="dest-check"></div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="post-type-toggle">
            <button type="button" className={`type-btn ${postType === 'image' ? 'active' : ''}`} onClick={() => setPostType('image')}>Foto</button>
            <button type="button" className={`type-btn ${postType === 'text' ? 'active' : ''}`} onClick={() => setPostType('text')}>Teks Saja</button>
          </div>

          {postType === 'image' && (
            <div className="post-upload-area" onClick={() => fileInputRef.current?.click()}>
              <input type="file" ref={fileInputRef} accept="image/*" hidden onChange={handleFileChange} />
              {!previewUrl ? (
                <div className="post-upload-placeholder">
                  <span className="post-upload-text">Pilih foto karya</span>
                  <small>JPG, PNG, WEBP • Max 5MB</small>
                </div>
              ) : (
                <img src={previewUrl} className="post-preview-image" alt="Preview" />
              )}
            </div>
          )}

          <textarea 
            className="post-textarea" 
            placeholder={postType === 'image' ? "Tulis caption menarik..." : "Tulis apa yang kamu pikirkan..."} 
            maxLength={300}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <div style={{ position: 'relative', marginTop: '15px' }}>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '1px solid #ccc',
                borderRadius: '8px',
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundColor: '#fff',
                fontSize: '15px',
                color: '#333',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: '500'
              }}
            >
              {["Karya", "Prestasi", "Photography", "Mountain", "Thread"].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <i style={{ 
              position: 'absolute', 
              right: '15px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              pointerEvents: 'none', 
              color: '#888',
              fontSize: '12px'
            }}>▼</i>
          </div>

          <div className="music-picker-section" style={{ marginTop: '20px' }}>
            <div className="section-label-bold">Pilih Musik (Opsional)</div>
            {!selectedMusic ? (
              <>
                <input 
                  type="text" 
                  placeholder="Cari musik..." 
                  className="music-search-input"
                  value={searchMusic}
                  onChange={(e) => setSearchMusic(e.target.value)}
                />
                <div className="music-list-scroll">
                  {isSearching && <p style={{textAlign:'center', fontSize:'12px', padding: '10px'}}>Mencari...</p>}
                  {musicResults.map((song, i) => (
                    <div key={i} className="dest-content" style={{padding:'8px', marginBottom:0, cursor:'pointer', alignItems: 'center'}} onClick={() => setSelectedMusic(song)}>
                      <div style={{position: 'relative', width: 38, height: 38, marginRight: 12, flexShrink: 0}}>
                        <img src={song.artworkUrl100} style={{width:'100%', height:'100%', borderRadius:8}} />
                        {/* Tombol Play/Pause Overlay */}
                        <div 
                          onClick={(e) => togglePlayPreview(song.previewUrl, e)}
                          style={{
                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', 
                            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <span className="material-icons" style={{color: '#fff', fontSize: '20px'}}>
                            {playingUrl === song.previewUrl ? 'pause' : 'play_arrow'}
                          </span>
                        </div>
                      </div>
                      <div style={{flex:1, overflow:'hidden'}}>
                        <div style={{fontSize:13, fontWeight:700, whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden'}}>{song.trackName}</div>
                        <div style={{fontSize:11, color:'gray'}}>{song.artistName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="selected-music-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="music-info-mini" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => togglePlayPreview(selectedMusic.previewUrl)}
                    style={{ background: 'var(--primary-blue)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <span className="material-icons" style={{ color: '#fff', fontSize: '18px' }}>
                      {playingUrl === selectedMusic.previewUrl ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                  <div>
                    <span className="audio-tag">AUDIO</span>
                    <div className="music-title-text">{selectedMusic.trackName} — {selectedMusic.artistName}</div>
                  </div>
                </div>
                <button type="button" className="remove-music-link" onClick={() => { 
                  if(playingUrl === selectedMusic.previewUrl) togglePlayPreview(selectedMusic.previewUrl);
                  setSelectedMusic(null);
                }}>HAPUS</button>
              </div>
            )}
          </div>

          <button type="submit" className="post-submit-btn" disabled={isSubmitting} style={{ marginTop: '20px' }}>
            {isSubmitting ? "Mengunggah..." : "Kirim ke Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
