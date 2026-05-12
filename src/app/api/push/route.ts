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
    // Ambil data yang dikirim dari aplikasi lu
    const body = await request.json();
    const { token, title, body: messageBody, data } = body;

    // Kalau token penerimanya kosong, tolak mentah-mentah
    if (!token) {
      return NextResponse.json({ error: 'Token tujuan (FCM) tidak ditemukan' }, { status: 400 });
    }

    // 📦 Bungkus "Paket" Notifikasinya
    const message = {
      token: token,
      notification: {
        title: title || 'HypeTalk',
        body: messageBody || 'Ada notifikasi baru buat lu, Bree!',
      },
      // Data tersembunyi buat ngasih tau HP mau navigasi ke mana
      data: data || {}, 
    };

    // 🚀 Tembak ke Google Firebase!
    const response = await admin.messaging().send(message);
    
    console.log('✅ Notif Sukses Dikirim! ID:', response);
    return NextResponse.json({ success: true, messageId: response }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Gagal ngirim push notif:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
