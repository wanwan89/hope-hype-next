'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Cropper from 'react-easy-crop'; 
import { getCroppedImg, showNotif } from '@/lib/ui-utils';
// 🔥 FIX 1: Import i18n hook
import { useTranslation } from 'react-i18next';
import './PostModal.css';

const CLOUDINARY_CLOUD_NAME = "dhhmkb8kl";
const CLOUDINARY_UPLOAD_PRESET = "post_hope";

interface PostModalProps {
  onClose: () => void;
}

export default function PostModal({ onClose }: PostModalProps) {
  // 🔥 FIX 2: Inisialisasi translate hook
  const { t } = useTranslation();

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
    onClose();
    document.body.style.overflow = "";
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
    // 🔥 FIX i18n Alert
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
        
        {/* UI EDITOR CROP */}
        {imageForCrop && (
          <div className="crop-overlay-wrapper">
            <div className="crop-container-box">
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
            <div className="crop-footer-controls">
              <div className="zoom-slider">
                <span className="material-icons">remove</span>
                <input 
                  type="range" 
                  value={zoom} 
                  min={1} 
                  max={3} 
                  step={0.1} 
                  onChange={(e) => setZoom(Number(e.target.value))} 
                />
                <span className="material-icons">add</span>
              </div>
              <div className="crop-action-btns">
                {/* 🔥 FIX i18n Crop Buttons */}
                <button type="button" className="crop-cancel" onClick={() => setImageForCrop(null)}>{t('crop_cancel')}</button>
                <button type="button" className="crop-confirm" onClick={handleSaveCrop}>{t('crop_confirm')}</button>
              </div>
            </div>
          </div>
        )}

        <button type="button" className="post-close-btn" onClick={handleClose}>&times;</button>

        <h2 className="post-modal-title">{t('post_modal_title')}</h2>
        <p className="post-modal-subtitle">{t('post_modal_subtitle')}</p>

        <form onSubmit={handleSubmit} className="post-form">
          <div className="destination-container">
            <p className="section-label">{t('send_to')}</p>
            <div className="dest-toggle-group">
              {[
                { id: 'feed', title: t('feed_title'), desc: t('feed_desc') },
                { id: 'story', title: t('story_title'), desc: t('story_desc') }
              ].map((dest) => (
                <label key={dest.id} className="dest-option">
                  <input 
                    type="radio" 
                    name="postDestination" 
                    value={dest.id} 
                    checked={destination === dest.id} 
                    onChange={() => setDestination(dest.id as any)} 
                  />
                  <div className="dest-content">
                    <div className="dest-icon-box">
                      {dest.id === 'feed' ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      )}
                    </div>
                    <div className="dest-text">
                      <span className="dest-title">{dest.title}</span>
                      <span className="dest-desc">{dest.desc}</span>
                    </div>
                    <div className="dest-check"></div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="post-type-toggle">
            <button type="button" className={`type-btn ${postType === 'image' ? 'active' : ''}`} onClick={() => setPostType('image')}>{t('type_photo')}</button>
            <button type="button" className={`type-btn ${postType === 'text' ? 'active' : ''}`} onClick={() => setPostType('text')}>{t('type_text')}</button>
          </div>

          {postType === 'image' && (
            <div className="post-upload-area" onClick={() => fileInputRef.current?.click()}>
              <input type="file" ref={fileInputRef} accept="image/*" hidden onChange={handleFileChange} />
              {!previewUrl ? (
                <div className="post-upload-placeholder">
                  <span className="post-upload-text">{t('choose_photo')}</span>
                  <small>{t('upload_limit')}</small>
                </div>
              ) : (
                <img src={previewUrl} className="post-preview-image" alt="Preview" style={{ objectFit: 'cover' }} />
              )}
            </div>
          )}

          <textarea 
            className="post-textarea" 
            placeholder={postType === 'image' ? t('placeholder_caption') : t('placeholder_thought')} 
            maxLength={300}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <div style={{ position: 'relative', marginTop: '15px' }}>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="post-select-custom"
              style={{
                width: '100%', padding: '12px 15px', border: '1px solid #ccc', borderRadius: '8px', appearance: 'none', WebkitAppearance: 'none', backgroundColor: '#fff', fontSize: '15px', color: '#333', cursor: 'pointer', outline: 'none', fontWeight: '500'
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
            <i style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#888', fontSize: '12px' }}>▼</i>
          </div>

          <div className="music-picker-section" style={{ marginTop: '20px' }}>
            <div className="section-label-bold">{t('select_music_optional')}</div>
            {!selectedMusic ? (
              <>
                <input 
                  type="text" 
                  placeholder={t('search_music')} 
                  className="music-search-input"
                  value={searchMusic}
                  onChange={(e) => setSearchMusic(e.target.value)}
                />
                <div className="music-list-scroll">
                  {isSearching && <p style={{textAlign:'center', fontSize:'12px', padding: '10px'}}>{t('searching')}</p>}
                  {musicResults.map((song, i) => (
                    <div key={i} className="dest-content" style={{padding:'8px', marginBottom:0, cursor:'pointer', alignItems: 'center'}} onClick={() => setSelectedMusic(song)}>
                      <div style={{position: 'relative', width: 38, height: 38, marginRight: 12, flexShrink: 0}}>
                        <img src={song.artworkUrl100} style={{width:'100%', height:'100%', borderRadius:8}} />
                        <div onClick={(e) => togglePlayPreview(song.previewUrl, e)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-icons" style={{color: '#fff', fontSize: '20px'}}>{playingUrl === song.previewUrl ? 'pause' : 'play_arrow'}</span>
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
                  <button type="button" onClick={() => togglePlayPreview(selectedMusic.previewUrl)} style={{ background: 'var(--primary-blue)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <span className="material-icons" style={{ color: '#fff', fontSize: '18px' }}>{playingUrl === selectedMusic.previewUrl ? 'pause' : 'play_arrow'}</span>
                  </button>
                  <div>
                    <span className="audio-tag">AUDIO</span>
                    <div className="music-title-text">{selectedMusic.trackName} — {selectedMusic.artistName}</div>
                  </div>
                </div>
                <button type="button" className="remove-music-link" onClick={() => { if(playingUrl === selectedMusic.previewUrl) togglePlayPreview(selectedMusic.previewUrl); setSelectedMusic(null); }}>{t('remove_music')}</button>
              </div>
            )}
          </div>

          <button type="submit" className="post-submit-btn" disabled={isSubmitting} style={{ marginTop: '20px' }}>
            {isSubmitting ? t('btn_uploading') : t('btn_submit_post')}
          </button>
        </form>
      </div>
    </div>
  );
}
