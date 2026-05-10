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

// Jenis Step: 'pick' (pilih file), 'edit' (crop/trim), 'post' (caption/detail)
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
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverUrlPreview] = useState<string | null>(null);

  // --- STATE MUSIK & MENTION ---
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
  // 🔥 LOGIKA PICKER (STEP 1) 🔥
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
      setRawImagesQueue(results); 
      setImageForCrop(results[0]); 
      setStep('edit'); // Lanjut ke Editor Foto
    });
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return showNotif("Ukuran video terlalu besar! Maksimal 50MB.", "warning");

    setRawVideoFile(file);
    setRawVideoUrl(URL.createObjectURL(file));
    setStep('edit'); // Lanjut ke Editor Video
  };

  // ===============================================
  // 🔥 LOGIKA EDITOR (STEP 2) 🔥
  // ===============================================
  
  // -- FOTO --
  const onCropComplete = useCallback((_croppedArea: any, pixels: any) => { setCroppedAreaPixels(pixels); }, []);

  const handleSaveCrop = async () => {
    if (!imageForCrop || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageForCrop, croppedAreaPixels);
      setCroppedImages(prev => [...prev, croppedBlob]); 
      setPreviewUrls(prev => [...prev, URL.createObjectURL(croppedBlob)]);

      const nextQueue = rawImagesQueue.slice(1);
      if (nextQueue.length > 0) {
        setRawImagesQueue(nextQueue); 
        setImageForCrop(nextQueue[0]); 
        setCrop({ x: 0, y: 0 }); 
        setZoom(1);
      } else {
        setStep('post'); // Selesai semua foto, masuk ke Detail
      }
    } catch (e) { console.error("Error Cropping:", e); }
  };

  // -- VIDEO --
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      videoRef.current.play().catch(() => {});
    }
  };

  const captureFrameAndSave = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // 🔥 RASIO 2:3 AGAK TINGGI 🔥
    const targetRatio = 2 / 3;
    const sizeW = video.videoWidth;
    const sizeH = video.videoHeight;
    
    let cropWidth, cropHeight, startX, startY;
    if ((sizeW / sizeH) > targetRatio) {
      cropHeight = sizeH; cropWidth = cropHeight * targetRatio;
      startX = (sizeW - cropWidth) / 2; startY = 0;
    } else {
      cropWidth = sizeW; cropHeight = cropWidth / targetRatio;
      startX = 0; startY = (sizeH - cropHeight) / 2;
    }

    canvas.width = cropWidth; canvas.height = cropHeight;
    canvas.getContext('2d')?.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    
    canvas.toBlob((blob) => {
      if (blob) {
        setCoverBlob(blob);
        setCoverUrlPreview(URL.createObjectURL(blob));
        setStep('post'); // Masuk ke Detail
      }
    }, 'image/jpeg', 0.9);
  };

  // ===============================================
  // 🔥 SUBMIT & UTILS (STEP 3) 🔥
  // ===============================================
  const uploadToCloudinary = async (file: File | Blob, resourceType: 'image' | 'video' = 'image') => {
    const fd = new FormData();
    fd.append("file", file); 
    fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, { method: "POST", body: fd });
    return await res.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return window.dispatchEvent(new CustomEvent('openLogin'));
      const myId = session.user.id;

      let finalImageUrl: string | null = null;
      let finalVideoUrl: string | null = null;

      if (postType === 'image' && croppedImages.length > 0) {
        const uploadPromises = croppedImages.map(blob => uploadToCloudinary(blob, 'image'));
        const results = await Promise.all(uploadPromises);
        finalImageUrl = results.map(res => res.secure_url).join(',');
      } 
      else if (postType === 'video' && rawVideoFile && coverBlob) {
        const coverRes = await uploadToCloudinary(coverBlob, 'image');
        finalImageUrl = coverRes.secure_url.replace('/upload/', '/upload/c_fill,ar_2:3,g_auto/');
        const videoRes = await uploadToCloudinary(rawVideoFile, 'video');
        const endSegment = Math.min(videoDuration, videoStart + 15);
        finalVideoUrl = videoRes.secure_url.replace('/upload/', `/upload/c_fill,ar_2:3,g_auto/so_${videoStart.toFixed(1)},eo_${endSegment.toFixed(1)}/`);
      }

      const postData = {
        creator_id: myId,
        image_url: finalImageUrl,
        video_url: finalVideoUrl,
        content: caption.trim(),
        audio_src: selectedMusic?.previewUrl,
        title: selectedMusic?.trackName,
        artist: selectedMusic?.artistName,
        category,
        visibility: destination === 'story' ? visibility : null
      };

      if (destination === 'story') {
        await supabase.from("stories").insert({ ...postData, creator_id: myId });
      } else {
        const { data: prof } = await supabase.from("profiles").select("username").eq("id", myId).single();
        await supabase.from("posts").insert({ ...postData, name: prof?.username, bio: caption.trim(), status: 'pending' });
      }

      showNotif("Karya berhasil dikirim!", "success");
      router.back();
    } catch (err: any) { alert(err.message); } 
    finally { setIsSubmitting(false); }
  };

  // (Efek pencarian musik & mention diabaikan singkat agar kode fokus pada perpindahan halaman)
  // ... (Gunakan logika pencarian musik & mention yang sama seperti sebelumnya) ...

  // ===============================================
  // 🔥 RENDER UI 🔥
  // ===============================================

  // --- 1. PICKER SCREEN (Halaman Awal) ---
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
              <small>Maksimal 3 Slide</small>
           </div>
           
           <div className="pick-card" onClick={() => { setPostType('video'); videoInputRef.current?.click(); }}>
              <span className="material-icons">videocam</span>
              <p>Unggah Video</p>
              <small>Max 15 Detik (2:3)</small>
           </div>

           <div className="pick-card" onClick={() => { setPostType('text'); setStep('post'); }}>
              <span className="material-icons">notes</span>
              <p>Hanya Cerita</p>
              <small>Bagikan tulisan indahmu</small>
           </div>
        </div>

        <input type="file" ref={fileInputRef} accept="image/*" multiple hidden onChange={handleFileChange} />
        <input type="file" ref={videoInputRef} accept="video/*" hidden onChange={handleVideoSelect} />
      </div>
    );
  }

  // --- 2. EDITOR SCREEN (Halaman Edit) ---
  if (step === 'edit') {
    return (
      <div className="editor-screen-wrapper">
        {postType === 'image' ? (
          <>
            <div className="editor-header">
               <button onClick={() => setStep('pick')} className="material-icons">arrow_back</button>
               <p>Atur Foto ({croppedImages.length + 1}/{rawImagesQueue.length})</p>
               <button onClick={handleSaveCrop} className="done-btn">Lanjut</button>
            </div>
            <div className="crop-area">
               <Cropper image={imageForCrop!} crop={crop} zoom={zoom} aspect={3/4} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
            </div>
            <div className="editor-footer">
               <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} />
            </div>
          </>
        ) : (
          <>
            <div className="editor-header">
               <button onClick={() => setStep('pick')} className="material-icons">arrow_back</button>
               <p>Potong Video (15s)</p>
               <button onClick={captureFrameAndSave} className="done-btn">Selesai</button>
            </div>
            <div className="video-preview-box">
               <video ref={videoRef} src={rawVideoUrl!} onLoadedMetadata={handleVideoLoadedMetadata} playsInline muted loop style={{ width: '100%', height: '100%', objectFit: 'cover', aspectRatio: '2/3' }} />
               <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
            <div className="editor-footer-video">
               <label>Pilih Durasi (Garis Biru)</label>
               <input type="range" className="box-trim-slider" min={0} max={Math.max(0, videoDuration - 15)} step={0.1} value={videoStart} onChange={(e) => {
                 const val = Number(e.target.value); setVideoStart(val);
                 if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.play(); }
                 if (coverTime < val || coverTime > val + 15) setCoverTime(val);
               }} />
               <label>Pilih Sampul (Garis Kuning)</label>
               <input type="range" className="cover-slider" min={videoStart} max={Math.min(videoDuration, videoStart + 15)} step={0.1} value={coverTime} onChange={(e) => {
                 const val = Number(e.target.value); setCoverTime(val);
                 if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.pause(); }
               }} />
            </div>
          </>
        )}
      </div>
    );
  }

  // --- 3. POST SCREEN (Halaman Akhir) ---
  return (
    <div className="create-page-wrapper post-details-screen">
      <header className="create-header">
        <button onClick={() => setStep('pick')} className="material-icons">arrow_back</button>
        <h2>Detail Postingan</h2>
        <div style={{ width: 24 }}></div>
      </header>

      <form onSubmit={handleSubmit} className="post-form-final">
        
        {/* Pratinjau Media */}
        <div className="media-summary-row">
           {postType === 'image' && previewUrls.map((url, i) => <img key={i} src={url} className="mini-preview" />)}
           {postType === 'video' && coverPreviewUrl && (
             <div className="video-summary-badge">
               <img src={coverPreviewUrl} className="mini-preview" />
               <span className="material-icons">play_circle</span>
             </div>
           )}
           <div className="destination-info">
              <select value={destination} onChange={(e) => setDestination(e.target.value as any)}>
                 <option value="feed">Post ke Feed</option>
                 <option value="story">Tambah ke Story</option>
              </select>
           </div>
        </div>

        <textarea 
          ref={captionInputRef} 
          placeholder="Tulis caption, gunakan @mentions dan #hashtags..." 
          value={caption} 
          onChange={(e) => setCaption(e.target.value)} 
          className="final-textarea"
        />

        <div className="form-group-final">
          <label>Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
             <option value="Karya">Karya</option>
             <option value="Photography">Photography</option>
             <option value="Prestasi">Prestasi</option>
          </select>
        </div>

        {/* Tombol Kirim */}
        <button type="submit" disabled={isSubmitting} className="final-submit-btn">
          {isSubmitting ? 'Mengirim...' : 'Bagikan Sekarang'}
        </button>

      </form>
    </div>
  );
}
