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

  // --- STATE NAVIGASI HALAMAN ---
  const [step, setStep] = useState<'pick' | 'edit' | 'post'>('pick');
  const [postType, setPostType] = useState<'image' | 'text' | 'video'>('image');
  const [destination, setDestination] = useState<'feed' | 'story'>('feed');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Karya');
  
  // STATE MEDIA
  const [rawImagesQueue, setRawImagesQueue] = useState<string[]>([]); 
  const [croppedImages, setCroppedImages] = useState<Blob[]>([]); 
  const [previewUrls, setPreviewUrls] = useState<string[]>([]); 

  const [rawVideoFile, setRawVideoFile] = useState<File | null>(null);
  const [rawVideoUrl, setRawVideoUrl] = useState<string | null>(null);
  const [isVideoEditorOpen, setIsVideoEditorOpen] = useState(false);
  
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStart, setVideoStart] = useState(0); 
  const [coverTime, setCoverTime] = useState(0); 
  const [videoPos, setVideoPos] = useState(50); // Posisi video (0-100)
  
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverUrlPreview] = useState<string | null>(null);

  // REFS & CROP LOGIC
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null); 

  const [imageForCrop, setImageForCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // STATE MUSIK & POPUP
  const [searchMusic, setSearchMusic] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [showPopup, setShowPopup] = useState<'none' | 'mention' | 'hashtag'>('none');
  const [searchQuery, setSearchQuery] = useState("");
  const [popupResults, setPopupResults] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===============================================
  // 🔥 LOGIKA MENTION & HASHTAG (TETAP) 🔥
  // ===============================================
  useEffect(() => {
    if (showPopup === 'none') return;
    const fetchSuggestions = async () => {
      if (showPopup === 'mention') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const myId = session.user.id;
        const { data: following } = await supabase.from('followers').select('following_id').eq('follower_id', myId);
        const { data: followers } = await supabase.from('followers').select('follower_id').eq('following_id', myId);
        const connectedIds = new Set([...(following?.map(f => f.following_id) || []), ...(followers?.map(f => f.follower_id) || [])]);

        if (connectedIds.size > 0) {
          let query = supabase.from('profiles').select('id, username, avatar_url, role').in('id', Array.from(connectedIds)).limit(10);
          if (searchQuery) query = query.ilike('username', `%${searchQuery}%`);
          const { data: profiles } = await query;
          setPopupResults(profiles || []);
        } else { setPopupResults([]); }
      } else if (showPopup === 'hashtag') {
        let queryStr = searchQuery.toLowerCase().trim();
        if (!queryStr.startsWith('#')) queryStr = '#' + queryStr; 
        try {
          const { data } = await supabase.from('hashtags').select('tag').ilike('tag', `${queryStr}%`).limit(10);
          setPopupResults(data || []);
        } catch (err) { console.error(err); }
      }
    };
    const delayDebounceFn = setTimeout(() => { fetchSuggestions(); }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, showPopup]);

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value; setCaption(val);
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/(?:^|\s)@(\w*)$/);
    const hashtagMatch = textBeforeCursor.match(/(?:^|\s)#(\w*)$/);
    if (mentionMatch) { setShowPopup('mention'); setSearchQuery(mentionMatch[1]); } 
    else if (hashtagMatch) { setShowPopup('hashtag'); setSearchQuery(hashtagMatch[1]); } 
    else { setShowPopup('none'); }
  };

  const handleSelectPopupItem = (selectedItem: string) => {
    if (!captionInputRef.current) return;
    const cursor = captionInputRef.current.selectionStart || 0;
    const textBeforeCursor = caption.slice(0, cursor);
    const textAfterCursor = caption.slice(cursor);
    let newTextBefore = "";
    if (showPopup === 'mention') { newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${selectedItem} `); } 
    else if (showPopup === 'hashtag') {
      const formattedTag = selectedItem.startsWith('#') ? selectedItem : `#${selectedItem}`;
      newTextBefore = textBeforeCursor.replace(/#\w*$/, `${formattedTag} `);
    }
    setCaption(newTextBefore + textAfterCursor); setShowPopup('none'); captionInputRef.current.focus();
  };

  // ===============================================
  // 🔥 LOGIKA FILE & EDITOR 🔥
  // ===============================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const readersArr: Promise<string>[] = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readersArr).then(results => {
      setRawImagesQueue(results); setImageForCrop(results[0]); setStep('edit');
    });
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return showNotif("Ukuran video terlalu besar! Maksimal 50MB.", "warning");
    setRawVideoFile(file); setRawVideoUrl(URL.createObjectURL(file)); setStep('edit');
  };

  const onCropComplete = useCallback((_croppedArea: any, pixels: any) => { setCroppedAreaPixels(pixels); }, []);

  const handleSaveCrop = async () => {
    if (!imageForCrop || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageForCrop, croppedAreaPixels);
      setCroppedImages(prev => [...prev, croppedBlob]); setPreviewUrls(prev => [...prev, URL.createObjectURL(croppedBlob)]);
      const nextQueue = rawImagesQueue.slice(1);
      if (nextQueue.length > 0) {
        setRawImagesQueue(nextQueue); setImageForCrop(nextQueue[0]); setCrop({ x: 0, y: 0 }); setZoom(1);
      } else { setStep('post'); }
    } catch (e) { console.error(e); }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) { setVideoDuration(videoRef.current.duration); setVideoStart(0); setCoverTime(0); videoRef.current.play(); }
  };

  const captureFrameAndSave = () => {
    const video = videoRef.current;
    if (!video || !canvasRef.current) return;
    const targetRatio = 2 / 3;
    const videoRatio = video.videoWidth / video.videoHeight;
    let cw, ch, sx, sy;
    if (videoRatio > targetRatio) {
      ch = video.videoHeight; cw = ch * targetRatio;
      sx = (video.videoWidth - cw) * (videoPos / 100); sy = 0;
    } else {
      cw = video.videoWidth; ch = cw / targetRatio;
      sx = 0; sy = (video.videoHeight - ch) * (videoPos / 100);
    }
    canvasRef.current.width = cw; canvasRef.current.height = ch;
    canvasRef.current.getContext('2d')?.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
    canvasRef.current.toBlob((blob) => {
      if (blob) { setCoverBlob(blob); setCoverUrlPreview(URL.createObjectURL(blob)); setStep('post'); }
    }, 'image/jpeg', 0.9);
  };

  // ===============================================
  // 🔥 SUBMIT & MUSIK LOGIC 🔥
  // ===============================================
  const uploadToCloudinary = async (file: File | Blob, resourceType: 'image' | 'video' = 'image') => {
    const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, { method: "POST", body: fd });
    return await res.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      let finalImageUrl: string | null = null;
      let finalVideoUrl: string | null = null;
      if (postType === 'image') {
        const res = await Promise.all(croppedImages.map(b => uploadToCloudinary(b, 'image')));
        finalImageUrl = res.map(r => r.secure_url).join(',');
      } else if (postType === 'video' && coverBlob) {
        const cRes = await uploadToCloudinary(coverBlob, 'image');
        finalImageUrl = cRes.secure_url.replace('/upload/', '/upload/c_fill,ar_2:3,g_auto/');
        const vRes = await uploadToCloudinary(rawVideoFile!, 'video');
        finalVideoUrl = vRes.secure_url.replace('/upload/', `/upload/c_fill,ar_2:3,g_auto/so_${videoStart.toFixed(1)},eo_${(videoStart+15).toFixed(1)}/`);
      }
      const { data: prof } = await supabase.from("profiles").select("username").eq("id", session.user.id).single();
      const payload = { creator_id: session.user.id, name: prof?.username, image_url: finalImageUrl, video_url: finalVideoUrl, bio: caption.trim(), category, status: "pending", visibility: destination === 'story' ? visibility : null };
      if (destination === 'feed') await supabase.from("posts").insert(payload);
      else await supabase.from("stories").insert({ creator_id: session.user.id, image_url: finalImageUrl, video_url: finalVideoUrl, content: caption.trim(), visibility });
      showNotif("Berhasil Terkirim!", "success"); router.back();
    } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
  };

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
  // 🔥 UI SCREENS (PICK, EDIT, POST) 🔥
  // ===============================================

  // 1. SCREEN PILIH MEDIA
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
              <small>Potongan 2:3 (Max 15s)</small>
           </div>
           <div className="pick-card" onClick={() => { setPostType('text'); setStep('post'); }}>
              <span className="material-icons">notes</span>
              <p>Hanya Tulisan</p>
              <small>Post cerita atau status</small>
           </div>
        </div>
        <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={handleFileChange} />
        <input type="file" ref={videoInputRef} hidden accept="video/*" onChange={handleVideoSelect} />
      </div>
    );
  }

  // 2. SCREEN EDITOR (CROP & TRIM)
  if (step === 'edit') {
    return (
      <div className="editor-screen-wrapper">
        <div className="editor-header">
           <button onClick={() => setStep('pick')} className="material-icons">arrow_back</button>
           <p>{postType === 'image' ? `Atur Foto (${croppedImages.length + 1})` : 'Potong & Atur Video'}</p>
           <button onClick={postType === 'image' ? handleSaveCrop : captureFrameAndSave} className="done-btn">Lanjut</button>
        </div>
        <div className="editor-main-content">
          {postType === 'image' ? (
            <div className="crop-area">
               <Cropper image={imageForCrop!} crop={crop} zoom={zoom} aspect={3/4} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
            </div>
          ) : (
            <div className="video-visual-area">
               <div className="video-viewport" style={{ aspectRatio: '2/3' }}>
                 <video 
                   ref={videoRef} src={rawVideoUrl!} playsInline muted loop 
                   style={{ objectPosition: `center ${videoPos}%` }} 
                   onLoadedMetadata={handleVideoLoadedMetadata}
                 />
                 <canvas ref={canvasRef} style={{ display: 'none' }} />
               </div>
            </div>
          )}
        </div>
        <div className="editor-bottom-controls">
           {postType === 'image' ? (
             <div className="control-group"><label>ZOOM FOTO</label><input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} /></div>
           ) : (
             <div className="video-controls-stack">
               <div className="control-group"><label>GESER POSISI VIDEO</label><input type="range" value={videoPos} min={0} max={100} onChange={(e) => setVideoPos(Number(e.target.value))} /></div>
               <div className="control-group"><label>PILIH DURASI (15s)</label><input type="range" className="box-trim-input" min={0} max={Math.max(0, videoDuration - 15)} step={0.1} value={videoStart} onChange={(e) => { const val = Number(e.target.value); setVideoStart(val); if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.play(); } if (coverTime < val || coverTime > val + 15) setCoverTime(val); }} /></div>
               <div className="control-group"><label>PILIH SAMPUL</label><input type="range" className="cover-trim-input" min={videoStart} max={Math.min(videoDuration, videoStart + 15)} step={0.1} value={coverTime} onChange={(e) => { const val = Number(e.target.value); setCoverTime(val); if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.pause(); } }} /></div>
             </div>
           )}
        </div>
      </div>
    );
  }

  // 3. SCREEN DETAIL POSTINGAN
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
           <div className="destination-info"><select value={destination} onChange={e => setDestination(e.target.value as any)}><option value="feed">Post ke Feed</option><option value="story">Tambah Story</option></select></div>
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
          <textarea ref={captionInputRef} placeholder="Tulis caption karya lu..." value={caption} onChange={handleCaptionChange} className="final-textarea" />
        </div>

        <div className="form-group-final"><label>KATEGORI</label><select value={category} onChange={e => setCategory(e.target.value)}><option value="Karya">Karya Seni</option><option value="Photography">Photography</option><option value="Prestasi">Prestasi</option></select></div>

        <div className="music-picker-section-modern">
           <label>Tambah Musik</label>
           {!selectedMusic ? (
             <div className="music-search-box"><input type="text" placeholder="Cari judul lagu..." value={searchMusic} onChange={e => setSearchMusic(e.target.value)} />
               <div className="music-results-mini">{musicResults.map((m, i) => (<div key={i} className="music-item-row" onClick={() => setSelectedMusic(m)}><div className="music-play-btn" onClick={(e) => togglePlayPreview(m.previewUrl, e)}><span className="material-icons">{playingUrl === m.previewUrl ? 'pause' : 'play_arrow'}</span></div><p>{m.trackName}</p></div>))}</div>
             </div>
           ) : (
             <div className="selected-music-pill"><span className="material-icons">music_note</span><p>{selectedMusic.trackName}</p><button onClick={() => setSelectedMusic(null)} className="material-icons">close</button></div>
           )}
        </div>

        <button type="submit" disabled={isSubmitting} className="final-submit-btn">
          {isSubmitting ? 'Memproses Karya...' : 'Bagikan Sekarang'}
        </button>
      </form>
    </div>
  );
}
