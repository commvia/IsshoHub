/* IsshoHub — Save user profile (gender / nationality / age_range)
   POST /api/save-profile
   Body: { gender, nationality, age_range }
   Auto-captures CF-IPCountry from Cloudflare request headers.
*/

export async function onRequestPost(context) {
  const { request, env } = context;

  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://isshohub.com',
  };

  try {
    /* ── Auth ── */
    const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });

    const verifyRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!verifyRes.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    const user = await verifyRes.json();

    /* ── Cloudflare IP country (free, automatic) ── */
    const ipCountry = request.headers.get('CF-IPCountry') || null;

    /* ── Parse body ── */
    const body = await request.json();
    const { gender, nationality, age_range } = body;

    /* ── PATCH profiles row ── */
    const patchRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({
          gender:      gender      || null,
          nationality: nationality || null,
          age_range:   age_range   || null,
          ip_country:  ipCountry,
        }),
      }
    );

    if (!patchRes.ok) {
      const msg = await patchRes.text();
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({ ok: true, ip_country: ipCountry }), { status: 200, headers: cors });

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
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
