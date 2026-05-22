# 天書付費牆系統設計規格

**日期：** 2026-05-21  
**產品：** 日本駕照完全攻略（外免切替・學科試天書）  
**版本：** v1.0

---

## 一、產品定義

| 項目 | 內容 |
|------|------|
| 付費內容 | 第 3–14 章（共 12 章，中英文版同步解鎖） |
| 免費內容 | 第 1–2 章、第 15 章（永久免費） |
| 定價 | ¥880 稅込（消費稅 10% 已含） |
| 存取期限 | 購買後 3 個月 |
| 收款平台 | Stripe（日本法人帳戶） |
| 出金方式 | 手動出金（累積後自行操作） |

---

## 二、用戶流程

### 2.1 未登入 Guest
```
點擊鎖定章節
  → 登入/註冊 Modal（現有）
  → 登入後 → 進入 2.2
```

### 2.2 已登入但未購買
```
點擊鎖定章節
  → 進入章節頁
  → 顯示前 40% 內容
  → 內容漸漸模糊淡出
  → 底部出現「解鎖全文」Banner
  → 點擊 → 彈出付費 Modal
  → 點「立即購買 ¥880」
  → 跳轉 Stripe Checkout（hosted page）
  → 付款成功 → Stripe Webhook → 寫入 Supabase
  → 自動跳回章節頁，全文解鎖
```

### 2.3 已登入且已購買（未到期）
```
進入任何第 3–14 章
  → 自動完整顯示，無任何阻擋
```

### 2.4 購買已到期
```
進入第 3–14 章
  → 顯示「你的閱讀權限已於 XX 到期」提示
  → 提供「續購」按鈕（同樣 ¥880 / 3個月）
  → 購買後重新計算 3 個月
```

---

## 三、前端架構

### 3.1 目錄頁（`/life/driving-guide/index.html`）
- 現有：第 3–14 章有 `.locked` class + `pointer-events:none`
- 新增：頁面載入時呼叫 `checkDrivingGuideAccess()`
  - 未購買：維持鎖定，顯示鎖定圖示
  - 已購買（未到期）：移除 locked class，啟用連結
  - Admin：現有邏輯不變

### 3.2 章節頁（第 3–14 章，共 24 頁含英文版）
- 新增 `paywall-guard.js` 腳本
- 載入後執行：
  1. 呼叫 `IsshoAuth.getUser()` 確認登入狀態
  2. 查詢 Supabase `purchases` 表確認有效購買
  3. **有效**：正常顯示
  4. **無效**：注入模糊遮罩 + 解鎖 Banner

### 3.3 付費 Modal
- 觸發：點擊「解鎖全文」Banner 或鎖定章節
- 內容：
  - 標題：「解鎖天書全文」
  - 說明：第 3–14 章 · ¥880 稅込 · 3 個月有效
  - 功能列表：12 章圖文詳解、中英文雙語、即時解鎖
  - 按鈕：「立即購買 ¥880」→ 呼叫 create-checkout API
  - 次要文字：已購買？→ 登入按鈕

---

## 四、後端架構

### 4.1 Supabase 資料表

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

-- Row Level Security
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = user_id);
```

### 4.2 Netlify Functions

**`functions/api/create-checkout.js`**
- Method: POST
- Input: `{ user_id, email, return_url }`
- 建立 Stripe Checkout Session（mode: payment, ¥880 JPY）
- 回傳 `{ checkout_url }`

**`functions/api/stripe-webhook.js`**
- 接收 Stripe `checkout.session.completed` 事件
- 驗證 Stripe webhook signature
- 寫入 Supabase `purchases`：
  - `user_id`（從 session metadata 取得）
  - `expires_at` = `now() + 3 months`
  - `stripe_session_id`
  - `status = 'active'`

### 4.3 前端 Access Check（`supabase-client.js` 新增）

```javascript
async function hasDrivingGuideAccess() {
  const user = await getUser();
  if (!user) return false;
  if (await isAdmin()) return true;
  
  const { data } = await supabase
    .from('purchases')
    .select('expires_at')
    .eq('user_id', user.id)
    .eq('product', 'driving-guide')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .single();
  
  return !!data;
}
```

---

## 五、新增檔案清單

| 檔案 | 說明 |
|------|------|
| `functions/api/create-checkout.js` | Stripe Checkout Session 建立 |
| `functions/api/stripe-webhook.js` | Stripe 付款成功 Webhook |
| `assets/js/paywall-guard.js` | 章節頁付費牆邏輯 + UI |
| `assets/css/paywall.css` | 模糊遮罩、解鎖 Banner、付費 Modal 樣式 |

**修改檔案：**

| 檔案 | 修改內容 |
|------|------|
| `assets/js/supabase-client.js` | 新增 `hasDrivingGuideAccess()` |
| `life/driving-guide/index.html` | 加入購買狀態解鎖邏輯 |
| `life/driving-guide/en/index.html` | 同上 |
| 第 3–14 章（共 24 個 HTML） | 引入 `paywall-guard.js` |
| `netlify.toml` | 確認 Functions 路徑設定 |

---

## 六、環境變數（Netlify）

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...（¥880 JPY 一次性）
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 七、不在本期範圍

- 退款流程（手動透過 Stripe Dashboard 處理）
- 到期續購提醒 email
- 優惠碼 / 早鳥折扣
- 其他語言版天書付費
