import { NextResponse } from 'next/server'; // Perbaikan huruf kecil 'i'

// Paksa agar route ini selalu dijalankan di server (tidak statis)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    
    // Ambil API Key 
    // Catatan: Karena ini di server (API Route), lebih aman pakai GIPHY_API_KEY saja 
    // (tanpa NEXT_PUBLIC_) jika tidak butuh diakses langsung oleh sisi client.
    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

    if (!apiKey) {
      console.error("API Key Giphy kosong!");
      return NextResponse.json({ data: [] }); 
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
    return NextResponse.json({ data: [] });
  }
}
