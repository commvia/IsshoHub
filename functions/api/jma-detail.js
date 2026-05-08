export async function onRequestGet(context) {
  const url = new URL(context.request.url).searchParams.get('url') || '';
  if (!url.startsWith('https://www.data.jma.go.jp/')) {
    return new Response('Forbidden', { status: 403 });
  }
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'IsshoHub/1.0' } });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('upstream error', { status: 502 });
  }
}
