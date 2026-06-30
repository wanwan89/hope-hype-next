import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  
  const apiKey = process.env.GIPHY_API_KEY;
  const endpoint = q ? 'search' : 'trending';
  const url = `https://api.giphy.com/v1/stickers/${endpoint}?api_key=${apiKey}&limit=20&rating=g${q ? `&q=${q}` : ''}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat stiker' }, { status: 500 });
  }
}
