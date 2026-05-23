/* IsshoHub — Newsletter subscribe
   POST /api/subscribe
   Body: { email }
   Adds contact to Resend Audience (General).
*/

const AUDIENCE_ID = 'cab26107-222b-4679-9f22-162e72524f72';

export async function onRequestPost(context) {
  const { request, env } = context;

  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://isshohub.com',
  };

  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: '請輸入有效的電郵地址' }), { status: 400, headers: cors });
    }

    const res = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
      }),
    });

    if (!res.ok) {
      const msg = await res.text();
      /* 422 = already subscribed — treat as success */
      if (res.status === 422) {
        return new Response(JSON.stringify({ ok: true, already: true }), { status: 200, headers: cors });
      }
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  'https://isshohub.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
