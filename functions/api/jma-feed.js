export async function onRequestGet() {
  const upstream = 'https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml';
  try {
    const r = await fetch(upstream, { headers: { 'User-Agent': 'IsshoHub/1.0' } });
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
