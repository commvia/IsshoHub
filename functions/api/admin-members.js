/* IsshoHub — Admin: List Members
   GET /api/admin-members
   Requires: Authorization: Bearer <user_access_token>
   Returns: { members: [...], total: N }
*/

export async function onRequestGet(context) {
  const { request, env } = context;

  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://isshohub.com',
  };

  try {
    /* ── 1. Extract caller token ── */
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }

    /* ── 2. Verify token — get caller's user info ── */
    const verifyRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!verifyRes.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }
    const currentUser = await verifyRes.json();

    /* ── 3. Confirm caller is admin ── */
    /* Check user_metadata first (fast, no extra DB call) */
    const metaRole = currentUser.user_metadata?.role;

    if (metaRole !== 'admin') {
      /* Fallback: check profiles table */
      const profileRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${currentUser.id}&select=role`,
        {
          headers: {
            'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      const profileData = await profileRes.json();
      if (profileData?.[0]?.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: cors });
      }
    }

    /* ── 4. Fetch all auth users (max 1000) ── */
    const usersRes = await fetch(
      `${env.SUPABASE_URL}/auth/v1/admin/users?per_page=1000&page=1`,
      {
        headers: {
          'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const usersData = await usersRes.json();
    const authUsers = usersData.users || [];

    /* ── 5. Fetch all profiles (name, role, demographics) ── */
    const allProfilesRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/profiles?select=id,name,role,gender,nationality,age_range,ip_country`,
      {
        headers: {
          'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const allProfiles = await allProfilesRes.json();
    const profileMap = Object.fromEntries(
      (Array.isArray(allProfiles) ? allProfiles : []).map(p => [p.id, p])
    );

    /* ── 6. Fetch all purchases ── */
    const purchasesRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/purchases?select=user_id,product,status,expires_at&order=expires_at.desc`,
      {
        headers: {
          'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const purchases = await purchasesRes.json();
    const purchaseMap = {};
    (Array.isArray(purchases) ? purchases : []).forEach(p => {
      if (!purchaseMap[p.user_id]) purchaseMap[p.user_id] = [];
      purchaseMap[p.user_id].push(p);
    });

    /* ── 7. Combine into member objects ── */
    const members = authUsers
      .filter(u => u.email) /* skip anonymous users */
      .map(u => {
        const profile      = profileMap[u.id] || {};
        const userPurchases = purchaseMap[u.id] || [];
        const drivingGuide = userPurchases.find(p => p.product === 'driving-guide');
        return {
          id:           u.id,
          email:        u.email,
          name:         profile.name || u.user_metadata?.full_name || '',
          role:         profile.role || u.user_metadata?.role || 'user',
          joined:       u.created_at,
          last_sign_in: u.last_sign_in_at,
          confirmed:    !!(u.email_confirmed_at || u.confirmed_at),
          gender:       profile.gender       || null,
          nationality:  profile.nationality  || null,
          age_range:    profile.age_range    || null,
          ip_country:   profile.ip_country   || null,
          driving_guide: drivingGuide
            ? { status: drivingGuide.status, expires_at: drivingGuide.expires_at }
            : null,
        };
      })
      .sort((a, b) => new Date(b.joined) - new Date(a.joined)); /* newest first */

    return new Response(
      JSON.stringify({ members, total: members.length }),
      { status: 200, headers: cors }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error: ' + err.message }),
      { status: 500, headers: cors }
    );
  }
}

/* CORS preflight */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  'https://isshohub.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
