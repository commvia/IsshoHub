# 天書付費牆 實現計劃

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推薦）或 superpowers:executing-plans 逐任務實現此計劃。步驟使用複選框（`- [ ]`）語法來跟蹤進度。

**目標：** 為日本駕照天書第 3–14 章加入 ¥880 一次性付費牆，購買後 3 個月內可閱讀全文。

**架構：** 前端 paywall-guard.js 查詢 Supabase `purchases` 表判斷存取權；Cloudflare Pages Function `create-checkout` 建立 Stripe Checkout 頁面；Stripe webhook 寫入購買記錄至 Supabase。

**技術棧：** Cloudflare Pages Functions（ES modules）、Stripe API（fetch 直呼，無 SDK）、Supabase REST API（webhook 用 service role key）、Vanilla JS

---

## 環境變數一覽

Cloudflare Pages Dashboard → isshohub → Settings → Environment variables 需設：

| 變數名 | 值來源 |
|--------|--------|
| `STRIPE_SECRET_KEY` | `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` |
| `STRIPE_PRICE_ID` | Task 2 完成後取得 |
| `STRIPE_WEBHOOK_SECRET` | Task 12 完成後取得 |
| `SUPABASE_URL` | `https://eupqbbfbucdkhtpsuvry.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |

---

## 檔案清單

| 動作 | 路徑 | 職責 |
|------|------|------|
| 新增 | `functions/api/create-checkout.js` | 建立 Stripe Checkout Session |
| 新增 | `functions/api/stripe-webhook.js` | 接收 Stripe 付款成功事件、寫 Supabase |
| 新增 | `assets/css/paywall.css` | 模糊遮罩、解鎖 Banner、付費 Modal 樣式 |
| 新增 | `assets/js/paywall-guard.js` | 章節頁付費牆邏輯 + UI |
| 修改 | `assets/js/supabase-client.js` | 新增 `hasDrivingGuideAccess()` |
| 修改 | `life/driving-guide/index.html` | 加入購買狀態解鎖連結邏輯 |
| 修改 | `life/driving-guide/en/index.html` | 同上（英文版目錄） |
| 修改 | `life/driving-guide/chapter-{3–14}/index.html`（12 個） | 引入 paywall-guard.js |
| 修改 | `life/driving-guide/en/chapter-{3–14}/index.html`（12 個） | 引入 paywall-guard.js |

---

## 任務 1：Supabase — 建立 purchases 表（手動操作）

**前置條件：** 登入 Supabase → 打開 SQL Editor

- [ ] **步驟 1：執行以下 SQL**

```sql
CREATE TABLE purchases (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) NOT NULL,
  product          text NOT NULL DEFAULT 'driving-guide',
  amount           integer NOT NULL DEFAULT 880,
  currency         text NOT NULL DEFAULT 'jpy',
  stripe_session_id text UNIQUE,
  purchased_at     timestamptz DEFAULT now(),
  expires_at       timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'active'
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = user_id);
```

- [ ] **步驟 2：確認表建立成功**

在 Supabase Table Editor 看到 `purchases` 表，有以上欄位，RLS 已啟用。

- [ ] **步驟 3：取得 Service Role Key**

Supabase → Settings → API → "Service role" key（以 `eyJ...` 開頭），備用於後續環境變數設定。

- [ ] **步驟 4：Commit**

```bash
git add docs/superpowers/plans/2026-05-22-driving-guide-paywall.md
git commit -m "docs: add paywall implementation plan"
```

---

## 任務 2：Stripe — 建立商品與價格（手動操作）

**前置條件：** 登入 Stripe Dashboard

- [ ] **步驟 1：建立商品**

Stripe → Product catalog → + Add product：
- Name: `日本駕照天書`
- Description: `第 3–14 章全文閱讀（3 個月）`

- [ ] **步驟 2：建立一次性價格**

在該商品頁面 → Pricing → Add a price：
- Type: **One time**
- Currency: **JPY**
- Amount: **880**

- [ ] **步驟 3：複製 Price ID**

格式為 `price_1ABC...`，記下來。

- [ ] **步驟 4：設定 Cloudflare 環境變數**

Cloudflare Dashboard → Pages → isshohub → Settings → Environment variables → Add：

| Key | Value |
|-----|-------|
| `STRIPE_SECRET_KEY` | `sk_live_51TZnShAT8yUb1gBychE04...` |
| `STRIPE_PRICE_ID` | `price_1ABC...`（剛複製的） |
| `SUPABASE_URL` | `https://eupqbbfbucdkhtpsuvry.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...`（Task 1 取得的） |

