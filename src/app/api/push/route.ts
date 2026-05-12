import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// ============================================================================
// 🔥 1. TAHAP INISIALISASI (Cek Kunci Firebase) 🔥
// ============================================================================
if (!admin.apps.length) {
  try {
    const envVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!envVar) {
      console.error("🚨 TANDA ERROR [INIT]: Variabel FIREBASE_SERVICE_ACCOUNT kosong/tidak ada di Vercel!");
    } else {
      const serviceAccount = JSON.parse(envVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ [INIT]: Firebase Admin berhasil nyala!");
    }
  } catch (error: any) {
    console.error('🚨 TANDA ERROR [INIT]: Gagal baca JSON Service Account. Pastikan format JSON di Vercel valid!', error.message);
  }
}

export async function POST(request: Request) {
  try {
    // ============================================================================
    // 🔥 2. TAHAP TANGKAP DATA DARI APLIKASI 🔥
    // ============================================================================
    let body;
    try {
      body = await request.json();
      console.log("📦 [DATA MASUK]:", body); // Biar lu bisa liat persis apa yang dikirim HP lu
    } catch (err) {
      console.error("🚨 TANDA ERROR [PARSING]: Data yang dikirim dari HP bukan format JSON!");
      return NextResponse.json({ error: 'Format request salah' }, { status: 400 });
    }

    const { targetToken, type, title, message, callerId, callerName, roomId } = body;

    // ============================================================================
    // 🔥 3. TAHAP VALIDASI TOKEN (Mencegah PWA Bikin Error 500) 🔥
    // ============================================================================
    if (!targetToken || typeof targetToken !== 'string' || targetToken === "undefined" || targetToken.length < 10) {
      console.warn("⚠️ TANDA ERROR [VALIDASI]: Token kosong atau invalid! (Biasanya karena ngirim dari PWA)");
      return NextResponse.json({ error: 'Token tujuan (FCM) tidak valid atau kosong!' }, { status: 400 });
    }

    // ============================================================================
    // 🔥 4. TAHAP BUNGKUS PAKET 🔥
    // ============================================================================
    const messagePayload = {
      token: targetToken,
      notification: {
        title: title || 'Hype Talk', // Sesuai nama aplikasi lu
        body: message || 'Ada panggilan masuk buat lu, Bree!', 
      },
      // PENTING: Firebase ngamuk kalau value di 'data' bukan teks/string
      data: {
        type: type ? String(type) : '',
        callerId: callerId ? String(callerId) : '',
        callerName: callerName ? String(callerName) : '',
        roomId: roomId ? String(roomId) : ''
      }, 
    };

    console.log("🚀 [PROSES]: Mencoba menembak notif ke Firebase...");

    // ============================================================================
    // 🔥 5. TAHAP EKSEKUSI (Kirim ke Google) 🔥
    // ============================================================================
    const response = await admin.messaging().send(messagePayload);
    
    console.log('✅ [SUKSES]: Notif terkirim! ID Transaksi:', response);
    return NextResponse.json({ success: true, messageId: response }, { status: 200 });

  } catch (error: any) {
    // ============================================================================
    // 🔥 6. TAHAP INTEROGASI ERROR (Kalau Google Nolak) 🔥
    // ============================================================================
    console.error('❌ [GAGAL TOTAL]: Firebase menolak paketnya!');

    if (error.code) {
      console.error(`🚨 TANDA ERROR [KODE FIREBASE]: ${error.code}`);
      
      // Kasus 1: Token Basi (Udah uninstal/hapus data)
      if (error.code === 'messaging/registration-token-not-registered') {
        console.error("👉 SOLUSI: Token HP Penerima udah BASI/HANGUS. Lu harus buka ulang aplikasinya di HP Penerima biar dapet Token baru.");
        return NextResponse.json({ error: 'Token HP basi/expired', code: 'STALE_TOKEN' }, { status: 410 });
      } 
      // Kasus 2: Format data salah
      else if (error.code === 'messaging/invalid-argument') {
        console.error("👉 SOLUSI: Format token salah atau ada data payload yang bukan String.");
      }
    } else {
      console.error("🚨 TANDA ERROR [SERVER]:", error.message);
    }

    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
