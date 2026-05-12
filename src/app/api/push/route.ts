import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// 🔥 Cegah Inisialisasi Ganda (Error umum di Next.js) 🔥
if (!admin.apps.length) {
  try {
    // Pastikan lu udah masukin FIREBASE_SERVICE_ACCOUNT di env Vercel
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Gagal inisialisasi Firebase Admin:', error);
  }
}

// Handler untuk metode POST (saat aplikasi nembak fetch POST)
export async function POST(request: Request) {
  try {
    // Ambil data yang dikirim dari aplikasi frontend lu
    const body = await request.json();
    
    // 🔥 SAMAIN PERSIS KAYAK REQUEST DARI FRONTEND 🔥
    const { targetToken, type, title, message, callerId, callerName, roomId } = body;

    // Kalau token penerimanya kosong, tolak mentah-mentah
    if (!targetToken) {
      return NextResponse.json({ error: 'Token tujuan (FCM) tidak ditemukan!' }, { status: 400 });
    }

    // 📦 Bungkus "Paket" Notifikasinya
    const messagePayload = {
      token: targetToken, // Pake targetToken dari frontend
      notification: {
        title: title || 'HypeTalk',
        body: message || 'Ada notifikasi baru buat lu, Bree!', // Pake message, bukan body
      },
      // 🔥 PENTING: Firebase wajibin semua value di 'data' berbentuk STRING 🔥
      data: {
        type: type ? String(type) : '',
        callerId: callerId ? String(callerId) : '',
        callerName: callerName ? String(callerName) : '',
        roomId: roomId ? String(roomId) : ''
      }, 
    };

    // 🚀 Tembak ke Google Firebase!
    const response = await admin.messaging().send(messagePayload);
    
    console.log('✅ Notif Sukses Dikirim! ID:', response);
    return NextResponse.json({ success: true, messageId: response }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Gagal ngirim push notif:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