（`STRIPE_WEBHOOK_SECRET` 留待 Task 12 再加）

---

## 任務 3：supabase-client.js — 新增 hasDrivingGuideAccess()

**檔案：** `assets/js/supabase-client.js`（修改）

- [ ] **步驟 1：在 `deleteHotSearch` 函數後、`/* ── Exports ── */` 之前插入以下代碼**

```javascript
  /* ── Driving Guide Access ── */
  async function hasDrivingGuideAccess() {
    const user = await getUser();
    if (!user) return { access: false, reason: 'not_logged_in' };
    if (await isAdmin()) return { access: true, reason: 'admin' };

    const { data, error } = await getClient()
      .from('purchases')
      .select('expires_at')
      .eq('user_id', user.id)
      .eq('product', 'driving-guide')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) return { access: false, reason: 'error' };
    if (data) return { access: true, reason: 'purchased', expires_at: data.expires_at };
    
    /* Check if expired */
    const { data: expired } = await getClient()
      .from('purchases')
      .select('expires_at')
      .eq('user_id', user.id)
      .eq('product', 'driving-guide')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (expired) return { access: false, reason: 'expired', expires_at: expired.expires_at };
    return { access: false, reason: 'not_purchased' };
  }
```

- [ ] **步驟 2：在 `global.IsshoAPI` 的 exports 中加入 `hasDrivingGuideAccess`**

找到：
```javascript
    deleteHotSearch,
  };
```

改為：
```javascript
    deleteHotSearch,
    hasDrivingGuideAccess,
  };
```

- [ ] **步驟 3：Commit**

```bash
git add assets/js/supabase-client.js
git commit -m "feat: add hasDrivingGuideAccess to IsshoAPI"
```

---

## 任務 4：create-checkout.js — Cloudflare Pages Function

**檔案：** `functions/api/create-checkout.js`（新增）

- [ ] **步驟 1：建立檔案**

```javascript
/* IsshoHub — Stripe Checkout Session 建立 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://isshohub.com',
  };

  /* Preflight */
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    const body = await request.json();
    const { user_id, email, return_url } = body;

    if (!user_id || !email || !return_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, email, return_url' }),
        { status: 400, headers: cors }
      );
    }

    const priceId = env.STRIPE_PRICE_ID;
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
    params.append('cancel_url', return_url + (return_url.includes('?') ? '&' : '?') + 'payment=cancelled');
    params.append('locale', 'ja');

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + secretKey,
        'Content-Type': 'application/x-www-form-urlencoded',
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
      'Access-Control-Allow-Origin': 'https://isshohub.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

- [ ] **步驟 2：Commit**

```bash
git add functions/api/create-checkout.js
git commit -m "feat: add Stripe create-checkout Cloudflare function"
```

---

## 任務 5：stripe-webhook.js — Cloudflare Pages Function

**檔案：** `functions/api/stripe-webhook.js`（新增）

- [ ] **步驟 1：建立檔案**

```javascript
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
      user_id:          user_id,
      product:          'driving-guide',
      amount:           880,
      currency:         'jpy',
      stripe_session_id: sessionId,
      expires_at:       expiresAt.toISOString(),
      status:           'active',
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

  const parts     = sigHeader.split(',');
  const tPart     = parts.find(p => p.startsWith('t='));
  const v1Part    = parts.find(p => p.startsWith('v1='));
  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const expected  = v1Part.slice(3);

  const signed = timestamp + '.' + payload;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signed)
  );

  const actual = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return actual === expected;
}
```

- [ ] **步驟 2：Commit**

```bash
git add functions/api/stripe-webhook.js
git commit -m "feat: add Stripe webhook handler with Web Crypto verification"
```

---

## 任務 6：paywall.css — 付費牆樣式

**檔案：** `assets/css/paywall.css`（新增）

- [ ] **步驟 1：建立檔案**

```css
/* IsshoHub — Paywall styles */

