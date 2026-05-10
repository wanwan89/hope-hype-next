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

  const [postType, setPostType] = useState<'image' | 'text' | 'video'>('image');
  const [destination, setDestination] = useState<'feed' | 'story'>('feed');
  
  // 🔥 STATE VISIBILITY KHUSUS STORY 🔥
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');

  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Karya');
  
  // STATE GAMBAR
  const [rawImagesQueue, setRawImagesQueue] = useState<string[]>([]); 
  const [croppedImages, setCroppedImages] = useState<Blob[]>([]); 
  const [previewUrls, setPreviewUrls] = useState<string[]>([]); 

  // STATE VIDEO EDITOR
  const [rawVideoFile, setRawVideoFile] = useState<File | null>(null);
  const [rawVideoUrl, setRawVideoUrl] = useState<string | null>(null);
  const [isVideoEditorOpen, setIsVideoEditorOpen] = useState(false);
  
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStart, setVideoStart] = useState(0); 
  const [coverTime, setCoverTime] = useState(0); 
  
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverUrlPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null); 

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

  // MENTIONS & HASHTAGS
  const [showPopup, setShowPopup] = useState<'none' | 'mention' | 'hashtag'>('none');
  const [searchQuery, setSearchQuery] = useState("");
  const [popupResults, setPopupResults] = useState<any[]>([]);

  useEffect(() => {
    if (showPopup === 'none') return;
    const fetchSuggestions = async () => {
      if (showPopup === 'mention') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const myId = session.user.id;
        const { data: following } = await supabase.from('followers').select('following_id').eq('follower_id', myId);
        const { data: followers } = await supabase.from('followers').select('follower_id').eq('following_id', myId);
        
        const connectedIds = new Set([
            ...(following?.map(f => f.following_id) || []),
            ...(followers?.map(f => f.follower_id) || [])
        ]);

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
        } catch (err) { console.error("Gagal cari hashtag", err); }
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

  // ===============================================
  // 🔥 FUNGSI GAMBAR 🔥
  // ===============================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (croppedImages.length + files.length > 3) return showNotif("Maksimal hanya bisa 3 foto!", "warning");

    const readersArr: Promise<string>[] = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readersArr).then(results => {
      setRawImagesQueue(results); setImageForCrop(results[0]); 
    });
  };

  const onCropComplete = useCallback((_croppedArea: any, pixels: any) => { setCroppedAreaPixels(pixels); }, []);

  const handleSaveCrop = async () => {
    if (!imageForCrop || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageForCrop, croppedAreaPixels);
      setCroppedImages(prev => [...prev, croppedBlob]); setPreviewUrls(prev => [...prev, URL.createObjectURL(croppedBlob)]);

      const nextQueue = rawImagesQueue.slice(1);
      if (nextQueue.length > 0) {
        setRawImagesQueue(nextQueue); setImageForCrop(nextQueue[0]); setCrop({ x: 0, y: 0 }); setZoom(1); setCroppedAreaPixels(null);
      } else { setRawImagesQueue([]); setImageForCrop(null); }
    } catch (e) { console.error("Error Cropping:", e); }
  };

  const handleCancelCrop = () => {
    const nextQueue = rawImagesQueue.slice(1);
    if (nextQueue.length > 0) { setRawImagesQueue(nextQueue); setImageForCrop(nextQueue[0]); } 
    else { setRawImagesQueue([]); setImageForCrop(null); }
  };

  const handleRemovePreview = (index: number) => {
    setCroppedImages(prev => prev.filter((_, i) => i !== index)); setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // ===============================================
  // 🔥 FUNGSI VIDEO EDITOR 🔥
  // ===============================================
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return showNotif("Ukuran video terlalu besar! Maksimal 50MB.", "warning");

    setRawVideoFile(file);
    setRawVideoUrl(URL.createObjectURL(file));
    setIsVideoEditorOpen(true);
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setVideoStart(0);
      setCoverTime(0);
    }
  };

  const captureFrameAndSave = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // 🔥 SET TARGET KE 2:3 (AGAK TINGGI) 🔥
    const targetRatio = 2 / 3;
    const videoRatio = video.videoWidth / video.videoHeight;
    
    let cropWidth, cropHeight, startX, startY;

    if (videoRatio > targetRatio) {
      cropHeight = video.videoHeight;
      cropWidth = cropHeight * targetRatio;
      startX = (video.videoWidth - cropWidth) / 2;
      startY = 0;
    } else {
      cropWidth = video.videoWidth;
      cropHeight = cropWidth / targetRatio;
      startX = 0;
      startY = (video.videoHeight - cropHeight) / 2;
    }

    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    
    canvas.toBlob((blob) => {
      if (blob) {
        setCoverBlob(blob);
        setCoverUrlPreview(URL.createObjectURL(blob));
        setIsVideoEditorOpen(false); 
      }
    }, 'image/jpeg', 0.9);
  };

  const handleRemoveVideo = () => {
    setRawVideoFile(null); setRawVideoUrl(null); setCoverBlob(null); setCoverUrlPreview(null);
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

  const handleClose = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    router.back(); 
  };

  const uploadToCloudinary = async (file: File | Blob, resourceType: 'image' | 'video' = 'image') => {
    const fd = new FormData();
    fd.append("file", file); 
    fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, { method: "POST", body: fd });
    return await res.json();
  };

  // ===============================================
  // 🔥 FUNGSI SUBMIT POSTINGAN 🔥
  // ===============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (postType === 'image' && croppedImages.length === 0 && !caption.trim()) return alert(t('alert_empty_post'));
    if (postType === 'video' && !rawVideoFile) return showNotif("Pilih video terlebih dahulu!", "warning");
    if (destination === "story" && postType === 'image' && croppedImages.length > 1) return showNotif("Story hanya bisa upload 1 foto!", "warning");

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return window.dispatchEvent(new CustomEvent('openLogin'));
      const myUserId = session.user.id;

      const extractedTags = [...new Set((caption.match(/#(\w+)/g) || []).map(t => t.toLowerCase()))];
      if (extractedTags.length > 0) {
        const tagsToInsert = extractedTags.map(t => ({ tag: t }));
        await supabase.from('hashtags').upsert(tagsToInsert, { onConflict: 'tag' }).select();
      }

      let finalImageUrl: string | null = null;
      let finalVideoUrl: string | null = null;

      if (postType === 'image' && croppedImages.length > 0) {
        const uploadPromises = croppedImages.map(blob => uploadToCloudinary(blob, 'image'));
        const uploadResults = await Promise.all(uploadPromises);
        finalImageUrl = uploadResults.map(res => res.secure_url).join(',');
      } 
      else if (postType === 'video' && rawVideoFile && coverBlob) {
        showNotif("Mengunggah Video...", "info");
        
        const coverRes = await uploadToCloudinary(coverBlob, 'image');
        // 🔥 Paksa Cloudinary crop ke 2:3
        finalImageUrl = coverRes.secure_url.replace('/upload/', '/upload/c_fill,ar_2:3,g_auto/');

        const videoRes = await uploadToCloudinary(rawVideoFile, 'video');
        const uploadedVidUrl = videoRes.secure_url;
        const endSegment = Math.min(videoDuration, videoStart + 15);
        
        // 🔥 Paksa Cloudinary crop ke 2:3
        finalVideoUrl = uploadedVidUrl.replace('/upload/', `/upload/c_fill,ar_2:3,g_auto/so_${videoStart.toFixed(1)},eo_${endSegment.toFixed(1)}/`);
      }

      let newPostId: string | null = null;

      if (destination === "story") {
        await supabase.from("stories").insert({
          creator_id: myUserId,
          image_url: finalImageUrl, 
          video_url: finalVideoUrl, 
          content: caption.trim(),
          audio_src: selectedMusic?.previewUrl,
          title: selectedMusic?.trackName,
          artist: selectedMusic?.artistName,
          visibility: visibility // 🔥 INSERT KOLOM VISIBILITY 🔥
        });
      } else {
        const { data: prof } = await supabase.from("profiles").select("username").eq("id", myUserId).single();
        const { data: newPost } = await supabase.from("posts").insert({
          creator_id: myUserId,
          name: prof?.username || "User",
          bio: caption.trim(),
          category: category,
          image_url: finalImageUrl,  
          video_url: finalVideoUrl,  
          audio_src: selectedMusic?.previewUrl,
          title: selectedMusic?.trackName,
          artist: selectedMusic?.artistName,
          status: "pending"
        }).select('id').single();
        
        if (newPost) newPostId = newPost.id;
      }

      if (newPostId || destination === "story") {
        const mentionedUsernames = [...new Set((caption.match(/@(\w+)/g) || []).map(m => m.substring(1)))];
        if (mentionedUsernames.length > 0) {
          const { data: taggedUsers } = await supabase.from('profiles').select('id, username').in('username', mentionedUsernames);
          if (taggedUsers) {
            const { data: myProf } = await supabase.from("profiles").select("username").eq("id", myUserId).single();
            const notifInserts = taggedUsers.filter(u => u.id !== myUserId).map(u => ({
                user_id: u.id, actor_id: myUserId, post_id: newPostId ? parseInt(newPostId) : null,
                type: "mention", message: `${myProf?.username} menyebut Anda dalam ${destination === "story" ? "cerita" : "postingan"} barunya.`
              }));
            if (notifInserts.length > 0) await supabase.from("notifications").insert(notifInserts);
          }
        }
      }

      showNotif("Postingan Berhasil Terkirim!", "success");
      handleClose();
    } catch (err: any) { alert(err.message); } 
    finally { setIsSubmitting(false); }
  };


  return (
    <div className="create-page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '80px', paddingTop: 'env(safe-area-inset-top, 20px)' }}>
      
      <style>{`
        .popup-suggestion-box {
          position: absolute; bottom: 105%; left: 0; width: 100%; max-height: 220px;
          background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 16px;
          box-shadow: 0 -4px 25px rgba(0,0,0,0.4); overflow-y: auto; z-index: 99999; backdrop-filter: blur(10px);
        }
        .popup-item { display: flex; align-items: center; padding: 12px 16px; gap: 12px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: 0.2s; }
        .popup-item:hover, .popup-item:active { background: var(--bg-input); }
        .popup-item img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color); }
        .popup-name { font-size: 14px; font-weight: 700; color: var(--text-main); }
        .popup-tag { font-size: 14px; font-weight: 700; color: #1f3cff; } 
        .popup-empty { padding: 16px; text-align: center; font-size: 13px; color: var(--text-muted); font-weight: 500; }

        .video-trim-slider { -webkit-appearance: none; width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 5px; outline: none; margin-top: 10px; }
        .video-trim-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #1f3cff; cursor: pointer; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.5); }
      `}</style>

      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
        <button type="button" onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, margin: 0 }}>Buat Postingan</h2>
        <div style={{ width: 28 }}></div> 
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        
        {/* EDITOR FOTO (IMAGE CROP) */}
        {imageForCrop && (
          <div className="crop-overlay-wrapper" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }}>
            <div style={{ position: 'absolute', top: '15px', right: '20px', color: 'white', zIndex: 10000, fontWeight: 'bold' }}>
              Crop Gambar {croppedImages.length + 1} dari {croppedImages.length + rawImagesQueue.length}
            </div>
            <div className="crop-container-box" style={{ position: 'relative', width: '100%', height: 'calc(100vh - 120px)' }}>
              <Cropper image={imageForCrop} crop={crop} zoom={zoom} aspect={3 / 4} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
            </div>
            <div className="crop-footer-controls" style={{ position: 'absolute', bottom: 0, width: '100%', padding: '20px', background: 'rgba(0,0,0,0.8)' }}>
              <div className="zoom-slider" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#fff' }}>
                <span className="material-icons">remove</span>
                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1 }} />
                <span className="material-icons">add</span>
              </div>
              <div className="crop-action-btns" style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={handleCancelCrop} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#333', color: '#fff', border: 'none', fontWeight: 600 }}>Batal</button>
                <button type="button" onClick={handleSaveCrop} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#1f3cff', color: '#fff', border: 'none', fontWeight: 600 }}>Simpan</button>
              </div>
            </div>
          </div>
        )}

        {/* EDITOR VIDEO (TRIM 15s + COVER) */}
        {isVideoEditorOpen && rawVideoUrl && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
              Edit Video & Pilih Cover
            </div>

            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
              <video 
                ref={videoRef} 
                src={rawVideoUrl} 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onLoadedMetadata={handleVideoLoadedMetadata}
                playsInline muted
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div style={{ padding: '25px 20px', background: '#1a1a1a', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
              <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                  <span>Area Potong Video (Max 15s)</span>
                  <span style={{ color: '#1f3cff' }}>{videoStart.toFixed(1)}s - {Math.min(videoDuration, videoStart + 15).toFixed(1)}s</span>
                </div>
                <input 
                  type="range" className="video-trim-slider" 
                  min={0} max={Math.max(0, videoDuration - 15)} step={0.1} value={videoStart} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setVideoStart(val);
                    if (videoRef.current) videoRef.current.currentTime = val; 
                    if (coverTime < val || coverTime > val + 15) setCoverTime(val); 
                  }} 
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                  <span>Pilih Cover Profil (Thumbnail)</span>
                  <span style={{ color: '#f59e0b' }}>Frame: {coverTime.toFixed(1)}s</span>
                </div>
                <input 
                  type="range" className="video-trim-slider" 
                  min={videoStart} max={Math.min(videoDuration, videoStart + 15)} step={0.1} value={coverTime} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCoverTime(val);
                    if (videoRef.current) videoRef.current.currentTime = val; 
                  }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <button type="button" onClick={() => { setIsVideoEditorOpen(false); handleRemoveVideo(); }} style={{ flex: 1, padding: '14px', background: '#333', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 'bold' }}>Batal</button>
                <button type="button" onClick={captureFrameAndSave} style={{ flex: 1, padding: '14px', background: '#1f3cff', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 'bold' }}>Selesai & Lanjut</button>
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
                  <input type="radio" name="postDestination" value={dest.id} checked={destination === dest.id} onChange={() => setDestination(dest.id as any)} style={{ display: 'none' }} />
                  <div className="dest-content" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '15px', padding: 0, background: 'transparent', border: 'none' }}>
                    <div className="dest-icon-box" style={{ width: '40px', height: '40px', background: destination === dest.id ? '#1f3cff' : 'var(--bg-card)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: destination === dest.id ? '#fff' : 'var(--text-muted)' }}>
                      {dest.id === 'feed' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
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
            
            {/* 🔥 TOGGLE VISIBILITY KHUSUS STORY 🔥 */}
            {destination === 'story' && (
              <div className="visibility-toggle" style={{ display: 'flex', gap: '8px', marginTop: '15px', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '14px' }}>
                 <button 
                   type="button" 
                   onClick={() => setVisibility('public')} 
                   style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: visibility === 'public' ? 'var(--bg-input)' : 'transparent', color: visibility === 'public' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                 >
                   <span className="material-icons" style={{ fontSize: '16px' }}>public</span> Publik
                 </button>
                 <button 
                   type="button" 
                   onClick={() => setVisibility('followers')} 
                   style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: visibility === 'followers' ? 'var(--bg-input)' : 'transparent', color: visibility === 'followers' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                 >
                   <span className="material-icons" style={{ fontSize: '16px' }}>group</span> Hanya Followers
                 </button>
              </div>
            )}
          </div>

          <div className="post-type-toggle" style={{ display: 'flex', gap: '8px', marginTop: '20px', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '14px' }}>
            {['image', 'video', 'text'].map(type => (
               <button 
                 key={type} type="button" 
                 className={`type-btn ${postType === type ? 'active' : ''}`} 
                 onClick={() => {
                   setPostType(type as any);
                   setCroppedImages([]); setPreviewUrls([]); handleRemoveVideo();
                 }} 
                 style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: postType === type ? 'var(--bg-input)' : 'transparent', color: postType === type ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
               >
                 {type === 'image' ? 'Foto' : type === 'video' ? 'Video' : 'Teks'}
               </button>
            ))}
          </div>

          {postType === 'image' && (
            <div style={{ marginTop: '20px' }}>
              <input type="file" ref={fileInputRef} accept="image/*" multiple hidden onChange={handleFileChange} />
              
              {previewUrls.length === 0 ? (
                <div className="post-upload-area" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', height: '200px', background: 'var(--bg-secondary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px dashed var(--border-card)' }}>
                  <div className="post-upload-placeholder" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <span className="material-icons" style={{ fontSize: '40px', marginBottom: '10px', color: '#1f3cff' }}>add_photo_alternate</span>
                    <div className="post-upload-text" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Pilih Foto (Max 3)</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                  {previewUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative', width: '120px', height: '160px', flexShrink: 0 }}>
                      <img src={url} alt={`Preview ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                      <button type="button" onClick={() => handleRemovePreview(i)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <span className="material-icons" style={{ fontSize: '14px' }}>close</span>
                      </button>
                    </div>
                  ))}
                  {previewUrls.length < 3 && destination === 'feed' && (
                    <div onClick={() => fileInputRef.current?.click()} style={{ width: '120px', height: '160px', border: '2px dashed var(--border-card)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: 'var(--text-muted)' }}>
                       <span className="material-icons" style={{ fontSize: '30px' }}>add</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AREA UPLOAD VIDEO (🔥 FIX TAMPILAN FULL 9:16 🔥) */}
          {postType === 'video' && (
            <div style={{ marginTop: '20px' }}>
              <input type="file" ref={videoInputRef} accept="video/*" hidden onChange={handleVideoSelect} />
              
              {!coverPreviewUrl ? (
                <div className="post-upload-area" onClick={() => videoInputRef.current?.click()} style={{ width: '100%', height: '300px', background: 'var(--bg-secondary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px dashed var(--border-card)' }}>
                  <div className="post-upload-placeholder" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <span className="material-icons" style={{ fontSize: '50px', marginBottom: '10px', color: '#1f3cff' }}>videocam</span>
                    <div className="post-upload-text" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>Pilih Video Vertikal</div>
                    <div style={{ fontSize: '12px', marginTop: '5px' }}>(Max 50MB)</div>
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
{/* 🔥 PREVIEW FORM: ASPECT RATIO 2:3 🔥 */}
<img src={coverPreviewUrl} alt="Cover Preview" style={{ width: '100%', display: 'block', aspectRatio: '2/3', objectFit: 'cover' }} />

                  <div style={{ position: 'absolute', top: '15px', left: '15px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-icons" style={{ fontSize: '16px' }}>play_circle_filled</span> Trimmed (15s)
                  </div>
                  <button type="button" onClick={handleRemoveVideo} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                    <span className="material-icons" style={{ fontSize: '20px' }}>delete</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ position: 'relative', marginTop: '20px' }}>
            
            {showPopup !== 'none' && (
              <div className="popup-suggestion-box">
                {popupResults.length > 0 ? (
                  popupResults.map(item => (
                    <div 
                      key={item.id || item.tag} 
                      className="popup-item" 
                      onClick={() => handleSelectPopupItem(showPopup === 'mention' ? item.username : item.tag)}
                    >
                      {showPopup === 'mention' ? (
                        <>
                          <img src={item.avatar_url || '/asets/png/profile.webp'} alt={item.username} />
                          <div className="popup-name">{item.username}</div>
                        </>
                      ) : (
                        <>
                          <span className="material-icons" style={{ color: '#1DA1F2' }}>tag</span>
                          <div className="popup-tag">{item.tag}</div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="popup-empty">Tidak ditemukan...</div>
                )}
              </div>
            )}

            <textarea 
              ref={captionInputRef}
              className="post-textarea" 
              placeholder={postType === 'image' || postType === 'video' ? "Tulis caption atau gunakan @ untuk tag dan # untuk hashtag..." : "Tulis cerita, gunakan @ untuk tag dan # untuk hashtag..."} 
              maxLength={300}
              value={caption}
              onChange={handleCaptionChange}
              onKeyDown={(e) => {
                if (showPopup !== 'none' && e.key === "Enter") {
                  e.preventDefault();
                  if (popupResults.length > 0) {
                    handleSelectPopupItem(showPopup === 'mention' ? popupResults[0].username : popupResults[0].tag);
                  }
                }
              }}
              style={{ width: '100%', minHeight: '120px', background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: '16px', padding: '15px', color: 'var(--text-main)', fontSize: '15px', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div style={{ position: 'relative', marginTop: '20px' }}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="post-select-custom" style={{ width: '100%', padding: '15px', border: '1px solid var(--border-card)', borderRadius: '12px', appearance: 'none', WebkitAppearance: 'none', backgroundColor: 'var(--bg-secondary)', fontSize: '15px', color: 'var(--text-main)', cursor: 'pointer', outline: 'none', fontWeight: '600' }}>
              {[
                { val: "Karya", label: t('cat_karya') }, { val: "Prestasi", label: t('cat_prestasi') }, { val: "Photography", label: t('cat_photo') }, { val: "Mountain", label: t('cat_mountain') }, { val: "Thread", label: t('cat_thread') }
              ].map(opt => ( <option key={opt.val} value={opt.val}>{opt.label}</option> ))}
            </select>
            <i style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '12px' }}>▼</i>
          </div>

          <div className="music-picker-section" style={{ marginTop: '25px', background: 'var(--bg-secondary)', padding: '15px', borderRadius: '16px' }}>
            <div className="section-label-bold" style={{ color: 'var(--text-main)', fontWeight: 700, marginBottom: '15px' }}>{t('select_music_optional')}</div>
            {!selectedMusic ? (
              <>
                <div style={{ position: 'relative' }}>
                  <span className="material-icons" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '20px' }}>search</span>
                  <input type="text" placeholder={t('search_music')} className="music-search-input" value={searchMusic} onChange={(e) => setSearchMusic(e.target.value)} style={{ width: '100%', padding: '12px 15px 12px 40px', borderRadius: '10px', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }} />
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
            {isSubmitting ? (postType === 'video' ? 'Memproses Video...' : t('btn_uploading')) : t('btn_submit_post')}
          </button>
        </form>
      </div>
    </div>
  );
}
