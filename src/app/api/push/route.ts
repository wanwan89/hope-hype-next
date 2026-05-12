import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// 1. Inisialisasi Firebase Admin (Biar Server Lu Punya Kunci Brankas)
if (!admin.apps.length) {
  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountStr) {
      const serviceAccount = JSON.parse(serviceAccountStr);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (error) {
    console.error('Gagal inisialisasi Firebase Admin:', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetToken, title, message, type, callerId, roomId, callerName } = body;

    // Kalau token HP tujuan nggak ada, tolak!
    if (!targetToken) {
      return NextResponse.json({ error: 'Token tujuan tidak ditemukan' }, { status: 400 });
    }

    // 2. Rakit Isi "Surat" (Notifikasi)
    const payload: any = {
      token: targetToken,
      notification: {
        title: title || 'HypeTalk Globe',
        body: message || 'Ada pesan baru!',
      },
      data: {
        type: type || 'room',
        callerId: callerId || '',
        roomId: roomId || '',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: type === 'incoming_call' ? 'calls_channel' : 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        }
      }
    };

    // 3. Tambahin Tombol Khusus Kalau Ini Telpon Masuk
    if (type === 'incoming_call') {
      payload.android.notification.actions = [
        { action: 'accept', title: 'Angkat 📞' },
        { action: 'reject', title: 'Tolak ❌' }
      ];
    }

    // 4. Kirim via Firebase
    const response = await admin.messaging().send(payload);
    
    return NextResponse.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Error kirim notif:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
