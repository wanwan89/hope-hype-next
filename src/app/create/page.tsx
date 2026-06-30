'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { getCroppedImg, showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import './Create.css';

import CreateHeader from '@/components/create/CreateHeader';
import DestinationSelector from '@/components/create/DestinationSelector';
import PostTypeSelector from '@/components/create/PostTypeSelector';
import ImageUploader from '@/components/create/ImageUploader';
import VideoUploader from '@/components/create/VideoUploader';
import CaptionInput from '@/components/create/CaptionInput';
import MusicPicker from '@/components/create/MusicPicker';
import AdToggle from '@/components/create/AdToggle';
import SubmitButtons from '@/components/create/SubmitButtons';
import MusicSheet from '@/components/create/MusicSheet';
import MediaEditor from '@/components/create/MediaEditor';

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
  <div
    onClick={() => onChange(!checked)}
    className={`custom-toggle-switch ${checked ? 'is-checked' : ''}`}
  >
    <div className="toggle-dot" />
  </div>
);

function CreatePostContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams?.get('draft_id');

  // Pindahkan pemanggilan env ke DALAM komponen
  const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
  const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

  // --- STATE ---
  const [postType, setPostType] = useState<'image' | 'text' | 'video'>('image');
  const [destination, setDestination] = useState<'feed' | 'story'>('feed');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBusinessUser, setIsBusinessUser] = useState(false);
  const [isAd, setIsAd] = useState(false);

  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [saveToDevice, setSaveToDevice] = useState(false);

  // Image state
  const [rawImagesQueue, setRawImagesQueue] = useState<string[]>([]);
  const [croppedImages, setCroppedImages] = useState<Blob[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // Video state
  const [rawVideoFile, setRawVideoFile] = useState<File | null>(null);
  const [rawVideoUrl, setRawVideoUrl] = useState<string | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStart, setVideoStart] = useState(0);
  const [videoEnd, setVideoEnd] = useState(60);
  const [coverTime, setCoverTime] = useState(0);
  const [videoRotation, setVideoRotation] = useState(0);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverUrlPreview] = useState<string | null>(null);
  const [videoThumbnails, setVideoThumbnails] = useState<string[]>([]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Music
  const [searchMusic, setSearchMusic] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isMusicSheetOpen, setIsMusicSheetOpen] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Mention/Hashtag
  const [showPopup, setShowPopup] = useState<'none' | 'mention' | 'hashtag'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [popupResults, setPopupResults] = useState<any[]>([]);

  // Editor steps
  const [step, setStep] = useState<'pick' | 'edit' | 'post'>('post');
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [imageForCrop, setImageForCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null);
  const MAX_VIDEO_CLIP = 60;

  // --- VALIDASI ENVIRONMENT ---
  useEffect(() => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      showNotif(
        'Konfigurasi Cloudinary belum lengkap. Upload media tidak akan berfungsi. Isi NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dan NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET di .env.local',
        'warning',
        0
      );
    }
  }, [CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET]);

  // Load draft jika ada
  useEffect(() => {
    if (!draftId) return;
    (async () => {
      const { data } = await supabase.from('posts').select('*').eq('id', draftId).single();
      if (!data) return;
      setCaption(data.bio || '');
      setIsAd(data.is_ad || false);
      if (data.comments_disabled !== undefined) setAllowComments(!data.comments_disabled);
      
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
      } else setPostType('text');
      if (data.audio_src) setSelectedMusic({ previewUrl: data.audio_src, trackName: data.title, artistName: data.artist });
      setStep('post');
    })();
  }, [draftId]);

  // Cek role business
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('is_business').eq('id', session.user.id).single();
        if (data?.is_business) setIsBusinessUser(true);
      }
    })();
  }, []);

  // Suggestion mention/hashtag
  useEffect(() => {
    if (showPopup === 'none') return;
    const fetchSuggestions = async () => {
      if (showPopup === 'mention') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const myId = session.user.id;
        const { data: following } = await supabase.from('followers').select('following_id').eq('follower_id', myId);
        const { data: followers } = await supabase.from('followers').select('follower_id').eq('following_id', myId);
        const ids = new Set([...(following?.map(f => f.following_id) || []), ...(followers?.map(f => f.follower_id) || [])]);
        if (ids.size > 0) {
          let q = supabase.from('profiles').select('id, username, avatar_url, role').in('id', Array.from(ids)).limit(10);
          if (searchQuery) q = q.ilike('username', `%${searchQuery}%`);
          const { data } = await q;
          setPopupResults(data || []);
        } else setPopupResults([]);
      } else if (showPopup === 'hashtag') {
        let q = searchQuery.toLowerCase().trim();
        if (!q.startsWith('#')) q = '#' + q;
        const { data } = await supabase.from('hashtags').select('tag').ilike('tag', `${q}%`).limit(10);
        setPopupResults(data || []);
      }
    };
    const t = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(t);
  }, [searchQuery, showPopup]);

  // Music search
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

  // --- HANDLER ---
  const handleClose = () => { audioRef.current?.pause(); router.back(); };
  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCaption(val);
    const pos = e.target.selectionStart || 0;
    const before = val.slice(0, pos);
    const mentionMatch = before.match(/(?:^|\s)@(\w*)$/);
    const hashtagMatch = before.match(/(?:^|\s)#(\w*)$/);
    if (mentionMatch) {
      setShowPopup('mention');
      setSearchQuery(mentionMatch[1]);
    } else if (hashtagMatch) {
      setShowPopup('hashtag');
      setSearchQuery(hashtagMatch[1]);
    } else {
      setShowPopup('none');
    }
  };

  const handleSelectPopupItem = (item: string) => {
    if (!captionInputRef.current) return;
    const cursor = captionInputRef.current.selectionStart || 0;
    const before = caption.slice(0, cursor);
    const after = caption.slice(cursor);
    let newBefore = '';
    if (showPopup === 'mention') {
      newBefore = before.replace(/@\w*$/, `@${item} `);
    } else {
      newBefore = before.replace(/#\w*$/, `${item.startsWith('#') ? item : `#${item}`} `);
    }
    setCaption(newBefore + after);
    setShowPopup('none');
    captionInputRef.current.focus();
  };

  // --- IMAGE CROP ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (croppedImages.length + files.length > 3) return showNotif("Maksimal hanya bisa 3 foto!", "warning");
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
    setIsProcessingEdit(true);
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
    } catch (e) {
      console.error(e);
      showNotif("Gagal memproses gambar. Pastikan area crop valid.", "error");
    } finally {
      setIsProcessingEdit(false);
    }
  };

  const handleCancelCrop = () => {
    const rest = rawImagesQueue.slice(1);
    if (rest.length > 0) {
      setRawImagesQueue(rest);
      setImageForCrop(rest[0]);
    } else {
      setRawImagesQueue([]);
      setImageForCrop(null);
      setStep('post');
    }
  };

  const handleRemovePreview = (idx: number) => {
    setCroppedImages(prev => prev.filter((_, i) => i !== idx));
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  // --- VIDEO ---
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
    if (file.size > 50 * 1024 * 1024) return showNotif("Ukuran video terlalu besar! Maksimal 50MB.", "warning");
    setRawVideoFile(file);
    const objUrl = URL.createObjectURL(file);
    setRawVideoUrl(objUrl);
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
      const maxClip = Math.min(MAX_VIDEO_CLIP, dur);
      setVideoEnd(maxClip);
      setCoverTime(0);
      if (rawVideoUrl && !existingVideoUrl) generateVideoThumbnails(rawVideoUrl, dur);
      if (dur > MAX_VIDEO_CLIP) {
        showNotif(`Video berdurasi ${Math.round(dur)} detik. Anda dapat memotong hingga maksimal ${MAX_VIDEO_CLIP} detik.`, "info");
      }
    }
  };

  const togglePlayVideo = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) { videoRef.current.pause(); setIsVideoPlaying(false); }
    else { videoRef.current.play(); setIsVideoPlaying(true); }
  };

  // CAPTURE FRAME + SAVE COVER
  const captureFrameAndSave = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      showNotif("Editor video belum siap. Silakan tunggu.", "error");
      return;
    }
    setIsProcessingEdit(true);
    video.pause();
    setIsVideoPlaying(false);

    const isRotated = videoRotation === 90 || videoRotation === 270;
    const vw = isRotated ? video.videoHeight : video.videoWidth;
    const vh = isRotated ? video.videoWidth : video.videoHeight;

    if (vw === 0 || vh === 0) {
      showNotif("Video belum termuat. Coba lagi.", "error");
      setIsProcessingEdit(false);
      return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = vw;
    tempCanvas.height = vh;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      tCtx.translate(vw / 2, vh / 2);
      tCtx.rotate((videoRotation * Math.PI) / 180);
      tCtx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);
    }

    const ratio = 2 / 3;
    let cw: number, ch: number, sx: number, sy: number;
    if (vw / vh > ratio) {
      ch = vh;
      cw = ch * ratio;
      sx = (vw - cw) / 2;
      sy = 0;
    } else {
      cw = vw;
      ch = cw / ratio;
      sx = 0;
      sy = (vh - ch) / 2;
    }

    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      showNotif("Gagal memproses sampul.", "error");
      setIsProcessingEdit(false);
      return;
    }
    ctx.drawImage(tempCanvas, sx, sy, cw, ch, 0, 0, cw, ch);

    canvas.toBlob(blob => {
      if (blob) {
        setCoverBlob(blob);
        setCoverUrlPreview(URL.createObjectURL(blob));
        setStep('post');
      } else {
        showNotif("Gagal membuat sampul video.", "error");
      }
      setIsProcessingEdit(false);
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
    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
    } else {
      audioRef.current?.pause();
      const a = new Audio(url);
      a.play();
      setPlayingUrl(url);
      a.onended = () => setPlayingUrl(null);
      audioRef.current = a;
    }
  };

  // --- UPLOAD TO CLOUDINARY ---
  const updateGlobalProgress = (progress: number) => {
    window.dispatchEvent(new CustomEvent('postUploadProgress', { detail: progress }));
    localStorage.setItem('uploadProgress', String(progress));
  };

  const uploadToCloudinary = (file: File | Blob, resourceType: 'image' | 'video' = 'image') => {
    return new Promise<any>((resolve, reject) => {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        reject('Konfigurasi Cloudinary tidak ditemukan. Pastikan file .env.local sudah diisi dengan benar.');
        return;
      }
      const fd = new FormData();
      const name = file instanceof File ? file.name : `upload_${Date.now()}.${resourceType === 'image' ? 'jpg' : 'mp4'}`;
      fd.append("file", file, name);
      fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) updateGlobalProgress(Math.round((e.loaded / e.total) * 50));
      };
      xhr.onload = () => {
        if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
        else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(err.error?.message || 'Gagal upload ke Cloudinary');
          } catch {
            reject('Gagal upload ke Cloudinary');
          }
        }
      };
      xhr.onerror = () => reject("Jaringan bermasalah. Periksa koneksi internet.");
      xhr.send(fd);
    });
  };

  // --- SUBMIT ---
  const submitPostAction = async (isDraft: boolean = false) => {
    if (postType === 'image' && croppedImages.length === 0 && !existingImageUrl && !caption.trim())
      return showNotif(t('alert_empty_post') || 'Postingan tidak boleh kosong', "warning");
    if (postType === 'video' && !rawVideoFile && !existingVideoUrl)
      return showNotif("Pilih video terlebih dahulu!", "warning");
    if (destination === "story" && postType === 'image' && (croppedImages.length > 1 || (existingImageUrl && existingImageUrl.split(',').length > 1)))
      return showNotif("Story hanya bisa upload 1 foto!", "warning");
    if (postType === 'video' && !coverBlob && !existingVideoUrl)
      return showNotif("Sampul video belum dibuat. Silakan atur ulang editor.", "warning");

    const wordCount = countWords(caption);
    const maxWords = postType === 'text' ? 150 : 100;
    if (wordCount > maxWords) {
      return showNotif(`Caption maksimal ${maxWords} kata!`, "warning");
    }

    if (saveToDevice) {
      if (postType === 'image' && croppedImages.length > 0) {
        croppedImages.forEach((blob, idx) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `Hype_Image_${Date.now()}_${idx}.jpg`;
          a.click();
        });
      } else if (postType === 'video' && rawVideoFile) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(rawVideoFile);
        a.download = `Hype_Video_${Date.now()}.mp4`;
        a.click();
      }
    }

    setIsSubmitting(true);
    localStorage.setItem('isUploading', 'true');
    updateGlobalProgress(0);
    window.dispatchEvent(new CustomEvent('postUploadStart'));

    if (!isDraft) router.push('/');
    else router.back();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.dispatchEvent(new CustomEvent('postUploadError'));
        showNotif("Sesi habis, silakan login ulang.", "error");
        return;
      }
      const myUserId = session.user.id;

      const tags = [...new Set((caption.match(/#[\w_]+/g) || []).map(t => t.toLowerCase()))];
      if (tags.length > 0) {
        for (const tg of tags) await supabase.from('hashtags').upsert({ tag: tg });
      }

      let finalImageUrl: string | null = existingImageUrl;
      let finalVideoUrl: string | null = existingVideoUrl;

      if (postType === 'image' && croppedImages.length > 0) {
        const results = await Promise.all(croppedImages.map(b => uploadToCloudinary(b, 'image')));
        if (results.some(r => r.moderation?.[0]?.status === 'rejected')) {
          showNotif("Postingan ditolak! Konten sensitif.", "error");
          window.dispatchEvent(new CustomEvent('postUploadError'));
          localStorage.removeItem('isUploading');
          return;
        }
        finalImageUrl = results.map(r => r.secure_url).join(',');
        updateGlobalProgress(50);
      }
      else if (postType === 'video' && rawVideoFile && coverBlob) {
        const coverRes = await uploadToCloudinary(coverBlob, 'image');
        if (coverRes.moderation?.[0]?.status === 'rejected') {
          showNotif("Video ditolak! Sampul sensitif.", "error");
          window.dispatchEvent(new CustomEvent('postUploadError'));
          localStorage.removeItem('isUploading');
          return;
        }
        finalImageUrl = coverRes.secure_url;

        const clipEnd = videoEnd || Math.min(videoDuration, videoStart + MAX_VIDEO_CLIP);
        const rotParam = videoRotation !== 0 ? `a_${videoRotation},` : '';
        const vidRes = await uploadToCloudinary(rawVideoFile, 'video');
        finalVideoUrl = vidRes.secure_url.replace(
          '/upload/',
          `/upload/${rotParam}c_fill,ar_2:3/so_${videoStart.toFixed(1)},eo_${clipEnd.toFixed(1)}/`
        );
        updateGlobalProgress(50);
      }

      updateGlobalProgress(70);
      let newPostData = null;

      if (destination === "story") {
        const { data } = await supabase.from("stories").insert({
          creator_id: myUserId, image_url: finalImageUrl, video_url: finalVideoUrl,
          content: caption.trim(), audio_src: selectedMusic?.previewUrl,
          title: selectedMusic?.trackName, artist: selectedMusic?.artistName,
          visibility, is_ad: isBusinessUser ? isAd : false,
        }).select('*, profiles(*)').single();
        newPostData = data;
      } else {
        const { data: prof } = await supabase.from("profiles").select("username").eq("id", myUserId).single();
        const payload = {
          creator_id: myUserId, name: prof?.username || "User", bio: caption.trim(),
          category: "Karya", image_url: finalImageUrl, video_url: finalVideoUrl,
          audio_src: selectedMusic?.previewUrl, title: selectedMusic?.trackName,
          artist: selectedMusic?.artistName, status: isDraft ? "draft" : "approved",
          is_ad: isBusinessUser ? isAd : false,
          comments_disabled: !allowComments,
        };

        if (draftId) {
          await supabase.from("posts").update(payload).eq('id', draftId);
          const { data } = await supabase.from("posts").select('*, profiles(*)').eq('id', draftId).single();
          newPostData = data;
        } else {
          const { data } = await supabase.from("posts").insert(payload).select('*, profiles(*)').single();
          newPostData = data;
        }
      }

      updateGlobalProgress(85);

      if (!isDraft && (newPostData?.id || destination === "story")) {
        const mentions = [...new Set((caption.match(/@(\w+)/g) || []).map(m => m.substring(1)))];
        if (mentions.length > 0) {
          const { data: tagged } = await supabase.from('profiles').select('id, username').in('username', mentions);
          if (tagged) {
            const { data: myProf } = await supabase.from("profiles").select("username").eq("id", myUserId).single();
            const notifs = tagged.filter(u => u.id !== myUserId).map(u => ({
              user_id: u.id, actor_id: myUserId, post_id: destination === "feed" ? newPostData.id : null,
              type: "mention", message: `${myProf?.username} menyebut Anda dalam ${destination === "story" ? "cerita" : "postingan"} barunya.`,
            }));
            if (notifs.length) await supabase.from("notifications").insert(notifs);
          }
        }
      }

      updateGlobalProgress(100);
      window.dispatchEvent(new CustomEvent('postUploadSuccess', { detail: newPostData }));
      localStorage.removeItem('isUploading');
      localStorage.removeItem('uploadProgress');
      showNotif(isDraft ? "Draft tersimpan" : "Postingan berhasil!", "success");
      audioRef.current?.pause();
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('postUploadError'));
      localStorage.removeItem('isUploading');
      localStorage.removeItem('uploadProgress');
      const msg = typeof err === 'string' ? err : err?.message || 'Gagal upload';
      showNotif(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== RENDER ====================
  return (
    <div className="create-page-wrapper">
      {step === 'edit' && (
        <MediaEditor 
          postType={postType}
          croppedImagesCount={croppedImages.length}
          rawImagesCount={rawImagesQueue.length}
          isProcessingEdit={isProcessingEdit}
          imageForCrop={imageForCrop}
          crop={crop}
          zoom={zoom}
          setCrop={setCrop}
          setZoom={setZoom}
          onCropComplete={onCropComplete}
          handleSaveCrop={handleSaveCrop}
          handleCancelCrop={handleCancelCrop}
          rawVideoUrl={rawVideoUrl}
          isVideoPlaying={isVideoPlaying}
          videoDuration={videoDuration}
          videoStart={videoStart}
          videoEnd={videoEnd}
          coverTime={coverTime}
          videoRotation={videoRotation}
          videoThumbnails={videoThumbnails}
          MAX_VIDEO_CLIP={MAX_VIDEO_CLIP}
          videoRef={videoRef}
          canvasRef={canvasRef}
          setVideoStart={setVideoStart}
          setVideoEnd={setVideoEnd}
          setCoverTime={setCoverTime}
          setVideoRotation={setVideoRotation}
          handleRemoveVideo={handleRemoveVideo}
          captureFrameAndSave={captureFrameAndSave}
          handleVideoLoadedMetadata={handleVideoLoadedMetadata}
          togglePlayVideo={togglePlayVideo}
          setStep={setStep}
          setIsVideoPlaying={setIsVideoPlaying}
        />
      )}

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
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 20px' }}>
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
                onKeyDown={(e) => {
                  if (showPopup !== 'none' && e.key === "Enter") {
                    e.preventDefault();
                    if (popupResults.length > 0) {
                      handleSelectPopupItem(showPopup === 'mention' ? popupResults[0].username : popupResults[0].tag);
                    }
                  }
                }}
                postType={postType}
                wordCount={countWords(caption)}
                maxWords={postType === 'text' ? 150 : 100}
                showPopup={showPopup}
                popupResults={popupResults}
                onSelectPopupItem={handleSelectPopupItem}
                inputRef={captionInputRef}
              />

              <MusicPicker
                selectedMusic={selectedMusic}
                onOpenSheet={() => setIsMusicSheetOpen(true)}
                onRemove={() => { setSelectedMusic(null); if (playingUrl === selectedMusic?.previewUrl) audioRef.current?.pause(); }}
              />

              {isBusinessUser && <AdToggle isAd={isAd} setIsAd={setIsAd} />}

              {destination === 'feed' && (
                <div className="more-options-box">
                  <div onClick={() => setShowMoreOptions(!showMoreOptions)} className="more-options-trigger">
                    <span className="more-options-title">
                      <span className="material-icons" style={{ fontSize: '18px' }}>settings</span> Opsi Lainnya
                    </span>
                    <span className={`material-icons more-options-icon-chevron ${showMoreOptions ? 'is-expanded' : ''}`}>
                      expand_more
                    </span>
                  </div>
                  {showMoreOptions && (
                    <div className="more-options-content">
                      <div className="more-options-item">
                        <div>
                          <p className="more-options-label">Izinkan Komentar</p>
                          <p className="more-options-subtext">Orang lain bisa mengomentari ini</p>
                        </div>
                        <ToggleSwitch checked={allowComments} onChange={setAllowComments} />
                      </div>
                      <div className="more-options-item">
                        <div>
                          <p className="more-options-label">Simpan ke Perangkat</p>
                          <p className="more-options-subtext">Otomatis simpan media yang diedit</p>
                        </div>
                        <ToggleSwitch checked={saveToDevice} onChange={setSaveToDevice} />
                      </div>
                    </div>
                  )}
                </div>
              )}

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

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}></div>}>
      <CreatePostContent />
    </Suspense>
  );
}