/* ── Content fade ── */
.paywall-content-wrap {
  position: relative;
}
.paywall-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 160px;
  background: linear-gradient(to bottom, transparent, #f6f3ec);
  pointer-events: none;
}

/* ── Unlock banner ── */
.paywall-banner {
  margin: 0 0 40px;
  background: #0d2444;
  border-radius: 16px;
  padding: 28px 24px 24px;
  text-align: center;
  color: #f6f3ec;
}
.paywall-banner__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #d9b683;
  margin-bottom: 8px;
}
.paywall-banner__title {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 6px;
  line-height: 1.3;
}
.paywall-banner__sub {
  font-size: 13px;
  color: rgba(246,243,236,.65);
  margin-bottom: 18px;
}
.paywall-banner__expired {
  font-size: 13px;
  color: #e88c8c;
  margin-bottom: 12px;
}
.paywall-banner__btn {
  display: inline-block;
  background: #d9b683;
  color: #0d2444;
  font-size: 15px;
  font-weight: 700;
  padding: 13px 28px;
  border-radius: 50px;
  border: none;
  cursor: pointer;
  transition: background .15s, transform .1s;
  text-decoration: none;
}
.paywall-banner__btn:hover {
  background: #e8c98a;
  transform: translateY(-1px);
}
.paywall-banner__login {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  color: rgba(246,243,236,.5);
}
.paywall-banner__login a {
  color: #d9b683;
  text-decoration: underline;
  cursor: pointer;
}

