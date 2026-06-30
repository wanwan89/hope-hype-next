import { NextResponse } from 'next/server';

// Menandai route ini sebagai dynamic agar tidak di-cache saat build
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  
  // 🔥 FIX: Gunakan NEXT_PUBLIC_ sesuai yang kamu simpan di .env
  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

  // Proteksi jika API Key belum diset
  if (!apiKey) {
    console.error("GIPHY_API_KEY tidak ditemukan di environment variables");
    return NextResponse.json({ error: 'Konfigurasi API tidak ditemukan' }, { status: 500 });
  }

  const endpoint = q ? 'search' : 'trending';
  const url = `https://api.giphy.com/v1/stickers/${endpoint}?api_key=${apiKey}&limit=20&rating=g${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`Giphy API responded with status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching stickers:", error);
    return NextResponse.json({ error: 'Gagal memuat stiker dari penyedia' }, { status: 500 });
  }
}
