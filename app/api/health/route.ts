import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ 
      status: 'error', 
      message: 'Supabase environment variables are missing on the server.' 
    }, { status: 500 });
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${url}/rest/v1/`, {
      method: 'GET',
      headers: { 'apikey': key },
      signal: controller.signal
    });
    
    clearTimeout(id);
    
    return NextResponse.json({
      status: res.ok ? 'ok' : 'warning',
      statusCode: res.status,
      url: url.substring(0, 20) + '...',
      reachable: true
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      message: err.message,
      reachable: false,
      hint: 'If reachable is false on server, the project might be paused or the URL is invalid.'
    }, { status: 500 });
  }
}
