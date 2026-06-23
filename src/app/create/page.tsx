'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Cropper from 'react-easy-crop';
import { getCroppedImg, showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import './Create.css';

// Komponen yang sudah dipisah
import CreateHeader from './create/CreateHeader';
import DestinationSelector from './create/DestinationSelector';
import PostTypeSelector from './create/PostTypeSelector';
import ImageUploader from './create/ImageUploader';
import VideoUploader from './create/VideoUploader';
import CaptionInput from './create/CaptionInput';
import MusicPicker from './create/MusicPicker';
import AdToggle from './create/AdToggle';
import SubmitButtons from './create/SubmitButtons';
import MusicSheet from './create/MusicSheet';

const CLOUDINARY_CLOUD_NAME = "dhhmkb8kl";
const CLOUDINARY_UPLOAD_PRESET = "post_hope";

export default function CreatePostPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams?.get('draft_id');

  // State utama
  const [postType, setPostType] = useState<'image' | 'text' | 'video'>('image');
  const [destination, setDestination] = useState<'feed' | 'story'>('feed');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBusinessUser, setIsBusinessUser] = useState(false);
  const [isAd, setIsAd] = useState(false);

  // Gambar
  const [rawImagesQueue, setRawImagesQueue] = useState<string[]>([]);
  const [croppedImages, setCroppedImages] = useState<Blob[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // Video
  const [rawVideoFile, setRawVideoFile] = useState<File | null>(null);
  const [rawVideoUrl, setRawVideoUrl] = useState<string | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStart, setVideoStart] = useState(0);
  const [coverTime, setCoverTime] = useState(0);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverUrlPreview] = useState<string | null>(null);
  const [videoThumbnails, setVideoThumbnails] = useState<string[]>([]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Musik
  const [searchMusic, setSearchMusic] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isMusicSheetOpen, setIsMusicSheetOpen] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Mention / Hashtag
  const [showPopup, setShowPopup] = useState<'none' | 'mention' | 'hashtag'>('none');
  const [searchQuery, setSearchQuery] = useState("");
  const [popupResults, setPopupResults] = useState<any[]>([]);

  // Crop
  const [step, setStep] = useState<'pick' | 'edit' | 'post'>('post');
  const [imageForCrop, setImageForCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null);

  // ==================== EFFECTS ====================
  // Load draft
  useEffect(() => {
    if (!draftId) return;
    (async () => {
      const { data } = await supabase.from('posts').select('*').eq('id', draftId).single();
      if (!data) return;
      setCaption(data.bio || '');
      setIsAd(data.is_ad || false);
      if (data.video_url) {
        setPostType('video');
        setExistingVideoUrl(data.video_url);
        setExistingImageUrl(data.image_url);
        setCoverUrlPreview(data.image_url);
        setRawVideoUrl(data.video_url);
      } else if (data.image_url) {
        setPostType('image');
        setExistingImageUrl(data.image_url);
        setPreviewUrls(data.image_url.split(','));
      } else {
        setPostType('text');
      }
      if (data.audio_src) {
        setSelectedMusic({
          previewUrl: data.audio_src,
          trackName: data.title,
          artistName: data.artist,
        });
      }
      setStep('post');
    })();
  }, [draftId]);

  // Cek bisnis
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('is_business').eq('id', session.user.id).single();
        if (data?.is_business) setIsBusinessUser(true);
      }
    })();
  }, []);

  // Suggestion popup
  useEffect(() => {
    if (showPopup === 'none') return;
    const fetchSuggestions = async () => {
      if (showPopup === 'mention') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const myId = session.user.id;
        const [followersRes, followingRes] = await Promise.all([
          supabase.from('followers').select('follower_id').eq('following_id', myId),
          supabase.from('followers').select('following_id').eq('follower_id', myId),
        ]);
        const ids = new Set([
          ...(followersRes.data || []).map(f => f.follower_id),
          ...(followingRes.data || []).map(f => f.following_id),
        ]);
        if (ids.size > 0) {
          let q = supabase.from('profiles').select('id, username, avatar_url, role').in('id', Array.from(ids)).limit(10);
          if (searchQuery) q = q.ilike('username', `%${searchQuery}%`);
          const { data } = await q;
          setPopupResults(data || []);
        } else setPopupResults([]);
      } else if (showPopup === 'hashtag') {
        let q = searchQuery.toLowerCase().trim();
        if (!q.startsWith('#')) q = '#' + q;
        try {
          const { data } = await supabase.from('hashtags').select('tag').ilike('tag', `${q}%`).limit(10);
          setPopupResults(data || []);
        } catch (err) { console.error(err); }
      }
    };
    const t = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(t);
  }, [searchQuery, showPopup]);

  // Search musik
  useEffect(() => {
    if (!searchMusic.trim()) { setMusicResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchMusic)}&media=music&limit=20`);
        const data = await res.json();
        setMusicResults(data.results || []);
      } catch (err) { console.error(err); }
      setIsSearching(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchMusic]);

  // ==================== HANDLERS ====================
  const handleClose = () => {
    audioRef.current?.pause();
    router.back();
  };

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCaption(val);
    const pos = e.target.selectionStart || 0;
    const before = val.slice(0, pos);
    const m = before.match(/(?:^|\s)@(\w*)$/);
    const h = before.match(/(?:^|\s)#(\w*)$/);
    if (m) { setShowPopup('mention'); setSearchQuery(m[1]); }
    else if (h) { setShowPopup('hashtag'); setSearchQuery(h[1]); }
    else setShowPopup('none');
  };

  const handleSelectPopupItem = (item: string) => {
    if (!captionInputRef.current) return;
    const cursor = captionInputRef.current.selectionStart || 0;
    const before = caption.slice(0, cursor);
    const after = caption.slice(cursor);
    let newBefore = '';
    if (showPopup === 'mention') newBefore = before.replace(/@\w*$/, `@${item} `);
    else newBefore = before.replace(/#\w*$/, `${item.startsWith('#') ? item : `#${item}`} `);
    setCaption(newBefore + after);
    setShowPopup('none');
    captionInputRef.current.focus();
  };

  // ==================== FILE HANDLERS ====================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (croppedImages.length + files.length > 3) return showNotif("Maksimal 3 foto!", "warning");
    Promise.all(files.map(f => new Promise<string>(res => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsDataURL(f);
    }))).then(results => {
      setRawImagesQueue(results);
      setImageForCrop(results[0]);
      setStep('edit');
      setExistingImageUrl(null);
    });
  };

  const onCropComplete = useCallback((_: any, pixels: any) => setCroppedAreaPixels(pixels), []);
  const handleSaveCrop = async () => {
    if (!imageForCrop || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedImg(imageForCrop, croppedAreaPixels);
      setCroppedImages(prev => [...prev, blob]);
      setPreviewUrls(prev => [...prev, URL.createObjectURL(blob)]);
      const rest = rawImagesQueue.slice(1);
      if (rest.length > 0) {
        setRawImagesQueue(rest);
        setImageForCrop(rest[0]);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
      } else {
        setRawImagesQueue([]);
        setImageForCrop(null);
        setStep('post');
      }
    } catch (e) { console.error(e); }
  };

  const handleCancelCrop = () => {
    const rest = rawImagesQueue.slice(1);
    if (rest.length > 0) { setRawImagesQueue(rest); setImageForCrop(rest[0]); }
    else { setRawImagesQueue([]); setImageForCrop(null); setStep('post'); }
  };

  const handleRemovePreview = (idx: number) => {
    setCroppedImages(prev => prev.filter((_, i) => i !== idx));
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const generateVideoThumbnails = async (url: string, dur: number) => {
    const video = document.createElement('video');
    video.src = url; video.muted = true; video.playsInline = true;
    await new Promise(r => { video.onloadeddata = r; });
    const canvas = document.createElement('canvas');
    canvas.width = 60; canvas.height = 80;
    const ctx = canvas.getContext('2d')!;
    const thumbs: string[] = [];
    for (let i = 0; i < 8; i++) {
      video.currentTime = (dur / 8) * i;
      await new Promise(r => { video.onseeked = r; });
      ctx.drawImage(video, 0, 0, 60, 80);
      thumbs.push(canvas.toDataURL('image/jpeg', 0.6));
    }
    setVideoThumbnails(thumbs);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return showNotif("Video terlalu besar (max 50MB)", "warning");
    setRawVideoFile(file);
    setRawVideoUrl(URL.createObjectURL(file));
    setVideoThumbnails([]);
    setExistingVideoUrl(null);
    setExistingImageUrl(null);
    setStep('edit');
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setVideoDuration(dur);
      setVideoStart(0);
      setCoverTime(0);
      if (rawVideoUrl && !existingVideoUrl) generateVideoThumbnails(rawVideoUrl, dur);
    }
  };

  const togglePlayVideo = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) { videoRef.current.pause(); setIsVideoPlaying(false); }
    else { videoRef.current.play(); setIsVideoPlaying(true); }
  };

  const captureFrameAndSave = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    video.pause(); setIsVideoPlaying(false);
    const ratio = 2 / 3;
    const vw = video.videoWidth, vh = video.videoHeight;
    let cw: number, ch: number, sx: number, sy: number;
    if (vw / vh > ratio) { ch = vh; cw = ch * ratio; sx = (vw - cw) / 2; sy = 0; }
    else { cw = vw; ch = cw / ratio; sx = 0; sy = (vh - ch) / 2; }
    canvas.width = cw; canvas.height = ch;
    canvas.getContext('2d')?.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
    canvas.toBlob(blob => {
      if (blob) {
        setCoverBlob(blob);
        setCoverUrlPreview(URL.createObjectURL(blob));
        setStep('post');
      }
    }, 'image/jpeg', 0.9);
  };

  const handleRemoveVideo = () => {
    setRawVideoFile(null); setRawVideoUrl(null); setCoverBlob(null);
    setCoverUrlPreview(null); setVideoThumbnails([]);
    setExistingVideoUrl(null); setExistingImageUrl(null);
    setStep('post');
  };

  const togglePlayPreview = (url: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (playingUrl === url) { audioRef.current?.pause(); setPlayingUrl(null); }
    else {
      audioRef.current?.pause();
      const a = new Audio(url); a.play(); setPlayingUrl(url);
      a.onended = () => setPlayingUrl(null);
      audioRef.current = a;
    }
  };

  // ==================== UPLOAD & SUBMIT ====================
  const updateGlobalProgress = (progress: number) => {
    window.dispatchEvent(new CustomEvent('postUploadProgress', { detail: progress }));
    localStorage.setItem('uploadProgress', String(progress));
  };

  const uploadToCloudinary = (file: File | Blob, resourceType: 'image' | 'video' = 'image') => {
    return new Promise<any>((resolve, reject) => {
      const fd = new FormData();
      const name = file instanceof File ? file.name : `upload_${Date.now()}.${resourceType === 'image' ? 'jpg' : 'mp4'}`;
      fd.append("file", file, name);
      fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          updateGlobalProgress(Math.round(pct / 2));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
        else reject(JSON.parse(xhr.responseText));
      };
      xhr.onerror = () => reject("Network error");
      xhr.send(fd);
    });
  };

  const submitPostAction = async (isDraft: boolean = false) => {
    if (postType === 'image' && croppedImages.length === 0 && !existingImageUrl && !caption.trim())
      return showNotif(t('alert_empty_post') || 'Postingan tidak boleh kosong', "warning");
    if (postType === 'video' && !rawVideoFile && !existingVideoUrl)
      return showNotif("Pilih video terlebih dahulu!", "warning");
    if (destination === "story" && postType === 'image' && (croppedImages.length > 1 || (existingImageUrl && existingImageUrl.split(',').length > 1)))
      return showNotif("Story hanya bisa upload 1 foto!", "warning");

    const wordCount = countWords(caption);
    const maxWords = postType === 'text' ? 150 : 100;
    if (wordCount > maxWords) {
      setIsSubmitting(false);
      return showNotif(`Caption maksimal ${maxWords} kata!`, "warning");
    }

    setIsSubmitting(true);
    updateGlobalProgress(0);
    localStorage.setItem('isUploading', 'true');
    window.dispatchEvent(new CustomEvent('postUploadStart'));

    if (!isDraft) router.push('/');

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.dispatchEvent(new CustomEvent('postUploadError')); return; }
        const myUserId = session.user.id;

        // Hashtags
        const tags = [...new Set((caption.match(/#[\w_]+/g) || []).map(t => t.toLowerCase()))];
        if (tags.length > 0) {
          for (const tg of tags) await supabase.from('hashtags').upsert({ tag: tg });
        }

        let finalImageUrl: string | null = existingImageUrl;
        let finalVideoUrl: string | null = existingVideoUrl;

        if (postType === 'image' && croppedImages.length > 0) {
          const results = await Promise.all(croppedImages.map(b => uploadToCloudinary(b, 'image')));
          if (results.some(r => r.moderation?.[0]?.status === 'rejected')) {
            window.dispatchEvent(new CustomEvent('postUploadError'));
            localStorage.removeItem('isUploading');
            showNotif("Postingan ditolak! Konten sensitif.", "error");
            return;
          }
          finalImageUrl = results.map(r => r.secure_url).join(',');
          updateGlobalProgress(50);
        } else if (postType === 'video' && rawVideoFile && coverBlob) {
          const coverRes = await uploadToCloudinary(coverBlob, 'image');
          if (coverRes.moderation?.[0]?.status === 'rejected') {
            window.dispatchEvent(new CustomEvent('postUploadError'));
            localStorage.removeItem('isUploading');
            showNotif("Video ditolak! Sampul sensitif.", "error");
            return;
          }
          finalImageUrl = coverRes.secure_url;
          const vidRes = await uploadToCloudinary(rawVideoFile, 'video');
          const end = Math.min(videoDuration, videoStart + 15);
          finalVideoUrl = vidRes.secure_url.replace('/upload/', `/upload/c_fill,ar_2:3/so_${videoStart.toFixed(1)},eo_${end.toFixed(1)}/`);
          updateGlobalProgress(50);
        }

        updateGlobalProgress(70);
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
            visibility,
            is_ad: isBusinessUser ? isAd : false,
          });
        } else {
          const { data: prof } = await supabase.from("profiles").select("username").eq("id", myUserId).single();
          const payload = {
            creator_id: myUserId,
            name: prof?.username || "User",
            bio: caption.trim(),
            category: "Karya",
            image_url: finalImageUrl,
            video_url: finalVideoUrl,
            audio_src: selectedMusic?.previewUrl,
            title: selectedMusic?.trackName,
            artist: selectedMusic?.artistName,
            status: isDraft ? "draft" : "approved",
            is_ad: isBusinessUser ? isAd : false,
          };
          if (draftId) {
            await supabase.from("posts").update(payload).eq('id', draftId);
            newPostId = draftId;
          } else {
            const { data: newPost } = await supabase.from("posts").insert(payload).select('id').single();
            if (newPost) newPostId = newPost.id;
          }
        }

        updateGlobalProgress(85);

        if (!isDraft && (newPostId || destination === "story")) {
          const mentions = [...new Set((caption.match(/@(\w+)/g) || []).map(m => m.substring(1)))];
          if (mentions.length > 0) {
            const { data: tagged } = await supabase.from('profiles').select('id, username').in('username', mentions);
            if (tagged) {
              const { data: myProf } = await supabase.from("profiles").select("username").eq("id", myUserId).single();
              const notifs = tagged.filter(u => u.id !== myUserId).map(u => ({
                user_id: u.id,
                actor_id: myUserId,
                post_id: newPostId ? parseInt(newPostId) : null,
                type: "mention",
                message: `${myProf?.username} menyebut Anda dalam ${destination === "story" ? "cerita" : "postingan"} barunya.`,
              }));
              if (notifs.length) await supabase.from("notifications").insert(notifs);
            }
          }
        }

        updateGlobalProgress(100);
        window.dispatchEvent(new CustomEvent('postUploadSuccess'));
        localStorage.removeItem('isUploading');
        localStorage.removeItem('uploadProgress');
        showNotif(isDraft ? "Draft tersimpan" : "Postingan berhasil!", "success");
        audioRef.current?.pause();

        if (isDraft) router.back();
      } catch (err: any) {
        console.error(err);
        window.dispatchEvent(new CustomEvent('postUploadError'));
        localStorage.removeItem('isUploading');
        localStorage.removeItem('uploadProgress');
        showNotif("Gagal upload", "error");
      }
    })();
  };

  // ==================== RENDER EDITOR SCREEN ====================
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
          <button onClick={postType === 'image' ? handleSaveCrop : captureFrameAndSave} style={{ background: '#1f3cff', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '20px', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>Selesai</button>
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
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={e => setZoom(Number(e.target.value))} style={{ flex: 1, accentColor: '#1f3cff' }} />
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
                  <input type="range" className="custom-range-timeline blue-slider" min={0} max={Math.max(0, videoDuration - 15)} step={0.1} value={videoStart} onChange={e => { const val = Number(e.target.value); setVideoStart(val); if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.play(); setIsVideoPlaying(true); } if (coverTime < val || coverTime > val + 15) setCoverTime(val); }} />
                </div>
              </div>
              <div className="editor-control-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-icons" style={{ fontSize: '16px', color: '#f59e0b' }}>image</span> Pilih Sampul Depan</span>
                  <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>Tampil di: {coverTime.toFixed(1)}s</span>
                </div>
                <div className="filmstrip-box" style={{ height: '30px' }}>
                  <input type="range" className="custom-range-timeline orange-slider" min={videoStart} max={Math.min(videoDuration, videoStart + 15)} step={0.1} value={coverTime} onChange={e => { const val = Number(e.target.value); setCoverTime(val); if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.pause(); setIsVideoPlaying(false); } }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==================== RENDER UTAMA ====================
  return (
    <div className="create-page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '80px', paddingTop: 'env(safe-area-inset-top, 20px)' }}>
      {step === 'edit' && renderEditorScreen()}

      <MusicSheet
        isOpen={isMusicSheetOpen}
        onClose={() => { setIsMusicSheetOpen(false); audioRef.current?.pause(); setPlayingUrl(null); }}
        searchMusic={searchMusic}
        setSearchMusic={setSearchMusic}
        isSearching={isSearching}
        musicResults={musicResults}
        playingUrl={playingUrl}
        onTogglePreview={togglePlayPreview}
        onSelect={(song) => { setSelectedMusic(song); audioRef.current?.pause(); setPlayingUrl(null); setIsMusicSheetOpen(false); }}
        t={t}
      />

      {step === 'post' && (
        <>
          <CreateHeader draftId={draftId} onClose={handleClose} />

          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <div className="post-form">
              <DestinationSelector destination={destination} setDestination={setDestination} visibility={visibility} setVisibility={setVisibility} t={t} />
              <PostTypeSelector postType={postType} setPostType={setPostType} onReset={() => { setCroppedImages([]); setPreviewUrls([]); handleRemoveVideo(); setExistingImageUrl(null); setExistingVideoUrl(null); }} />

              {postType === 'image' && (
                <ImageUploader
                  previewUrls={previewUrls}
                  existingImageUrl={existingImageUrl}
                  onFileSelect={handleFileChange}
                  onRemovePreview={handleRemovePreview}
                  destination={destination}
                />
              )}

              {postType === 'video' && (
                <VideoUploader
                  coverPreviewUrl={coverPreviewUrl}
                  existingVideoUrl={existingVideoUrl}
                  onVideoSelect={handleVideoSelect}
                  onRemoveVideo={handleRemoveVideo}
                />
              )}

              <CaptionInput
                caption={caption}
                onChange={handleCaptionChange}
                onKeyDown={(e) => { if (showPopup !== 'none' && e.key === "Enter") { e.preventDefault(); if (popupResults.length > 0) { handleSelectPopupItem(showPopup === 'mention' ? popupResults[0].username : popupResults[0].tag); } } }}
                postType={postType}
                wordCount={countWords(caption)}
                maxWords={postType === 'text' ? 150 : 100}
                showPopup={showPopup}
                popupResults={popupResults}
                onSelectPopupItem={handleSelectPopupItem}
              />

              <MusicPicker
                selectedMusic={selectedMusic}
                onOpenSheet={() => setIsMusicSheetOpen(true)}
                onRemove={() => { setSelectedMusic(null); if (playingUrl === selectedMusic?.previewUrl) audioRef.current?.pause(); }}
              />

              {isBusinessUser && <AdToggle isAd={isAd} setIsAd={setIsAd} />}

              <SubmitButtons
                isSubmitting={isSubmitting}
                destination={destination}
                draftId={draftId}
                onSubmit={submitPostAction}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}