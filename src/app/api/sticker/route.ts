import { NextResponse } from 'next/server';

// Paksa agar route ini selalu dijalankan di server (tidak statis)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    
    // Ambil API Key dengan cara yang paling aman untuk Next.js
    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

    if (!apiKey) {
      console.error("API Key Giphy kosong!");
      return NextResponse.json({ data: [] }); // Kembalikan array kosong daripada error
    }

    const endpoint = q ? 'search' : 'trending';
    const url = `https://api.giphy.com/v1/stickers/${endpoint}?api_key=${apiKey}&limit=20&rating=g${q ? `&q=${encodeURIComponent(q)}` : ''}`;

    const res = await fetch(url, { next: { revalidate: 0 } });
    
    if (!res.ok) {
      return NextResponse.json({ data: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Sticker API Error:", error);
    // Jika gagal, kembalikan data kosong agar build tidak crash
    return NextResponse.json({ data: [] });
  }
}
