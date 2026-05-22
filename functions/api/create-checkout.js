/* IsshoHub — Stripe Checkout Session 建立 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://isshohub.com',
  };

  try {
    const body = await request.json();
    const { user_id, email, return_url } = body;

    if (!user_id || !email || !return_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, email, return_url' }),
        { status: 400, headers: cors }
      );
    }

    const priceId   = env.STRIPE_PRICE_ID;
    const secretKey = env.STRIPE_SECRET_KEY;
    if (!priceId || !secretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe environment variables not configured' }),
        { status: 500, headers: cors }
      );
    }

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('customer_email', email);
    params.append('metadata[user_id]', user_id);
    params.append('metadata[product]', 'driving-guide');
    params.append('success_url', return_url + (return_url.includes('?') ? '&' : '?') + 'payment=success');
    params.append('cancel_url',  return_url + (return_url.includes('?') ? '&' : '?') + 'payment=cancelled');
    params.append('locale', 'ja');

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization':  'Bearer ' + secretKey,
        'Content-Type':   'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: session.error?.message || 'Stripe API error' }),
        { status: 500, headers: cors }
      );
    }

    return new Response(
      JSON.stringify({ checkout_url: session.url }),
      { headers: cors }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: cors }
    );
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
