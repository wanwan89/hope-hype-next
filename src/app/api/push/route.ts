import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

// 🔥 FIX WAJIB 1: Paksa route ini agar tidak di-scan secara statis saat build
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // --- 🛠️ 1. INISIALISASI FIREBASE (DI DALAM FUNGSI) ---
    if (!admin.apps.length) {
      const fbServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (fbServiceAccount) {
        try {
          const serviceAccount = JSON.parse(fbServiceAccount);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        } catch (e) {
          console.error("🚨 Gagal parse Firebase Service Account");
        }
      }
    }

    // --- 🛠️ 2. INISIALISASI SUPABASE (DI DALAM FUNGSI) ---
    // Ini rahasianya biar build APK lu nggak "Failed to collect page data"
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Konfigurasi Server Belum Lengkap' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- 📦 3. LOGIKA NOTIFIKASI (TIDAK BERUBAH) ---
    const body = await request.json();
    const { targetToken, callerId, type, message, roomId, postId } = body;

    if (!targetToken || !callerId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Ambil data profil pengirim
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', callerId)
      .single();

    const senderName = profile?.username || 'User HypeTalk';
    const senderPhoto = profile?.avatar_url || 'https://hypetalk.is-a.dev/default-avatar.png';

    // Logika Agregasi (Mila dan X lainnya)
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

    // Logika Kalimat Clean
    if (type === 'like') dynamicBody = `menyukai postingan Anda.`;
    else if (type === 'comment') dynamicBody = `mengomentari: "${message}"`;
    else if (type === 'follow') dynamicBody = `mulai mengikuti Anda.`;
    else if (type === 'call') dynamicBody = `Memanggil Anda di HypeTalk...`;

    // --- 🚀 4. KIRIM PAYLOAD KE FCM ---
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

    // Tombol Aksi Native
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
    
    return NextResponse.json({ success: true, messageId: response }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [SERVER ERROR]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
