/* IsshoHub — Stripe Webhook Handler */

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await request.text();
  const sig  = request.headers.get('stripe-signature');

  /* Verify webhook signature */
  const valid = await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    console.error('Stripe webhook: invalid signature');
    return new Response('Invalid signature', { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  /* Only handle completed checkouts */
  if (event.type !== 'checkout.session.completed') {
    return new Response('OK', { status: 200 });
  }

  const session   = event.data.object;
  const user_id   = session.metadata?.user_id;
  const sessionId = session.id;

  if (!user_id) {
    console.error('Stripe webhook: missing user_id in metadata');
    return new Response('Missing user_id', { status: 400 });
  }

  /* expires_at = now + 3 months */
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 3);

  /* Insert into Supabase purchases table */
  const res = await fetch(env.SUPABASE_URL + '/rest/v1/purchases', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      user_id:           user_id,
      product:           'driving-guide',
      amount:            880,
      currency:          'jpy',
      stripe_session_id: sessionId,
      expires_at:        expiresAt.toISOString(),
      status:            'active',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    /* Duplicate session_id (idempotency) — not an error */
    if (err.includes('duplicate') || err.includes('unique')) {
      return new Response('OK (duplicate)', { status: 200 });
    }
    console.error('Supabase insert error:', err);
    return new Response('DB error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}

/* ── HMAC-SHA256 webhook verification (Web Crypto API) ── */
async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader || !secret) return false;

  const parts  = sigHeader.split(',');
  const tPart  = parts.find(p => p.startsWith('t='));
  const v1Part = parts.find(p => p.startsWith('v1='));
  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const expected  = v1Part.slice(3);
  const signed    = timestamp + '.' + payload;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBytes = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(signed)
  );

  const actual = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return actual === expected;
}
