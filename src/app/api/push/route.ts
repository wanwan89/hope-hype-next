import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

// 🛑 HAPUS 'export const dynamic = force-dynamic' KARENA LU PAKE OUTPUT: EXPORT
// Next.js bakal otomatis nanggepin route API ini sebagai dinamis di Vercel

export async function POST(request: Request) {
  try {
    // --- 🛠️ 1. INISIALISASI FIREBASE ---
    if (!admin.apps.length) {
      const fbServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (fbServiceAccount) {
        try {
          const serviceAccount = JSON.parse(fbServiceAccount);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        } catch (e) {
          console.error("🚨 Gagal parse Firebase");
        }
      }
    }

    // --- 🛠️ 2. INISIALISASI SUPABASE ---
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Tambahkan pengaman: Kalau variabel kosong, jangan paksakan error, 
    // biar proses build statis (APK) tetep lanjut
    if (!supabaseUrl || !supabaseKey) {
      console.warn("⚠️ Env vars missing, API Push mungkin tidak jalan di mode build statis");
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- 📦 3. LOGIKA NOTIFIKASI ---
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

    let dynamicTitle = senderName;
    let dynamicBody = message || 'Ada interaksi baru.';

    if ((type === 'like' || type === 'comment') && postId) {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('type', type)
        .eq('is_read', false);

      if (count && count > 0) {
        dynamicTitle = `${senderName} dan ${count} lainnya`;
      }
    }

    if (type === 'like') dynamicBody = `menyukai postingan Anda.`;
    else if (type === 'comment') dynamicBody = `mengomentari: "${message}"`;
    else if (type === 'follow') dynamicBody = `mulai mengikuti Anda.`;
    else if (type === 'call') dynamicBody = `Memanggil Anda di HypeTalk...`;

    // --- 🚀 4. PAYLOAD FCM ---
    const messagePayload: any = {
      token: targetToken,
      notification: { title: dynamicTitle, body: dynamicBody, image: senderPhoto },
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel',
          priority: 'high',
          importance: 'high',
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
