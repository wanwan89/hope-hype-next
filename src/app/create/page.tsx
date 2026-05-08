'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Cropper from 'react-easy-crop'; 
import { getCroppedImg, showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import './Create.css'; 

const CLOUDINARY_CLOUD_NAME = "dhhmkb8kl";
const CLOUDINARY_UPLOAD_PRESET = "post_hope";

export default function CreatePostPage() {
  const { t } = useTranslation();
  const router = useRouter(); 

  const [postType, setPostType] = useState<'image' | 'text'>('image');
  const [destination, setDestination] = useState<'feed' | 'story'>('feed');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Karya');
  
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageForCrop, setImageForCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [searchMusic, setSearchMusic] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageForCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!imageForCrop || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageForCrop, croppedAreaPixels);
      setSelectedFile(croppedBlob);
      setPreviewUrl(URL.createObjectURL(croppedBlob));
      setImageForCrop(null);
    } catch (e) {
      console.error("Error Cropping:", e);
    }
  };

  const togglePlayPreview = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setPlayingUrl(url);
      audioRef.current.onended = () => setPlayingUrl(null);
    }
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    router.back(); 
  };

  const uploadToCloudinary = async (file: File | Blob) => {
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
      alert(t('alert_empty_post'));
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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // 🔥 FIX: Menggunakan warna CSS Variables supaya ikut Dark/Light Mode
    <div className="create-page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '80px', paddingTop: 'env(safe-area-inset-top, 20px)' }}>
      
      {/* Header Page */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
        <button type="button" onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, margin: 0 }}>Buat Postingan</h2>
        <div style={{ width: 28 }}></div> 
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        
        {/* UI EDITOR CROP TETAP (Ini wajar gelap karena overlay crop emang bagusnya gelap) */}
        {imageForCrop && (
          <div className="crop-overlay-wrapper" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }}>
            <div className="crop-container-box" style={{ position: 'relative', width: '100%', height: 'calc(100vh - 120px)' }}>
              <Cropper
                image={imageForCrop}
                crop={crop}
                zoom={zoom}
                aspect={3 / 4}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="crop-footer-controls" style={{ position: 'absolute', bottom: 0, width: '100%', padding: '20px', background: 'rgba(0,0,0,0.8)' }}>
              <div className="zoom-slider" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#fff' }}>
                <span className="material-icons">remove</span>
                <input 
                  type="range" 
                  value={zoom} 
                  min={1} 
                  max={3} 
                  step={0.1} 
                  onChange={(e) => setZoom(Number(e.target.value))} 
                  style={{ flex: 1 }}
                />
                <span className="material-icons">add</span>
              </div>
              <div className="crop-action-btns" style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="crop-cancel" onClick={() => setImageForCrop(null)} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#333', color: '#fff', border: 'none', fontWeight: 600 }}>{t('crop_cancel')}</button>
                <button type="button" className="crop-confirm" onClick={handleSaveCrop} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#1f3cff', color: '#fff', border: 'none', fontWeight: 600 }}>{t('crop_confirm')}</button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="post-form">
          <div className="destination-container">
            <p className="section-label" style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>{t('send_to')}</p>
            <div className="dest-toggle-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { id: 'feed', title: t('feed_title'), desc: t('feed_desc') },
                { id: 'story', title: t('story_title'), desc: t('story_desc') }
              ].map((dest) => (
                <label key={dest.id} className="dest-option" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', border: destination === dest.id ? '2px solid #1f3cff' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input 
                    type="radio" 
                    name="postDestination" 
                    value={dest.id} 
                    checked={destination === dest.id} 
                    onChange={() => setDestination(dest.id as any)} 
                    style={{ display: 'none' }}
                  />
                  <div className="dest-content" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '15px', padding: 0, background: 'transparent', border: 'none' }}>
                    <div className="dest-icon-box" style={{ width: '40px', height: '40px', background: destination === dest.id ? '#1f3cff' : 'var(--bg-card)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: destination === dest.id ? '#fff' : 'var(--text-muted)' }}>
                      {dest.id === 'feed' ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      )}
                    </div>
                    <div className="dest-text" style={{ flex: 1 }}>
                      <div className="dest-title" style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 700 }}>{dest.title}</div>
                      <div className="dest-desc" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{dest.desc}</div>
                    </div>
                    <div className="dest-check" style={{ width: '20px', height: '20px', borderRadius: '50%', border: destination === dest.id ? '6px solid #1f3cff' : '2px solid var(--border-card)' }}></div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="post-type-toggle" style={{ display: 'flex', gap: '10px', marginTop: '20px', background: 'var(--bg-secondary)', padding: '5px', borderRadius: '12px' }}>
            <button type="button" className={`type-btn ${postType === 'image' ? 'active' : ''}`} onClick={() => setPostType('image')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: postType === 'image' ? 'var(--bg-input)' : 'transparent', color: postType === 'image' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>{t('type_photo')}</button>
            <button type="button" className={`type-btn ${postType === 'text' ? 'active' : ''}`} onClick={() => setPostType('text')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: postType === 'text' ? 'var(--bg-input)' : 'transparent', color: postType === 'text' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>{t('type_text')}</button>
          </div>

          {postType === 'image' && (
            <div className="post-upload-area" onClick={() => fileInputRef.current?.click()} style={{ marginTop: '20px', width: '100%', height: '300px', background: 'var(--bg-secondary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', border: '2px dashed var(--border-card)' }}>
              <input type="file" ref={fileInputRef} accept="image/*" hidden onChange={handleFileChange} />
              {!previewUrl ? (
                <div className="post-upload-placeholder" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <span className="material-icons" style={{ fontSize: '40px', marginBottom: '10px', color: '#1f3cff' }}>add_photo_alternate</span>
                  <div className="post-upload-text" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>{t('choose_photo')}</div>
                  <small style={{ fontSize: '12px' }}>{t('upload_limit')}</small>
                </div>
              ) : (
                <img src={previewUrl} className="post-preview-image" alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
          )}

          <textarea 
            className="post-textarea" 
            placeholder={postType === 'image' ? t('placeholder_caption') : t('placeholder_thought')} 
            maxLength={300}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            style={{ width: '100%', minHeight: '120px', background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: '16px', padding: '15px', color: 'var(--text-main)', fontSize: '15px', marginTop: '20px', outline: 'none', resize: 'vertical' }}
          />

          <div style={{ position: 'relative', marginTop: '20px' }}>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="post-select-custom"
              style={{
                width: '100%', padding: '15px', border: '1px solid var(--border-card)', borderRadius: '12px', appearance: 'none', WebkitAppearance: 'none', backgroundColor: 'var(--bg-secondary)', fontSize: '15px', color: 'var(--text-main)', cursor: 'pointer', outline: 'none', fontWeight: '600'
              }}
            >
              {[
                { val: "Karya", label: t('cat_karya') },
                { val: "Prestasi", label: t('cat_prestasi') },
                { val: "Photography", label: t('cat_photo') },
                { val: "Mountain", label: t('cat_mountain') },
                { val: "Thread", label: t('cat_thread') }
              ].map(opt => (
                <option key={opt.val} value={opt.val}>{opt.label}</option>
              ))}
            </select>
            <i style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '12px' }}>▼</i>
          </div>

          <div className="music-picker-section" style={{ marginTop: '25px', background: 'var(--bg-secondary)', padding: '15px', borderRadius: '16px' }}>
            <div className="section-label-bold" style={{ color: 'var(--text-main)', fontWeight: 700, marginBottom: '15px' }}>{t('select_music_optional')}</div>
            {!selectedMusic ? (
              <>
                <div style={{ position: 'relative' }}>
                  <span className="material-icons" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '20px' }}>search</span>
                  <input 
                    type="text" 
                    placeholder={t('search_music')} 
                    className="music-search-input"
                    value={searchMusic}
                    onChange={(e) => setSearchMusic(e.target.value)}
                    style={{ width: '100%', padding: '12px 15px 12px 40px', borderRadius: '10px', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div className="music-list-scroll" style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '15px' }}>
                  {isSearching && <p style={{textAlign:'center', fontSize:'12px', padding: '10px', color: 'var(--text-muted)'}}>{t('searching')}</p>}
                  {musicResults.map((song, i) => (
                    <div key={i} className="dest-content" style={{display: 'flex', padding:'10px', borderRadius: '10px', cursor:'pointer', alignItems: 'center', transition: 'background 0.2s', background: 'transparent', border: 'none'}} onClick={() => setSelectedMusic(song)}>
                      <div style={{position: 'relative', width: 45, height: 45, marginRight: 15, flexShrink: 0}}>
                        <img src={song.artworkUrl100} style={{width:'100%', height:'100%', borderRadius:10, objectFit: 'cover'}} />
                        <div onClick={(e) => togglePlayPreview(song.previewUrl, e)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-icons" style={{color: '#fff', fontSize: '24px'}}>{playingUrl === song.previewUrl ? 'pause' : 'play_arrow'}</span>
                        </div>
                      </div>
                      <div style={{flex:1, overflow:'hidden'}}>
                        <div style={{fontSize:14, fontWeight:700, color: 'var(--text-main)', whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden'}}>{song.trackName}</div>
                        <div style={{fontSize:12, color:'var(--text-muted)'}}>{song.artistName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="selected-music-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <div className="music-info-mini" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button type="button" onClick={() => togglePlayPreview(selectedMusic.previewUrl)} style={{ background: '#1f3cff', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <span className="material-icons" style={{ color: '#fff', fontSize: '20px' }}>{playingUrl === selectedMusic.previewUrl ? 'pause' : 'play_arrow'}</span>
                  </button>
                  <div>
                    <span className="audio-tag" style={{ fontSize: '10px', background: 'var(--bg-card)', color: 'var(--text-main)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>AUDIO</span>
                    <div className="music-title-text" style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>{selectedMusic.trackName} — {selectedMusic.artistName}</div>
                  </div>
                </div>
                <button type="button" className="remove-music-link" onClick={() => { if(playingUrl === selectedMusic.previewUrl) togglePlayPreview(selectedMusic.previewUrl); setSelectedMusic(null); }} style={{ background: 'transparent', border: 'none', color: '#ff4757', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>{t('remove_music')}</button>
              </div>
            )}
          </div>

          <button type="submit" className="post-submit-btn" disabled={isSubmitting} style={{ marginTop: '30px', width: '100%', padding: '16px', background: isSubmitting ? 'var(--bg-input)' : '#1f3cff', color: isSubmitting ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 800, cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: isSubmitting ? 'none' : '0 8px 20px rgba(31, 60, 255, 0.3)' }}>
            {isSubmitting ? t('btn_uploading') : t('btn_submit_post')}
          </button>
        </form>
      </div>
    </div>
  );
}
