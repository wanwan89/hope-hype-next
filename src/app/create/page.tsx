'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Cropper from 'react-easy-crop'; 
import { getCroppedImg, showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion'; 
import './Create.css'; 

const CLOUDINARY_CLOUD_NAME = "dhhmkb8kl";
const CLOUDINARY_UPLOAD_PRESET = "post_hope";

export default function CreatePostPage() {
  const { t } = useTranslation();
  const router = useRouter(); 

  const [postType, setPostType] = useState<'image' | 'text' | 'video'>('image');
  const [destination, setDestination] = useState<'feed' | 'story'>('feed');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Karya');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false); 
  
  const [rawImagesQueue, setRawImagesQueue] = useState<string[]>([]); 
  const [croppedImages, setCroppedImages] = useState<Blob[]>([]); 
  const [previewUrls, setPreviewUrls] = useState<string[]>([]); 

  const [rawVideoFile, setRawVideoFile] = useState<File | null>(null);
  const [rawVideoUrl, setRawVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStart, setVideoStart] = useState(0); 
  const [coverTime, setCoverTime] = useState(0); 
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverUrlPreview] = useState<string | null>(null);
  
  const [videoThumbnails, setVideoThumbnails] = useState<string[]>([]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null); 

  const [searchMusic, setSearchMusic] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // 🔥 STATE BARU UNTUK SLIDE-UP MUSIK 🔥
  const [isMusicSheetOpen, setIsMusicSheetOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [videoPos, setVideoPos] = useState(50);
  
const [step, setStep] = useState<'pick' | 'edit' | 'post'>('post');


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
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchMusic)}&media=music&limit=20`);
        const data = await res.json(); setMusicResults(data.results || []);
      } catch (err) { console.error(err); } finally { setIsSearching(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchMusic]);

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
      setRawImagesQueue(results); 
      setImageForCrop(results[0]); 
      setStep('edit'); 
    });
  };

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
        setCroppedAreaPixels(null);
      } else {
        setRawImagesQueue([]);
        setImageForCrop(null);
        setStep('post'); 
      }
    } catch (e) { console.error("Error Cropping:", e); }
  };

  const handleCancelCrop = () => {
    const nextQueue = rawImagesQueue.slice(1);
    if (nextQueue.length > 0) {
      setRawImagesQueue(nextQueue);
      setImageForCrop(nextQueue[0]);
    } else {
      setRawImagesQueue([]);
      setImageForCrop(null);
      setStep('post'); 
    }
  };

  const handleRemovePreview = (index: number) => {
    setCroppedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const generateVideoThumbnails = async (url: string, duration: number) => {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    
    await new Promise((resolve) => { video.onloadeddata = resolve; });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 60; 
    canvas.height = 80;

    const numThumbs = 8; 
    const thumbs: string[] = [];

    for (let i = 0; i < numThumbs; i++) {
      video.currentTime = (duration / numThumbs) * i;
      await new Promise((resolve) => { video.onseeked = resolve; });
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      thumbs.push(canvas.toDataURL('image/jpeg', 0.6));
    }
    setVideoThumbnails(thumbs);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return showNotif("Ukuran video terlalu besar! Maksimal 50MB.", "warning");

    setRawVideoFile(file);
    const objUrl = URL.createObjectURL(file);
    setRawVideoUrl(objUrl);
    setVideoThumbnails([]); 
    setStep('edit'); 
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setVideoStart(0);
      setCoverTime(0);
      if (rawVideoUrl) generateVideoThumbnails(rawVideoUrl, duration);
    }
  };

  const togglePlayVideo = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      } else {
        videoRef.current.play();
        setIsVideoPlaying(true);
      }
    }
  };

  const captureFrameAndSave = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    video.pause();
    setIsVideoPlaying(false);

    const targetRatio = 2 / 3;
    const videoRatio = video.videoWidth / video.videoHeight;
    let cw, ch, sx, sy;

    if (videoRatio > targetRatio) {
      ch = video.videoHeight; cw = ch * targetRatio;
      sx = (video.videoWidth - cw) / 2; 
      sy = 0;
    } else {
      cw = video.videoWidth; ch = cw / targetRatio;
      sx = 0; 
      sy = (video.videoHeight - ch) / 2; 
    }

    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
    
    canvas.toBlob((blob) => {
      if (blob) {
        setCoverBlob(blob);
        setCoverUrlPreview(URL.createObjectURL(blob));
        setStep('post'); 
      }
    }, 'image/jpeg', 0.9);
  };

  const handleRemoveVideo = () => {
    setRawVideoFile(null);
    setRawVideoUrl(null);
    setCoverBlob(null);
    setCoverUrlPreview(null);
    setVideoThumbnails([]);
    setStep('post'); // 🔥 Ganti jadi 'post'
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

  const uploadToCloudinary = (file: File | Blob, resourceType: 'image' | 'video' = 'image') => {
    return new Promise<any>((resolve, reject) => {
      const fd = new FormData();
      const filename = file instanceof File ? file.name : `upload_${Date.now()}.${resourceType === 'image' ? 'jpg' : 'mp4'}`;
      fd.append("file", file, filename); 
      fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      
      // 🔥 Baris moderation dihapus karena Preset Cloudinary lu udah otomatis nge-scan! 🔥

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete); 
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
        else reject(JSON.parse(xhr.responseText));
      };

      xhr.onerror = () => reject("Network Error during upload");
      xhr.send(fd);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (postType === 'image' && croppedImages.length === 0 && !caption.trim()) return alert(t('alert_empty_post'));
    if (postType === 'video' && !rawVideoFile) return showNotif("Pilih video terlebih dahulu!", "warning");
    if (destination === "story" && postType === 'image' && croppedImages.length > 1) return showNotif("Story hanya bisa upload 1 foto!", "warning");

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return window.dispatchEvent(new CustomEvent('openLogin'));
      const myUserId = session.user.id;

      const extractedTags = [...new Set((caption.match(/#[\w_]+/g) || []).map(t => t.toLowerCase()))];
      if (extractedTags.length > 0) {
        for (const tg of extractedTags) {
          await supabase.from('hashtags').upsert({ tag: tg }).then(); 
        }
      }

      let finalImageUrl: string | null = null;
      let finalVideoUrl: string | null = null;
      let moderationStatus = "pending"; 

      if (postType === 'image' && croppedImages.length > 0) {
        const uploadPromises = croppedImages.map(blob => uploadToCloudinary(blob, 'image'));
        const uploadResults = await Promise.all(uploadPromises);
        
        const isRejected = uploadResults.some(res => res.moderation && res.moderation[0].status === 'rejected');
        if (isRejected) {
          setIsSubmitting(false);
          return showNotif("Postingan ditolak! Terdeteksi konten sensitif.", "error");
        }

        finalImageUrl = uploadResults.map(res => res.secure_url).join(',');
        setUploadProgress(100);
      } 
      else if (postType === 'video' && rawVideoFile && coverBlob) {
        const coverRes = await uploadToCloudinary(coverBlob, 'image');
        
        if (coverRes.moderation && coverRes.moderation[0].status === 'rejected') {
           setIsSubmitting(false);
           return showNotif("Video ditolak! Sampul terdeteksi konten sensitif.", "error");
        }

        finalImageUrl = coverRes.secure_url; 
        const videoRes = await uploadToCloudinary(rawVideoFile, 'video');
        const uploadedVidUrl = videoRes.secure_url;
        const endSegment = Math.min(videoDuration, videoStart + 15);
        finalVideoUrl = uploadedVidUrl.replace('/upload/', `/upload/c_fill,ar_2:3/so_${videoStart.toFixed(1)},eo_${endSegment.toFixed(1)}/`);
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
          visibility: visibility
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
          status: "approved" 
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
    } catch (err: any) { 
      console.error(err);
      showNotif("Gagal upload, periksa koneksi atau konten Anda.", "error");
    } 
    finally { setIsSubmitting(false); setUploadProgress(0); }
  };

  const renderEditorScreen = () => {
    if (step !== 'edit') return null;
    
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#080808', display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => { if (postType === 'image') handleCancelCrop(); else { handleRemoveVideo(); setStep('pick'); } }} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="material-icons">arrow_back</span>
          </button>
          <p style={{ color: '#fff', fontSize: '16px', fontWeight: 600, margin: 0 }}>
            {postType === 'image' ? `Atur Foto (${croppedImages.length + 1}/${croppedImages.length + rawImagesQueue.length})` : 'Edit Video'}
          </p>
          <button onClick={postType === 'image' ? handleSaveCrop : captureFrameAndSave} style={{ background: '#1f3cff', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '20px', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>
            Selesai
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#000', padding: '10px' }}>
          {postType === 'image' && imageForCrop ? (
            <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: '16px', overflow: 'hidden' }}>
              <Cropper image={imageForCrop} crop={crop} zoom={zoom} aspect={3 / 4} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
            </div>
          ) : postType === 'video' && rawVideoUrl ? (
            <div style={{ width: 'auto', height: '100%', maxWidth: '100%', position: 'relative', overflow: 'hidden', aspectRatio: '2/3', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <video ref={videoRef} src={rawVideoUrl} playsInline muted={!isVideoPlaying} loop style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} onLoadedMetadata={handleVideoLoadedMetadata} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div onClick={togglePlayVideo} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isVideoPlaying ? 'transparent' : 'rgba(0,0,0,0.5)', cursor: 'pointer', transition: '0.2s' }}>
                {!isVideoPlaying && <div style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', padding: '15px', borderRadius: '50%' }}><span className="material-icons" style={{ fontSize: '40px', color: '#fff' }}>play_arrow</span></div>}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ flexShrink: 0, padding: '20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))', background: '#111', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {postType === 'image' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#fff' }}>
              <span className="material-icons" style={{ fontSize: '20px' }}>remove</span>
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1, accentColor: '#1f3cff' }} />
              <span className="material-icons" style={{ fontSize: '20px' }}>add</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="editor-control-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-icons" style={{ fontSize: '16px', color: '#1f3cff' }}>content_cut</span> Potong Video (Max 15s)</span>
                  <span style={{ color: '#aaa', fontSize: '12px', fontWeight: 600 }}>{videoStart.toFixed(1)}s - {Math.min(videoDuration, videoStart + 15).toFixed(1)}s</span>
                </div>
                <div className="filmstrip-box">
                  <div className="filmstrip-images">{videoThumbnails.map((thumb, idx) => <img key={idx} src={thumb} alt="thumb" />)}</div>
                  <input type="range" className="custom-range-timeline blue-slider" min={0} max={Math.max(0, videoDuration - 15)} step={0.1} value={videoStart} onChange={(e) => { const val = Number(e.target.value); setVideoStart(val); if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.play(); setIsVideoPlaying(true); } if (coverTime < val || coverTime > val + 15) setCoverTime(val); }} />
                </div>
              </div>
              <div className="editor-control-card">
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-icons" style={{ fontSize: '16px', color: '#f59e0b' }}>image</span> Pilih Sampul Depan</span>
                  <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>Tampil di: {coverTime.toFixed(1)}s</span>
                </div>
                <div className="filmstrip-box" style={{ height: '30px' }}>
                  <input type="range" className="custom-range-timeline orange-slider" min={videoStart} max={Math.min(videoDuration, videoStart + 15)} step={0.1} value={coverTime} onChange={(e) => { const val = Number(e.target.value); setCoverTime(val); if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.pause(); setIsVideoPlaying(false); } }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="create-page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '80px', paddingTop: 'env(safe-area-inset-top, 20px)' }}>

      {step === 'edit' && renderEditorScreen()}

      {/* 🔥 MODAL SLIDE-UP PENCARIAN MUSIK 🔥 */}
      <AnimatePresence>
        {isMusicSheetOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMusicSheetOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999 }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, height: '75dvh', 
                background: 'var(--bg-secondary)', borderTopLeftRadius: '24px', 
                borderTopRightRadius: '24px', zIndex: 10000, display: 'flex', flexDirection: 'column' 
              }}
            >
               {/* Header Handle */}
               <div style={{ width: '40px', height: '5px', background: 'var(--border-card)', borderRadius: '10px', margin: '15px auto 10px' }} />
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 15px', borderBottom: '1px solid var(--border-card)' }}>
                 <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '18px' }}>Tambahkan Musik</h3>
                 <button onClick={() => { setIsMusicSheetOpen(false); if (audioRef.current) { audioRef.current.pause(); setPlayingUrl(null); } }} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex' }}>
                   <span className="material-icons">close</span>
                 </button>
               </div>
               
               {/* Input Cari Musik */}
               <div style={{ padding: '15px 20px' }}>
                  <div style={{ position: 'relative' }}>
                    <span className="material-icons" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>search</span>
                    <input 
                      autoFocus 
                      type="text" 
                      placeholder={t('search_music')} 
                      value={searchMusic} 
                      onChange={(e) => setSearchMusic(e.target.value)} 
                      style={{ width: '100%', padding: '14px 15px 14px 45px', borderRadius: '14px', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '15px', outline: 'none', fontWeight: 'bold' }} 
                    />
                  </div>
               </div>

               {/* Hasil Pencarian */}
               <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
                  {isSearching ? (
                    <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>
                       <span className="material-icons" style={{ fontSize: '40px', animation: 'spin 1s linear infinite' }}>autorenew</span>
                       <p style={{ fontWeight: 600, marginTop: '10px' }}>Mencari lagu...</p>
                    </div>
                  ) : musicResults.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {musicResults.map((song, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', padding: '12px', borderRadius: '16px', border: '1px solid var(--border-card)' }}>
                          <div style={{ position: 'relative', width: 60, height: 60, marginRight: 15, flexShrink: 0 }}>
                            <img src={song.artworkUrl100} style={{ width:'100%', height:'100%', borderRadius: 12, objectFit: 'cover' }} />
                            <div onClick={() => togglePlayPreview(song.previewUrl)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <span className="material-icons" style={{ color: '#fff', fontSize: '30px' }}>{playingUrl === song.previewUrl ? 'pause' : 'play_arrow'}</span>
                            </div>
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden' }}>{song.trackName}</div>
                            <div style={{ fontSize: 13, color:'var(--text-muted)', marginTop: '4px' }}>{song.artistName}</div>
                          </div>
                          <button 
                            onClick={() => {
                              setSelectedMusic(song);
                              if (audioRef.current) { audioRef.current.pause(); setPlayingUrl(null); }
                              setIsMusicSheetOpen(false); // Tutup slide-up
                            }} 
                            style={{ background: '#1f3cff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', marginLeft: '10px' }}
                          >
                            Pilih
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : searchMusic ? (
                     <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)', fontWeight: 600 }}>Tidak ada hasil untuk "{searchMusic}"</div>
                  ) : (
                     <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ketik judul lagu atau nama artis di atas...</div>
                  )}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {step === 'post' && (
        <>
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <button type="button" onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <span className="material-icons">arrow_back</span>
            </button>
            <h2 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, margin: 0 }}>Buat Postingan</h2>
            <div style={{ width: 28 }}></div> 
          </div>

          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <form onSubmit={handleSubmit} className="post-form">

              <div className="destination-container">
                <p className="section-label" style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>{t('send_to')}</p>
                <div className="dest-toggle-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[ { id: 'feed', title: t('feed_title', 'Feed'), desc: t('feed_desc', 'Tampil di timeline publik') }, { id: 'story', title: t('story_title', 'Cerita'), desc: t('story_desc', 'Hilang dalam 24 jam') } ].map((dest) => (
                    <label key={dest.id} className="dest-option" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', border: destination === dest.id ? '2px solid #1f3cff' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <input type="radio" name="postDestination" value={dest.id} checked={destination === dest.id} onChange={() => setDestination(dest.id as any)} style={{ display: 'none' }} />
                      <div className="dest-content" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '15px', padding: 0, background: 'transparent', border: 'none' }}>
                        <div className="dest-icon-box" style={{ width: '40px', height: '40px', background: destination === dest.id ? '#1f3cff' : 'var(--bg-card)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: destination === dest.id ? '#fff' : 'var(--text-muted)' }}>{dest.id === 'feed' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}</div>
                        <div className="dest-text" style={{ flex: 1 }}><div className="dest-title" style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 700 }}>{dest.title}</div><div className="dest-desc" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{dest.desc}</div></div>
                        <div className="dest-check" style={{ width: '20px', height: '20px', borderRadius: '50%', border: destination === dest.id ? '6px solid #1f3cff' : '2px solid var(--border-card)' }}></div>
                      </div>
                    </label>
                  ))}
                </div>
                {destination === 'story' && <div className="visibility-toggle" style={{ display: 'flex', gap: '8px', marginTop: '15px', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '14px' }}><button type="button" onClick={() => setVisibility('public')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: visibility === 'public' ? 'var(--bg-input)' : 'transparent', color: visibility === 'public' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><span className="material-icons" style={{ fontSize: '16px' }}>public</span> Publik</button><button type="button" onClick={() => setVisibility('followers')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: visibility === 'followers' ? 'var(--bg-input)' : 'transparent', color: visibility === 'followers' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><span className="material-icons" style={{ fontSize: '16px' }}>group</span> Hanya Followers</button></div>}
              </div>

              <div className="post-type-toggle" style={{ display: 'flex', gap: '8px', marginTop: '20px', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '14px' }}>
                {['image', 'video', 'text'].map(type => (
                   <button key={type} type="button" className={`type-btn ${postType === type ? 'active' : ''}`} onClick={() => { setPostType(type as any); setCroppedImages([]); setPreviewUrls([]); handleRemoveVideo(); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: postType === type ? 'var(--bg-input)' : 'transparent', color: postType === type ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}>{type === 'image' ? 'Foto' : type === 'video' ? 'Video' : 'Teks'}</button>
                ))}
              </div>

              {postType === 'image' && (
                <div style={{ marginTop: '20px' }}>
                  <input type="file" ref={fileInputRef} accept="image/*" multiple hidden onChange={handleFileChange} />
                  {previewUrls.length === 0 ? (
                    <div className="post-upload-area" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', height: '200px', background: 'var(--bg-secondary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px dashed var(--border-card)' }}><div className="post-upload-placeholder" style={{ textAlign: 'center', color: 'var(--text-muted)' }}><span className="material-icons" style={{ fontSize: '40px', marginBottom: '10px', color: '#1f3cff' }}>add_photo_alternate</span><div className="post-upload-text" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Pilih Foto (Max 3)</div></div></div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                      {previewUrls.map((url, i) => (<div key={i} style={{ position: 'relative', width: '120px', height: '160px', flexShrink: 0 }}><img src={url} alt={`Preview ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} /><button type="button" onClick={() => handleRemovePreview(i)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><span className="material-icons" style={{ fontSize: '14px' }}>close</span></button></div>))}
                      {previewUrls.length < 3 && destination === 'feed' && (<div onClick={() => fileInputRef.current?.click()} style={{ width: '120px', height: '160px', border: '2px dashed var(--border-card)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: 'var(--text-muted)' }}><span className="material-icons" style={{ fontSize: '30px' }}>add</span></div>)}
                    </div>
                  )}
                </div>
              )}

              {postType === 'video' && (
                <div style={{ marginTop: '20px' }}>
                  <input type="file" ref={videoInputRef} accept="video/*" hidden onChange={handleVideoSelect} />
                  {!coverPreviewUrl ? (
                    <div className="post-upload-area" onClick={() => videoInputRef.current?.click()} style={{ width: '100%', height: '300px', background: 'var(--bg-secondary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px dashed var(--border-card)' }}><div className="post-upload-placeholder" style={{ textAlign: 'center', color: 'var(--text-muted)' }}><span className="material-icons" style={{ fontSize: '50px', marginBottom: '10px', color: '#1f3cff' }}>videocam</span><div className="post-upload-text" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>Pilih Video Vertikal</div><div style={{ fontSize: '12px', marginTop: '5px' }}>(Max 50MB)</div></div></div>
                  ) : (
                    <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', background: '#000' }}><img src={coverPreviewUrl} alt="Cover Preview" style={{ width: '100%', display: 'block', aspectRatio: '2/3', objectFit: 'cover' }} /><div style={{ position: 'absolute', top: '15px', left: '15px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-icons" style={{ fontSize: '16px' }}>play_circle_filled</span> Trimmed (15s)</div><button type="button" onClick={handleRemoveVideo} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}><span className="material-icons" style={{ fontSize: '20px' }}>delete</span></button></div>
                  )}
                </div>
              )}

              <div style={{ position: 'relative', marginTop: '20px' }}>
                {showPopup !== 'none' && (
                  <div className="popup-suggestion-box">
                    {popupResults.length > 0 ? ( popupResults.map(item => (<div key={item.id || item.tag} className="popup-item" onClick={() => handleSelectPopupItem(showPopup === 'mention' ? item.username : item.tag)}>{showPopup === 'mention' ? (<><img src={item.avatar_url || '/asets/png/profile.webp'} alt={item.username} /><div className="popup-name">{item.username}</div></>) : (<><span className="material-icons" style={{ color: '#1DA1F2' }}>tag</span><div className="popup-tag">{item.tag}</div></>)}</div>)) ) : ( <div className="popup-empty">Tidak ditemukan...</div> )}
                  </div>
                )}
                <textarea ref={captionInputRef} className="post-textarea" placeholder={postType === 'image' || postType === 'video' ? "Tulis caption atau gunakan @ untuk tag dan # untuk hashtag..." : "Tulis cerita, gunakan @ untuk tag dan # untuk hashtag..."} maxLength={300} value={caption} onChange={handleCaptionChange} onKeyDown={(e) => { if (showPopup !== 'none' && e.key === "Enter") { e.preventDefault(); if (popupResults.length > 0) { handleSelectPopupItem(showPopup === 'mention' ? popupResults[0].username : popupResults[0].tag); } } }} style={{ width: '100%', minHeight: '120px', background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: '16px', padding: '15px', color: 'var(--text-main)', fontSize: '15px', outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ position: 'relative', marginTop: '20px' }}>
                {isCategoryOpen && <div onClick={() => setIsCategoryOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />}
                <div onClick={() => setIsCategoryOpen(!isCategoryOpen)} style={{ width: '100%', padding: '15px', border: '1px solid var(--border-card)', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', fontSize: '15px', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{[ { val: "Karya", label: t('cat_karya', 'Karya') }, { val: "Prestasi", label: t('cat_prestasi', 'Prestasi') }, { val: "Photography", label: t('cat_photo', 'Photography') }, { val: "Mountain", label: t('cat_mountain', 'Mountain') }, { val: "Thread", label: t('cat_thread', 'Thread') } ].find(opt => opt.val === category)?.label || category}</span><span className="material-icons" style={{ color: 'var(--text-muted)', fontSize: '20px', transform: isCategoryOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>expand_more</span></div>
                <AnimatePresence>
                  {isCategoryOpen && (<motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '8px', background: 'var(--bg-main, #1a1d21)', border: '1px solid var(--border-card, #2a2d31)', borderRadius: '16px', padding: '8px', zIndex: 100, boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}>{[ { val: "Karya", label: t('cat_karya', 'Karya') }, { val: "Prestasi", label: t('cat_prestasi', 'Prestasi') }, { val: "Photography", label: t('cat_photo', 'Photography') }, { val: "Mountain", label: t('cat_mountain', 'Mountain') }, { val: "Thread", label: t('cat_thread', 'Thread') } ].map((opt) => (<div key={opt.val} onClick={() => { setCategory(opt.val); setIsCategoryOpen(false); }} style={{ padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: category === opt.val ? 'rgba(31, 60, 255, 0.1)' : 'transparent', color: category === opt.val ? '#1f3cff' : 'var(--text-main)', fontWeight: category === opt.val ? 'bold' : 'normal', transition: 'background 0.2s' }}>{opt.label}{category === opt.val && <span className="material-icons" style={{ fontSize: '18px' }}>check_circle</span>}</div>))}</motion.div>)}
                </AnimatePresence>
              </div>

              {/* 🔥 TOMBOL BUKA SLIDE-UP MUSIK 🔥 */}
              <div 
                className="music-picker-btn" 
                onClick={() => setIsMusicSheetOpen(true)}
                style={{ marginTop: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', padding: '15px', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#1f3cff', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <span className="material-icons" style={{ color: '#fff', fontSize: '24px' }}>music_note</span>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '15px' }}>
                      {selectedMusic ? selectedMusic.trackName : 'Tambahkan Musik'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                      {selectedMusic ? selectedMusic.artistName : 'Opsional (Pilih lagu favoritmu)'}
                    </div>
                  </div>
                </div>
                {selectedMusic ? (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedMusic(null); 
                      if (playingUrl === selectedMusic.previewUrl) audioRef.current?.pause(); 
                    }} 
                    style={{ background: 'rgba(255,71,87,0.1)', color: '#ff4757', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                  >
                    Hapus
                  </button>
                ) : (
                  <span className="material-icons" style={{ color: 'var(--text-muted)' }}>chevron_right</span>
                )}
              </div>

              {/* 🔥 TOMBOL SUBMIT DENGAN ANIMASI GELOMBANG AIR SMOOTH 🔥 */}
              <button 
                type="submit" 
                className="post-submit-btn" 
                disabled={isSubmitting} 
                style={{ 
                  marginTop: '30px', 
                  width: '100%', 
                  padding: '16px', 
                  color: '#fff', 
                  border: isSubmitting ? '1px solid #1f3cff' : 'none', 
                  borderRadius: '14px', 
                  fontSize: '16px', 
                  fontWeight: 800, 
                  cursor: isSubmitting ? 'not-allowed' : 'pointer', 
                  position: 'relative',
                  overflow: 'hidden', // Super penting biar gelombangnya gak bocor keluar tombol
                  background: isSubmitting ? 'var(--bg-input)' : '#1f3cff',
                  transform: 'translateZ(0)',
                }}
              >
                {isSubmitting && (
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: `${100 - Math.max(uploadProgress, 2)}%` }} // Gerak translasi Y ke atas (smooth)
                    transition={{ ease: "easeInOut", duration: 0.8 }}
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '150%', // Height dilebihin biar wave gak kepotong
                      background: '#1f3cff',
                      zIndex: 1
                    }}
                  >
                    {/* Gelombang Transparan (Belakang) */}
                    <motion.div
                      animate={{ x: ["0%", "-50%"] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      style={{
                        position: 'absolute', top: '-19px', left: 0, width: '200%', height: '20px',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 50'%3E%3Cpath d='M0,25 C150,55 250,-5 400,25 C550,55 650,-5 800,25 L800,50 L0,50 Z' fill='rgba(31,60,255,0.5)'/%3E%3C/svg%3E")`,
                        backgroundSize: '50% 100%',
                        backgroundRepeat: 'repeat-x'
                      }}
                    />
                    {/* Gelombang Solid (Depan) */}
                    <motion.div
                      animate={{ x: ["-50%", "0%"] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                      style={{
                        position: 'absolute', top: '-14px', left: 0, width: '200%', height: '15px',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 50'%3E%3Cpath d='M0,25 C150,45 250,5 400,25 C550,45 650,5 800,25 L800,50 L0,50 Z' fill='%231f3cff'/%3E%3C/svg%3E")`,
                        backgroundSize: '50% 100%',
                        backgroundRepeat: 'repeat-x'
                      }}
                    />
                  </motion.div>
                )}
                
                <span style={{ position: 'relative', zIndex: 2, textShadow: isSubmitting ? '0px 2px 4px rgba(0,0,0,0.5)' : 'none' }}>
                  {isSubmitting ? `MENGIRIM... ${uploadProgress}%` : t('btn_submit_post')}
                </span>
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
