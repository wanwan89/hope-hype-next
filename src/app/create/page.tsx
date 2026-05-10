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

type FlowStep = 'pick' | 'edit' | 'post';

export default function CreatePostPage() {
  const { t } = useTranslation();
  const router = useRouter(); 

  // --- STATE ALUR ---
  const [step, setStep] = useState<FlowStep>('pick');
  const [postType, setPostType] = useState<'image' | 'text' | 'video'>('image');
  
  // --- STATE DATA POST ---
  const [destination, setDestination] = useState<'feed' | 'story'>('feed');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Karya');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE MEDIA (FOTO) ---
  const [rawImagesQueue, setRawImagesQueue] = useState<string[]>([]); 
  const [croppedImages, setCroppedImages] = useState<Blob[]>([]); 
  const [previewUrls, setPreviewUrls] = useState<string[]>([]); 
  const [imageForCrop, setImageForCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // --- STATE MEDIA (VIDEO) ---
  const [rawVideoFile, setRawVideoFile] = useState<File | null>(null);
  const [rawVideoUrl, setRawVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStart, setVideoStart] = useState(0); 
  const [coverTime, setCoverTime] = useState(0); 
  const [videoPos, setVideoPos] = useState(50); // 🔥 Posisi video (0 - 100)
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverUrlPreview] = useState<string | null>(null);

  // --- STATE MUSIK & POPUP (MENTION/HASHTAG) ---
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [searchMusic, setSearchMusic] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState<'none' | 'mention' | 'hashtag'>('none');
  const [searchQuery, setSearchQuery] = useState("");
  const [popupResults, setPopupResults] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null); 
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ===============================================
  // 🔥 LOGIKA MENTION & HASHTAG 🔥
  // ===============================================
  useEffect(() => {
    if (showPopup === 'none') return;
    const fetchSuggestions = async () => {
      if (showPopup === 'mention') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const myId = session.user.id;
        const { data: connected } = await supabase.rpc('get_connected_users', { user_uuid: myId }); // Gunakan RPC atau query table followers
        let query = supabase.from('profiles').select('id, username, avatar_url').limit(10);
        if (searchQuery) query = query.ilike('username', `%${searchQuery}%`);
        const { data: profiles } = await query;
        setPopupResults(profiles || []);
      } else if (showPopup === 'hashtag') {
        let queryStr = searchQuery.toLowerCase().trim();
        if (!queryStr.startsWith('#')) queryStr = '#' + queryStr; 
        const { data } = await supabase.from('hashtags').select('tag').ilike('tag', `${queryStr}%`).limit(10);
        setPopupResults(data || []);
      }
    };
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showPopup]);

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value; setCaption(val);
    const cursor = e.target.selectionStart || 0;
    const textBefore = val.slice(0, cursor);
    const mentionMatch = textBefore.match(/(?:^|\s)@(\w*)$/);
    const hashtagMatch = textBefore.match(/(?:^|\s)#(\w*)$/);
    if (mentionMatch) { setShowPopup('mention'); setSearchQuery(mentionMatch[1]); } 
    else if (hashtagMatch) { setShowPopup('hashtag'); setSearchQuery(hashtagMatch[1]); } 
    else { setShowPopup('none'); }
  };

  const handleSelectPopupItem = (selectedItem: string) => {
    const cursor = captionInputRef.current?.selectionStart || 0;
    const textBefore = caption.slice(0, cursor);
    const textAfter = caption.slice(cursor);
    const replacement = showPopup === 'mention' ? `@${selectedItem} ` : `#${selectedItem.replace('#','')} `;
    const newText = textBefore.replace(/[@#]\w*$/, replacement);
    setCaption(newText + textAfter); setShowPopup('none');
    setTimeout(() => captionInputRef.current?.focus(), 10);
  };

  // ===============================================
  // 🔥 LOGIKA MUSIK 🔥
  // ===============================================
  useEffect(() => {
    if (!searchMusic.trim()) { setMusicResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchMusic)}&media=music&limit=10`);
        const data = await res.json(); setMusicResults(data.results || []);
      } catch (err) { console.error(err); } finally { setIsSearching(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchMusic]);

  const togglePlayPreview = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (playingUrl === url) { audioRef.current?.pause(); setPlayingUrl(null); } 
    else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url); audioRef.current.play(); setPlayingUrl(url);
      audioRef.current.onended = () => setPlayingUrl(null);
    }
  };

  // ===============================================
  // 🔥 LOGIKA EDITOR VIDEO & FOTO 🔥
  // ===============================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const readers = files.map(file => new Promise<string>((res) => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file);
    }));
    Promise.all(readers).then(res => { setRawImagesQueue(res); setImageForCrop(res[0]); setStep('edit'); });
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setRawVideoFile(file); setRawVideoUrl(URL.createObjectURL(file)); setStep('edit'); }
  };

  const captureFrameAndSave = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const targetRatio = 2 / 3;
    const videoRatio = video.videoWidth / video.videoHeight;
    let cw, ch, sx, sy;

    if (videoRatio > targetRatio) {
      // Video Lebar (Potong Kanan Kiri)
      ch = video.videoHeight; cw = ch * targetRatio;
      sx = (video.videoWidth - cw) * (videoPos / 100); sy = 0;
    } else {
      // Video Tinggi (Potong Atas Bawah)
      cw = video.videoWidth; ch = cw / targetRatio;
      sx = 0; sy = (video.videoHeight - ch) * (videoPos / 100);
    }

    canvas.width = cw; canvas.height = ch;
    canvas.getContext('2d')?.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
    canvas.toBlob((b) => { setCoverBlob(b); setCoverUrlPreview(URL.createObjectURL(b!)); setStep('post'); }, 'image/jpeg', 0.9);
  };

  // ===============================================
  // 🔥 SUBMIT POST 🔥
  // ===============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const myId = session.user.id;

      const upload = async (f: any, type: any) => {
        const fd = new FormData(); fd.append("file", f); fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`, { method: "POST", body: fd });
        return res.json();
      };

      let finalImg = null; let finalVid = null;
      if (postType === 'image') {
        const res = await Promise.all(croppedImages.map(b => upload(b, 'image')));
        finalImg = res.map(r => r.secure_url).join(',');
      } else if (postType === 'video' && coverBlob) {
        const cRes = await upload(coverBlob, 'image');
        finalImg = cRes.secure_url.replace('/upload/', '/upload/c_fill,ar_2:3,g_auto/');
        const vRes = await upload(rawVideoFile!, 'video');
        const start = videoStart.toFixed(1); const end = (videoStart + 15).toFixed(1);
        finalVid = vRes.secure_url.replace('/upload/', `/upload/c_fill,ar_2:3,g_auto/so_${start},eo_${end}/`);
      }

      const payload = { creator_id: myId, image_url: finalImg, video_url: finalVid, content: caption, category };
      if (destination === 'feed') {
        const { data: prof } = await supabase.from('profiles').select('username').eq('id', myId).single();
        await supabase.from('posts').insert({...payload, name: prof?.username, bio: caption, status: 'pending'});
      } else {
        await supabase.from('stories').insert({...payload, visibility});
      }
      showNotif("Karya Terkirim!", "success"); router.push('/');
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  // ===============================================
  // 🔥 UI RENDERING 🔥
  // ===============================================

  if (step === 'pick') {
    return (
      <div className="create-page-wrapper pick-screen">
        <header className="create-header">
           <button onClick={() => router.back()} className="material-icons">close</button>
           <h2>Bagikan Karya</h2>
           <div style={{ width: 24 }}></div>
        </header>
        <div className="picker-container">
           <div className="pick-card" onClick={() => { setPostType('image'); fileInputRef.current?.click(); }}>
              <span className="material-icons">add_a_photo</span>
              <p>Unggah Foto</p>
              <small>Maksimal 3 Slide (3:4)</small>
           </div>
           <div className="pick-card" onClick={() => { setPostType('video'); videoInputRef.current?.click(); }}>
              <span className="material-icons">videocam</span>
              <p>Unggah Video</p>
              <small>Maksimal 15 Detik (2:3)</small>
           </div>
           <div className="pick-card" onClick={() => { setPostType('text'); setStep('post'); }}>
              <span className="material-icons">notes</span>
              <p>Hanya Tulisan</p>
              <small>Post status atau cerita</small>
           </div>
        </div>
        <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={handleFileChange} />
        <input type="file" ref={videoInputRef} hidden accept="video/*" onChange={handleVideoSelect} />
      </div>
    );
  }

  if (step === 'edit') {
    return (
      <div className="editor-screen-wrapper">
        <div className="editor-header">
           <button onClick={() => setStep('pick')} className="material-icons">arrow_back</button>
           <p>{postType === 'image' ? `Crop Foto (${croppedImages.length+1})` : 'Edit Video'}</p>
           <button onClick={postType === 'image' ? handleSaveCrop : captureFrameAndSave} className="done-btn">Lanjut</button>
        </div>
        <div className="crop-area">
          {postType === 'image' ? (
            <Cropper image={imageForCrop!} crop={crop} zoom={zoom} aspect={3/4} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
          ) : (
            <div className="video-editor-container" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
              <video 
                ref={videoRef} src={rawVideoUrl!} playsInline muted loop 
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `50% ${videoPos}%` }} 
                onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          )}
        </div>
        <div className="editor-footer-controls">
           {postType === 'image' ? (
             <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="modern-range" />
           ) : (
             <>
               <label>Pilih Bagian Video (Geser Posisi)</label>
               <input type="range" value={videoPos} min={0} max={100} onChange={(e) => setVideoPos(Number(e.target.value))} className="modern-range" />
               <label>Potong Durasi (15s)</label>
               <input type="range" className="box-trim-slider" min={0} max={Math.max(0, videoDuration - 15)} step={0.1} value={videoStart} onChange={(e) => {
                 const v = Number(e.target.value); setVideoStart(v);
                 if (videoRef.current) { videoRef.current.currentTime = v; videoRef.current.play(); }
               }} />
             </>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="create-page-wrapper post-details-screen">
      <header className="create-header">
        <button onClick={() => setStep('pick')} className="material-icons">arrow_back</button>
        <h2>Lengkapi Detail</h2>
        <div style={{ width: 24 }}></div>
      </header>

      <form onSubmit={handleSubmit} className="post-form-final">
        <div className="media-summary-row">
           {postType === 'image' && previewUrls.map((u, i) => <img key={i} src={u} className="mini-preview" />)}
           {postType === 'video' && coverPreviewUrl && <div className="video-summary-badge"><img src={coverPreviewUrl} className="mini-preview" /><span className="material-icons">play_circle</span></div>}
           <div className="destination-info">
              <select value={destination} onChange={e => setDestination(e.target.value as any)}>
                 <option value="feed">Kirim ke Feed</option>
                 <option value="story">Tambah ke Story</option>
              </select>
           </div>
        </div>

        <div style={{ position: 'relative' }}>
          {showPopup !== 'none' && (
            <div className="popup-suggestion-box">
              {popupResults.length > 0 ? popupResults.map((item, i) => (
                <div key={i} className="popup-item" onClick={() => handleSelectPopupItem(showPopup === 'mention' ? item.username : item.tag)}>
                   {showPopup === 'mention' && <img src={item.avatar_url || '/asets/png/profile.webp'} />}
                   <span className={showPopup === 'mention' ? 'popup-name' : 'popup-tag'}>{showPopup === 'mention' ? item.username : item.tag}</span>
                </div>
              )) : <div className="popup-empty">Tidak ditemukan...</div>}
            </div>
          )}
          <textarea 
            ref={captionInputRef} 
            placeholder="Tulis sesuatu... gunakan @ untuk mention, # untuk hashtag" 
            value={caption} onChange={handleCaptionChange} 
            className="final-textarea"
          />
        </div>

        <div className="form-group-final">
          <label>Kategori</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
             <option value="Karya">Karya Seni</option>
             <option value="Photography">Photography</option>
             <option value="Prestasi">Prestasi</option>
             <option value="Mountain">Pendaki</option>
          </select>
        </div>

        <div className="music-picker-section-modern">
           <label>Tambah Musik (Opsional)</label>
           {!selectedMusic ? (
             <div className="music-search-box">
               <input type="text" placeholder="Cari judul lagu..." value={searchMusic} onChange={e => setSearchMusic(e.target.value)} />
               <div className="music-results-mini">
                 {musicResults.map((m, i) => (
                   <div key={i} className="music-item-row" onClick={() => setSelectedMusic(m)}>
                      <div className="music-play-btn" onClick={(e) => togglePlayPreview(m.previewUrl, e)}>
                        <span className="material-icons">{playingUrl === m.previewUrl ? 'pause' : 'play_arrow'}</span>
                      </div>
                      <p>{m.trackName} - {m.artistName}</p>
                   </div>
                 ))}
               </div>
             </div>
           ) : (
             <div className="selected-music-pill">
               <span className="material-icons">music_note</span>
               <p>{selectedMusic.trackName}</p>
               <button onClick={() => setSelectedMusic(null)} className="material-icons">close</button>
             </div>
           )}
        </div>

        <button type="submit" disabled={isSubmitting} className="final-submit-btn">
          {isSubmitting ? 'Sedang Memproses...' : 'Bagikan Sekarang'}
        </button>
      </form>
    </div>
  );
}