/* ── Payment modal ── */
.paywall-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(10,20,40,.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(4px);
}
.paywall-modal {
  background: #fff;
  border-radius: 20px;
  padding: 36px 32px 28px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 12px 60px rgba(0,0,0,.25);
  text-align: center;
  position: relative;
}
.paywall-modal__close {
  position: absolute;
  top: 14px;
  right: 16px;
  background: none;
  border: none;
  font-size: 22px;
  color: #aaa;
  cursor: pointer;
  line-height: 1;
}
.paywall-modal__close:hover { color: #555; }
.paywall-modal__icon {
  font-size: 36px;
  margin-bottom: 10px;
}
.paywall-modal__title {
  font-size: 22px;
  font-weight: 800;
  color: #0d2444;
  margin: 0 0 6px;
}
.paywall-modal__desc {
  font-size: 13px;
  color: #777;
  margin-bottom: 20px;
  line-height: 1.6;
}
.paywall-modal__features {
  list-style: none;
  padding: 0;
  margin: 0 0 22px;
  text-align: left;
}
.paywall-modal__features li {
  font-size: 14px;
  color: #333;
  padding: 5px 0 5px 24px;
  position: relative;
}
.paywall-modal__features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #2e7d32;
  font-weight: 700;
}
.paywall-modal__price {
  font-size: 28px;
  font-weight: 900;
  color: #0d2444;
  margin-bottom: 4px;
}
.paywall-modal__price-sub {
  font-size: 12px;
  color: #999;
  margin-bottom: 18px;
}
.paywall-modal__buy-btn {
  display: block;
  width: 100%;
  background: #0d2444;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  padding: 15px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: background .15s;
  margin-bottom: 12px;
}
.paywall-modal__buy-btn:hover { background: #1a3a6e; }
.paywall-modal__buy-btn:disabled {
  background: #aaa;
  cursor: wait;
}
.paywall-modal__secondary {
  font-size: 12px;
  color: #999;
}
.paywall-modal__secondary a {
  color: #378add;
  text-decoration: underline;
  cursor: pointer;
}

/* ── Payment processing overlay ── */
.paywall-processing {
  position: fixed;
  inset: 0;
  z-index: 9500;
  background: rgba(10,20,40,.85);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f6f3ec;
  font-size: 18px;
  font-weight: 600;
  flex-direction: column;
  gap: 16px;
}
.paywall-processing__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,.2);
  border-top-color: #d9b683;
  border-radius: 50%;
  animation: paywall-spin .8s linear infinite;
}
@keyframes paywall-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .paywall-modal { padding: 28px 20px 22px; }
  .paywall-modal__title { font-size: 19px; }
}
```

- [ ] **步驟 2：Commit**

```bash
git add assets/css/paywall.css
git commit -m "feat: add paywall CSS (banner, modal, processing overlay)"
```

---

## 任務 7：paywall-guard.js — 付費牆前端邏輯

**檔案：** `assets/js/paywall-guard.js`（新增）

- [ ] **步驟 1：建立檔案**

```javascript
/* IsshoHub — Paywall Guard (章節頁 3–14) */
(function () {
  'use strict';

  /* ── 語言偵測（/en/ 路徑 = 英文版） ── */
  var isEN = window.location.pathname.indexOf('/en/') !== -1;

  var TEXT = {
    eyebrow:    isEN ? 'PREMIUM CONTENT' : '付費內容',
    bannerTitle: isEN ? 'Unlock the Full Guide' : '解鎖天書全文',
    bannerSub:  isEN ? 'Chapters 3–14 · ¥880 incl. tax · Valid 3 months' : '第 3–14 章 · ¥880 稅込 · 3 個月有效',
    expiredMsg: isEN ? 'Your access expired on ' : '你的閱讀權限已於 ',
    expiredSuffix: isEN ? '. Renew to read again.' : ' 到期。續購即可重新閱讀。',
    unlockBtn:  isEN ? 'Unlock Now ¥880' : '立即解鎖 ¥880',
    renewBtn:   isEN ? 'Renew ¥880' : '續購 ¥880',
    loginHint:  isEN ? 'Already purchased? <a id="_pw_login">Sign in</a>' : '已購買？<a id="_pw_login">登入</a>',
    modalTitle: isEN ? 'Unlock the Full Guide' : '解鎖天書全文',
    modalDesc:  isEN
      ? 'Chapters 3–14 · ¥880 incl. tax · 3 months access'
      : '第 3–14 章 · ¥880 稅込 · 3 個月有效期',
    features: isEN
      ? ['12 chapters with diagrams', 'Bilingual Chinese / English', 'Instant access after payment']
      : ['12 章圖文詳解', '中英文雙語', '付款後即時解鎖'],
    price:     '¥880',
    priceSub:  isEN ? 'Tax included · 3 months' : '稅込 · 3 個月',
    buyBtn:    isEN ? 'Purchase ¥880' : '立即購買 ¥880',
    buying:    isEN ? 'Redirecting to payment...' : '正在跳轉至付款頁面…',
    processingTitle: isEN ? 'Confirming your payment…' : '正在確認你的付款…',
    processingSub:   isEN ? 'Please wait a moment.' : '請稍候片刻。',
    alreadyPurchased: isEN ? 'Already purchased? <a id="_pw_login2">Sign in</a>' : '已購買？<a id="_pw_login2">登入</a>',
  };

  /* ── Handle payment return ── */
  var urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success') {
    showProcessingOverlay();
    /* Clean URL then retry in 3s */
    window.history.replaceState({}, '', window.location.pathname);
    setTimeout(function () { window.location.reload(); }, 3000);
    return;
  }
  if (urlParams.get('payment') === 'cancelled') {
    window.history.replaceState({}, '', window.location.pathname);
  }

  /* ── Main init ── */
  function init() {
    /* Wait for IsshoAPI / IsshoAuth */
    if (!window.IsshoAuth || !window.IsshoAPI || !window.IsshoAPI.hasDrivingGuideAccess) {
      setTimeout(init, 80);
      return;
    }

    window.IsshoAPI.hasDrivingGuideAccess().then(function (result) {
      if (result.access) {
        /* Admin or paid — unlock sidebar links, do nothing else */
        unlockSidebarLinks();
        return;
      }

      if (result.reason === 'expired') {
        var d = new Date(result.expires_at);
        var dateStr = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
        applyPaywall('expired', dateStr);
      } else {
        /* not_logged_in | not_purchased | error */
        applyPaywall(result.reason, null);
      }
    }).catch(function () {
      /* Fail silently — don't block content on error */
    });
  }

  /* ── Apply paywall to .guide-content ── */
  function applyPaywall(reason, expiredDate) {
    var content = document.querySelector('.guide-content');
    if (!content) return;

    /* Show only first 10% (min 300px) */
    var fullHeight = content.scrollHeight;
    var previewH   = Math.max(300, Math.floor(fullHeight * 0.10));

    content.style.maxHeight  = previewH + 'px';
    content.style.overflow   = 'hidden';
    content.style.position   = 'relative';

    /* Fade overlay */
    var fade = document.createElement('div');
    fade.className = 'paywall-fade';
    content.appendChild(fade);

    /* Banner */
    var banner = document.createElement('div');
    banner.className = 'paywall-banner';
    banner.innerHTML = buildBanner(reason, expiredDate);
    content.parentNode.insertBefore(banner, content.nextSibling);

    /* Button handler */
    var btn = banner.querySelector('#_pw_unlock_btn');
    if (btn) {
      btn.addEventListener('click', function () {
        if (reason === 'not_logged_in') {
          triggerLogin();
        } else {
          showModal();
        }
      });
    }

    var loginLink = banner.querySelector('#_pw_login');
    if (loginLink) {
      loginLink.addEventListener('click', function (e) {
        e.preventDefault();
        triggerLogin();
      });
    }
  }

  /* ── Banner HTML ── */
  function buildBanner(reason, expiredDate) {
    var expiredHtml = '';
    if (reason === 'expired' && expiredDate) {
      expiredHtml = '<p class="paywall-banner__expired">'
        + TEXT.expiredMsg + expiredDate + TEXT.expiredSuffix + '</p>';
    }

    var btnLabel = reason === 'expired' ? TEXT.renewBtn : TEXT.unlockBtn;
    var loginRow = (reason === 'not_logged_in' || reason === 'not_purchased')
      ? '<span class="paywall-banner__login">' + TEXT.loginHint + '</span>'
      : '';

    return '<p class="paywall-banner__eyebrow">' + TEXT.eyebrow + '</p>'
      + '<h2 class="paywall-banner__title">' + TEXT.bannerTitle + '</h2>'
      + '<p class="paywall-banner__sub">' + TEXT.bannerSub + '</p>'
      + expiredHtml
      + '<button class="paywall-banner__btn" id="_pw_unlock_btn">' + btnLabel + '</button>'
      + loginRow;
  }

  /* ── Payment modal ── */
  function showModal() {
    if (document.getElementById('_pw_modal_overlay')) return;

    var overlay = document.createElement('div');
    overlay.className = 'paywall-modal-overlay';
    overlay.id = '_pw_modal_overlay';
    overlay.innerHTML = '<div class="paywall-modal">'
      + '<button class="paywall-modal__close" id="_pw_modal_close">✕</button>'
      + '<div class="paywall-modal__icon">📖</div>'
      + '<h2 class="paywall-modal__title">' + TEXT.modalTitle + '</h2>'
      + '<p class="paywall-modal__desc">' + TEXT.modalDesc + '</p>'
      + '<ul class="paywall-modal__features">'
      + TEXT.features.map(function (f) { return '<li>' + f + '</li>'; }).join('')
      + '</ul>'
      + '<div class="paywall-modal__price">' + TEXT.price + '</div>'
      + '<div class="paywall-modal__price-sub">' + TEXT.priceSub + '</div>'
      + '<button class="paywall-modal__buy-btn" id="_pw_buy_btn">' + TEXT.buyBtn + '</button>'
      + '<div class="paywall-modal__secondary">' + TEXT.alreadyPurchased + '</div>'
      + '</div>';

    document.body.appendChild(overlay);

    document.getElementById('_pw_modal_close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    var buyBtn = document.getElementById('_pw_buy_btn');
    buyBtn.addEventListener('click', function () {
      buyBtn.disabled = true;
      buyBtn.textContent = TEXT.buying;
      startCheckout();
    });

    var loginLink2 = document.getElementById('_pw_login2');
    if (loginLink2) {
      loginLink2.addEventListener('click', function (e) {
        e.preventDefault();
        closeModal();
        triggerLogin();
      });
    }
  }

  function closeModal() {
    var el = document.getElementById('_pw_modal_overlay');
    if (el) el.remove();
  }

  /* ── Stripe Checkout ── */
  async function startCheckout() {
    try {
      var user = await window.IsshoAuth.getUser();
      if (!user) { closeModal(); triggerLogin(); return; }

      var res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:    user.id,
          email:      user.email,
          return_url: window.location.href,
        }),
      });

      var data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert(isEN ? 'Payment error. Please try again.' : '付款發生錯誤，請再試。');
        var btn = document.getElementById('_pw_buy_btn');
        if (btn) { btn.disabled = false; btn.textContent = TEXT.buyBtn; }
      }
    } catch (e) {
      alert(isEN ? 'Network error. Please try again.' : '網絡錯誤，請再試。');
      var btn = document.getElementById('_pw_buy_btn');
      if (btn) { btn.disabled = false; btn.textContent = TEXT.buyBtn; }
    }
  }

  /* ── Unlock sidebar links (for paid/admin users) ── */
  function unlockSidebarLinks() {
    document.querySelectorAll('.guide-sidebar .guide-locked-link').forEach(function (a) {
      a.style.pointerEvents = '';
      a.style.opacity = '';
    });
    document.querySelectorAll('.guide-mobile-select option.guide-locked-opt').forEach(function (o) {
      o.disabled = false;
    });
  }

  /* ── Login trigger (use existing IsshoCore modal) ── */
  function triggerLogin() {
    var loginBtn = document.getElementById('loginBtn') || document.querySelector('[data-action="login"]');
    if (loginBtn) { loginBtn.click(); return; }
    /* Fallback: dispatch custom event that core.js listens to */
    document.dispatchEvent(new CustomEvent('issho:require-login'));
  }

  /* ── Payment processing overlay ── */
  function showProcessingOverlay() {
    var el = document.createElement('div');
    el.className = 'paywall-processing';
    el.innerHTML = '<div class="paywall-processing__spinner"></div>'
      + '<div>' + TEXT.processingTitle + '</div>'
      + '<div style="font-size:13px;opacity:.6">' + TEXT.processingSub + '</div>';
    document.body.appendChild(el);
  }

  /* ── Bootstrap ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
```

- [ ] **步驟 2：Commit**

```bash
git add assets/js/paywall-guard.js
git commit -m "feat: add paywall-guard.js with Stripe checkout flow"
```

---

## 任務 8：更新目錄頁 — 購買後解鎖連結

**檔案：** `life/driving-guide/index.html` 和 `life/driving-guide/en/index.html`（各修改一處）

- [ ] **步驟 1：找到 `index.html` 中現有的 Admin unlock script（約第 316–331 行）**

```html
<script>
// Admin unlock for index page locked chapters
(async function() {
  try {
    if (!window.IsshoAuth) return;
    const admin = await window.IsshoAuth.isAdmin().catch(() => false);
    if (!admin) return;
    document.querySelectorAll('.guide-chapter-row.locked').forEach(function(el) {
      el.style.pointerEvents = '';
      el.classList.remove('locked');
      var lock = el.querySelector('.lock-icon');
      if (lock) { lock.textContent = '→'; lock.className = 'ch-arrow'; }
    });
  } catch(e) {}
})();
</script>
```

替換為：

```html
<script>
// Unlock locked chapters for admin OR paid users
(async function() {
  try {
    if (!window.IsshoAuth || !window.IsshoAPI) return;
    const result = await window.IsshoAPI.hasDrivingGuideAccess().catch(() => ({ access: false }));
    if (!result.access) return;
    document.querySelectorAll('.guide-chapter-row.locked').forEach(function(el) {
      el.style.pointerEvents = '';
      el.classList.remove('locked');
      var lock = el.querySelector('.lock-icon');
      if (lock) { lock.textContent = '→'; lock.className = 'ch-arrow'; }
    });
  } catch(e) {}
})();
</script>
```

- [ ] **步驟 2：在 `life/driving-guide/en/index.html` 做相同替換**

找到相同的 Admin unlock script，替換為上方相同代碼。

- [ ] **步驟 3：Commit**

```bash
git add life/driving-guide/index.html life/driving-guide/en/index.html
git commit -m "feat: unlock driving guide index for paid users"
```

---

## 任務 9：批量更新章節頁 TC（12 個 HTML）— 引入 paywall-guard

**檔案：** `life/driving-guide/chapter-{3..14}/index.html`（各修改兩處）

**對每個檔案（chapter-3 到 chapter-14）重複以下操作：**

- [ ] **步驟 1：在 `<head>` 內 styles.css 的 `<link>` 後面，加入 paywall.css**

找到：
```html
<link rel="stylesheet" href="/assets/css/styles.css?v=32">
```

改為：
```html
<link rel="stylesheet" href="/assets/css/styles.css?v=32">
<link rel="stylesheet" href="/assets/css/paywall.css">
```

- [ ] **步驟 2：找到現有的 Admin unlock inline script，整個刪除**

刪除：
```html
<script>
// Admin 解鎖付費章節
(async function() {
  try {
    if (!window.IsshoAuth) return;
    const admin = await window.IsshoAuth.isAdmin().catch(() => false);
    if (!admin) return;
    // 解鎖 sidebar 連結
    document.querySelectorAll('.guide-sidebar .guide-locked-link').forEach(function(a) {
      a.style.pointerEvents = '';
      a.style.opacity = '';
    });
    // 解鎖 mobile 下拉
    document.querySelectorAll('.guide-mobile-select option.guide-locked-opt').forEach(function(o) {
      o.disabled = false;
    });
  } catch(e) {}
})();
</script>
```

（paywall-guard.js 已包含 admin 解鎖邏輯，不需重複）

- [ ] **步驟 3：在 `</body>` 前，`<script src="/assets/js/preview-guard.js">` 後面加入 paywall-guard**

找到：
```html
<script src="/assets/js/preview-guard.js"></script>
</body>
```

改為：
```html
<script src="/assets/js/preview-guard.js"></script>
<script src="/assets/js/paywall-guard.js"></script>
</body>
```

- [ ] **步驟 4：12 個檔案全部修改後，一次 commit**

```bash
git add life/driving-guide/chapter-3/index.html \
        life/driving-guide/chapter-4/index.html \
        life/driving-guide/chapter-5/index.html \
        life/driving-guide/chapter-6/index.html \
        life/driving-guide/chapter-7/index.html \
        life/driving-guide/chapter-8/index.html \
        life/driving-guide/chapter-9/index.html \
        life/driving-guide/chapter-10/index.html \
        life/driving-guide/chapter-11/index.html \
        life/driving-guide/chapter-12/index.html \
        life/driving-guide/chapter-13/index.html \
        life/driving-guide/chapter-14/index.html
git commit -m "feat: add paywall-guard to TC chapters 3-14"
```

---

## 任務 10：批量更新章節頁 EN（12 個 HTML）— 引入 paywall-guard

**檔案：** `life/driving-guide/en/chapter-{3..14}/index.html`（各修改兩處）

- [ ] **步驟 1–3：與任務 9 相同**，對 `life/driving-guide/en/chapter-3/index.html` 至 `en/chapter-14/index.html` 執行相同三個步驟。

（EN 章節頁的 admin unlock script 結構相同。paywall-guard.js 透過 URL 偵測 `/en/` 路徑自動切換英文文字。）

- [ ] **步驟 4：12 個 EN 檔案全部修改後，一次 commit**

```bash
git add life/driving-guide/en/chapter-3/index.html \
        life/driving-guide/en/chapter-4/index.html \
        life/driving-guide/en/chapter-5/index.html \
        life/driving-guide/en/chapter-6/index.html \
        life/driving-guide/en/chapter-7/index.html \
        life/driving-guide/en/chapter-8/index.html \
        life/driving-guide/en/chapter-9/index.html \
        life/driving-guide/en/chapter-10/index.html \
        life/driving-guide/en/chapter-11/index.html \
        life/driving-guide/en/chapter-12/index.html \
        life/driving-guide/en/chapter-13/index.html \
        life/driving-guide/en/chapter-14/index.html
git commit -m "feat: add paywall-guard to EN chapters 3-14"
```

---

## 任務 11：Deploy — Push 並確認 Cloudflare Pages 部署成功

- [ ] **步驟 1：Push 到 GitHub**

```bash
git push
```

- [ ] **步驟 2：等待 Cloudflare Pages 部署完成**

在 Cloudflare Dashboard → Pages → isshohub → Deployments，確認最新 commit 部署狀態為 **Success**。

- [ ] **步驟 3：確認環境變數已設定**

Cloudflare Pages → Settings → Environment variables，確認以下 4 個已設定（先不包含 `STRIPE_WEBHOOK_SECRET`）：
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 任務 12：Stripe Webhook — 註冊端點並取得 STRIPE_WEBHOOK_SECRET

**前置條件：** 任務 11 部署成功

- [ ] **步驟 1：在 Stripe Dashboard 建立 Webhook**

Stripe → Developers → Webhooks → + Add endpoint：
- Endpoint URL: `https://isshohub.com/api/stripe-webhook`
- Events to listen: `checkout.session.completed`

- [ ] **步驟 2：複製 Signing secret**

格式為 `whsec_...`

- [ ] **步驟 3：在 Cloudflare Pages 加入第 5 個環境變數**

Cloudflare Pages → Settings → Environment variables → Add：
- Key: `STRIPE_WEBHOOK_SECRET`
- Value: `whsec_...`

- [ ] **步驟 4：重新部署（讓新環境變數生效）**

Cloudflare Pages → Deployments → Retry deployment（或 push 一個空 commit）：

```bash
git commit --allow-empty -m "chore: trigger redeploy for new env var"
git push
```

---

## 任務 13：端對端測試

**使用 Stripe 測試模式（先用 `sk_test_` 和 `pk_test_` 測試，通過後再換 live）**

- [ ] **步驟 1：測試未登入流程**

訪問 `https://isshohub.com/life/driving-guide/chapter-3/`（未登入狀態）
預期：只顯示約 10% 內容 → 底部出現解鎖 Banner → 點擊 Banner 顯示 Modal → Modal 內「購買」按鈕點擊後觸發登入 Modal

- [ ] **步驟 2：測試已登入未購買流程**

登入普通帳戶，訪問 chapter-3
預期：只顯示 10% → Banner 顯示 → 點擊進入 Modal → 點「立即購買」→ 跳轉 Stripe Checkout 頁面

- [ ] **步驟 3：完成 Stripe 測試付款**

在 Stripe Checkout 頁面，使用測試卡 `4242 4242 4242 4242`，任意到期日和 CVC
預期：跳回章節頁，出現「正在確認付款」overlay → 3 秒後 reload → 全文顯示

- [ ] **步驟 4：確認 Supabase purchases 表有新記錄**

在 Supabase Table Editor 查看 `purchases` 表，確認有一筆：
- `user_id` 正確
- `product = 'driving-guide'`
- `status = 'active'`
- `expires_at` 約 3 個月後

- [ ] **步驟 5：測試到期提示**

在 Supabase 手動把該筆記錄的 `expires_at` 改為過去的時間，重新訪問章節頁
預期：顯示 10% 內容 → Banner 顯示「你的閱讀權限已於 XXXX/XX/XX 到期」+ 「續購 ¥880」按鈕

- [ ] **步驟 6：測試 Admin 流程**

以 Admin 帳戶登入，訪問 chapter-3
預期：全文顯示，無 Banner，無 Modal

- [ ] **步驟 7：測試目錄頁解鎖**

以購買帳戶登入，訪問 `/life/driving-guide/`
預期：第 3–14 章連結由灰色鎖定變為可點擊

---

## 自檢記錄

### 規格覆蓋度
- ✅ 未登入 → 登入 Modal：任務 7 `triggerLogin()`
- ✅ 已登入未購買 → 10% 預覽 + Banner + Modal：任務 7
- ✅ 已購買未到期 → 正常顯示：任務 7
- ✅ 購買到期 → 顯示到期提示 + 續購：任務 7
- ✅ Stripe Checkout → Webhook → Supabase：任務 4, 5
- ✅ 目錄頁解鎖：任務 8
- ✅ 雙語支援（TC/EN）：任務 7 TEXT 物件

### 待用戶手動操作項
1. Supabase 建表（任務 1）
2. Stripe 建商品取得 PRICE_ID（任務 2）
3. Cloudflare 設環境變數（任務 2, 12）
4. Stripe 建 Webhook（任務 12）
