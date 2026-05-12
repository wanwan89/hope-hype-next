import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

// 🔥 FIX 1: Paksa route ini menjadi Dynamic agar tidak di-scan statis saat build
export const dynamic = 'force-dynamic';

// 1. Inisialisasi Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('🚨 [INIT ERROR]: Firebase gagal!', error.message);
  }
}

// 2. Inisialisasi Supabase (Service Role)
// 🔥 FIX 2: Tambahkan fallback string agar createClient tidak crash saat build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key-agar-build-aman';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetToken, callerId, type, message, roomId, postId } = body;

    if (!targetToken || !callerId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // 🔍 1. AMBIL DATA PENGIRIM DARI PROFILES
    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', callerId)
      .single();

    const senderName = profile?.username || 'User HypeTalk';
    const senderPhoto = profile?.avatar_url || 'https://hypetalk.is-a.dev/default-avatar.png';

    // 🔍 2. LOGIKA AGREGASI (Mila dan X lainnya...)
    let dynamicTitle = senderName;
    let dynamicBody = message || 'Ada interaksi baru.';

    if ((type === 'like' || type === 'comment') && postId) {
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('type', type)
        .eq('is_read', false);

      if (!countError && count && count > 0) {
        dynamicTitle = `${senderName} dan ${count} lainnya`;
      }
    }

    // 🔥 3. LOGIKA KALIMAT CLEAN (Tanpa Icon/Emoji)
    if (type === 'like') {
      dynamicBody = `menyukai postingan Anda.`;
    } else if (type === 'comment') {
      dynamicBody = `mengomentari: "${message}"`;
    } else if (type === 'follow') {
      dynamicBody = `mulai mengikuti Anda.`;
    } else if (type === 'call') {
      dynamicBody = `Memanggil Anda di HypeTalk...`;
    }

    // 📦 4. PAYLOAD UNTUK SLIDE DOWN (HEADS-UP) & ACTIONS
    const messagePayload: any = {
      token: targetToken,
      notification: {
        title: dynamicTitle,
        body: dynamicBody,
        image: senderPhoto,
      },
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'high_importance_channel',
          priority: 'high' as const,
          importance: 'high' as const,
          sound: 'default',
          largeIcon: senderPhoto,
          color: '#1f3cff',
          tag: type === 'call' ? `call_${callerId}` : `${type}_${postId || 'general'}`,
        },
      },
      data: {
        type: String(type),
        callerId: String(callerId),
        callerName: String(senderName),
        postId: String(postId || ''),
        roomId: String(roomId || ''),
      },
    };

    // 🛠️ 5. TAMBAHKAN TOMBOL AKSI NATIVE (BALAS & ANGKAT)
    if (type === 'call') {
      messagePayload.android.notification.actions = [
        { action: 'accept_call', title: 'Angkat' },
        { action: 'decline_call', title: 'Tolak' }
      ];
    } else if (type === 'comment' || type === 'chat') {
      messagePayload.android.notification.actions = [
        { action: 'reply', title: 'Balas Cepat', type: 'text' }
      ];
    }

    const response = await admin.messaging().send(messagePayload);
    
    return NextResponse.json({ 
      success: true, 
      messageId: response 
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [SERVER ERROR]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
