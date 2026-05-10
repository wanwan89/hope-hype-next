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

  // --- 1. STATE ALUR ---
  const [step, setStep] = useState<FlowStep>('pick');
  const [postType, setPostType] = useState<'image' | 'text' | 'video'>('image');
  
  // --- 2. STATE DATA POST ---
  const [destination, setDestination] = useState<'feed' | 'story'>('feed');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Karya');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 3. STATE MEDIA ---
  const [rawImagesQueue, setRawImagesQueue] = useState<string[]>([]); 
  const [croppedImages, setCroppedImages] = useState<Blob[]>([]); 
  const [previewUrls, setPreviewUrls] = useState<string[]>([]); 
  const [imageForCrop, setImageForCrop] = useState<string | null>(null);
  
  const [rawVideoFile, setRawVideoFile] = useState<File | null>(null);
  const [rawVideoUrl, setRawVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStart, setVideoStart] = useState(0); 
  const [coverTime, setCoverTime] = useState(0); 
  const [videoPos, setVideoPos] = useState(50); 
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverUrlPreview] = useState<string | null>(null);

  // --- 4. STATE POPUP & MUSIK ---
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [searchMusic, setSearchMusic] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState<'none' | 'mention' | 'hashtag'>('none');
  const [searchQuery, setSearchQuery] = useState("");
  const [popupResults, setPopupResults] = useState<any[]>([]);

  // --- 5. REFS & CROP ---
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

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
        const { data: profiles } = await supabase.from('profiles')
          .select('id, username, avatar_url')
          .ilike('username', `%${searchQuery}%`)
          .limit(10);
        setPopupResults(profiles || []);
      } else {
        let tagSearch = searchQuery.startsWith('#') ? searchQuery : '#' + searchQuery;
        const { data: tags } = await supabase.from('hashtags')
          .select('tag')
          .ilike('tag', `${tagSearch}%`)
          .limit(10);
        setPopupResults(tags || []);
      }
    };
    const t = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(t);
  }, [searchQuery, showPopup]);

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value; setCaption(val);
    const cursor = e.target.selectionStart || 0;
    const textBefore = val.slice(0, cursor);
    const mMatch = textBefore.match(/(?:^|\s)@(\w*)$/);
    const hMatch = textBefore.match(/(?:^|\s)#(\w*)$/);
    if (mMatch) { setShowPopup('mention'); setSearchQuery(mMatch[1]); }
    else if (hMatch) { setShowPopup('hashtag'); setSearchQuery(hMatch[1]); }
    else { setShowPopup('none'); }
  };

  const handleSelectPopupItem = (val: string) => {
    const cursor = captionInputRef.current?.selectionStart || 0;
    const textBefore = caption.slice(0, cursor);
    const textAfter = caption.slice(cursor);
    const replacement = showPopup === 'mention' ? `@${val} ` : `#${val.replace('#','')} `;
    setCaption(textBefore.replace(/[@#]\w*$/, replacement) + textAfter);
    setShowPopup('none');
    setTimeout(() => captionInputRef.current?.focus(), 10);
  };

  // ===============================================
  // 🔥 LOGIKA EDITOR (FOTO & VIDEO) 🔥
  // ===============================================
  const onCropComplete = useCallback((_: any, pixels: any) => setCroppedAreaPixels(pixels), []);

  const handleSaveCrop = async () => {
    if (!imageForCrop || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedImg(imageForCrop, croppedAreaPixels);
      setCroppedImages(prev => [...prev, blob]);
      setPreviewUrls(prev => [...prev, URL.createObjectURL(blob)]);
      const next = rawImagesQueue.slice(1);
      if (next.length > 0) {
        setRawImagesQueue(next); setImageForCrop(next[0]); setCrop({x:0,y:0}); setZoom(1);
      } else { setStep('post'); }
    } catch (e) { console.error(e); }
  };

  const captureFrameAndSave = () => {
    const video = videoRef.current;
    if (!video || !canvasRef.current) return;
    const targetRatio = 2 / 3;
    const vRatio = video.videoWidth / video.videoHeight;
    let cw, ch, sx, sy;
    if (vRatio > targetRatio) { ch = video.videoHeight; cw = ch * targetRatio; sx = (video.videoWidth - cw) * (videoPos / 100); sy = 0; }
    else { cw = video.videoWidth; ch = cw / targetRatio; sx = 0; sy = (video.videoHeight - ch) * (videoPos / 100); }
    canvasRef.current.width = cw; canvasRef.current.height = ch;
    canvasRef.current.getContext('2d')?.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
    canvasRef.current.toBlob((b) => {
      if (b) { setCoverBlob(b); setCoverUrlPreview(URL.createObjectURL(b)); setStep('post'); }
    }, 'image/jpeg', 0.9);
  };

  // ===============================================
  // 🔥 LOGIKA UPLOAD & SUBMIT 🔥
  // ===============================================
  const uploadToCloudinary = async (file: File | Blob, type: 'image' | 'video' = 'image') => {
    const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`, { method: "POST", body: fd });
    return res.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      let fImg = null; let fVid = null;

      if (postType === 'image') {
        const res = await Promise.all(croppedImages.map(b => uploadToCloudinary(b, 'image')));
        fImg = res.map(r => r.secure_url).join(',');
      } else if (postType === 'video' && coverBlob) {
        const cRes = await uploadToCloudinary(coverBlob, 'image');
        fImg = cRes.secure_url.replace('/upload/', '/upload/c_fill,ar_2:3,g_auto/');
        const vRes = await uploadToCloudinary(rawVideoFile!, 'video');
        fVid = vRes.secure_url.replace('/upload/', `/upload/c_fill,ar_2:3,g_auto/so_${videoStart.toFixed(1)},eo_${(videoStart+15).toFixed(1)}/`);
      }

      const postData = { creator_id: session.user.id, image_url: fImg, video_url: fVid, content: caption, category };
      if (destination === 'feed') {
        const { data: prof } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
        await supabase.from('posts').insert({ ...postData, name: prof?.username, bio: caption, status: 'pending' });
      } else {
        await supabase.from('stories').insert({ ...postData, visibility });
      }
      showNotif("Karya Terkirim!", "success"); router.push('/');
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  // ===============================================
  // 🔥 RENDER UI SEGMENTED 🔥
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
        <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            const readers = files.map(f => new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); }));
            Promise.all(readers).then(res => { setRawImagesQueue(res); setImageForCrop(res[0]); setStep('edit'); });
          }
        }} />
        <input type="file" ref={videoInputRef} hidden accept="video/*" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { setRawVideoFile(f); setRawVideoUrl(URL.createObjectURL(f)); setStep('edit'); }
        }} />
      </div>
    );
  }

  if (step === 'edit') {
    return (
      <div className="editor-screen-wrapper">
        <div className="editor-header">
           <button onClick={() => setStep('pick')} className="material-icons">arrow_back</button>
           <p>{postType === 'image' ? `Crop Foto (${croppedImages.length+1})` : 'Edit Video'}</p>
           {/* 🔥 FIX UTAMA: Pastikan nama fungsi handleSaveCrop ada di sini 🔥 */}
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
           {postType === 'image' && previewUrls.map((u, i) => <img key={i} src={u} className="mini-preview" alt="prev" />)}
           {postType === 'video' && coverPreviewUrl && <div className="video-summary-badge"><img src={coverPreviewUrl} className="mini-preview" alt="vprev" /><span className="material-icons">play_circle</span></div>}
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
              {popupResults.map((item, i) => (
                <div key={i} className="popup-item" onClick={() => handleSelectPopupItem(showPopup === 'mention' ? item.username : item.tag)}>
                   {showPopup === 'mention' && <img src={item.avatar_url || '/asets/png/profile.webp'} alt="av" />}
                   <span className={showPopup === 'mention' ? 'popup-name' : 'popup-tag'}>{showPopup === 'mention' ? item.username : item.tag}</span>
                </div>
              ))}
            </div>
          )}
          <textarea ref={captionInputRef} placeholder="Tulis sesuatu..." value={caption} onChange={handleCaptionChange} className="final-textarea" />
        </div>
        <div className="form-group-final">
          <label>Kategori</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
             <option value="Karya">Karya Seni</option>
             <option value="Photography">Photography</option>
             <option value="Prestasi">Prestasi</option>
          </select>
        </div>
        <button type="submit" disabled={isSubmitting} className="final-submit-btn">
          {isSubmitting ? 'Sedang Memproses...' : 'Bagikan Sekarang'}
        </button>
      </form>
    </div>
  );
}
