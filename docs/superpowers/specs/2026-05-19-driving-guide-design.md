# 日本駕照天書 — 設計規格

**日期：** 2026-05-19  
**狀態：** 待審閱

---

## 概覽

將自製「外免天書」（15章）轉為 IsshoHub 網頁內容，定位為在日外國人日本駕照完全攻略，涵蓋外免切替（換牌）及重新考試（學科試）兩類用戶。

**第一階段：** 純呈現（網頁化）  
**第二階段：** 付費解鎖（Stripe + Supabase，之後實作）

---

## URL 結構

```
/life/driving-guide/               ← 目錄頁（章節索引）
/life/driving-guide/chapter-1/     ← 第一章　容易混淆的標識與標線（免費）
/life/driving-guide/chapter-2/     ← 第二章　道路標識速查表（免費）
/life/driving-guide/chapter-3/     ← 第三章　道路標線速查表（付費）
/life/driving-guide/chapter-4/     ← 第四章　號誌、信號機與警察手勢（付費）
...
/life/driving-guide/chapter-15/    ← 第十五章　免責聲明（免費/公開）
```

第1、2章完全免費；第3章起付費解鎖（第二階段實作）。

---

## 內容轉換方式

### docx → HTML 原則

- **忠實還原**原文件格式，不重新設計內容排版
- 標題層級：`Heading 1` → `<h1>`，`Heading 2` → `<h2>`，`Heading 3` → `<h3>`
- 表格：docx 表格 → HTML `<table>`，保留格子結構
- 圖片：從 docx 提取，存於 `/assets/img/driving-guide/chapter-X/`，在對應格子位置插入 `<img>`
- 粗體、斜體、列表等格式照原樣轉換

### 圖片處理

- 用 python-docx 提取所有 embedded 圖片
- 命名規則：`ch01_img01.png`、`ch01_img02.png` 等
- 存放：`/assets/img/driving-guide/`
- 第1章估計 34 張，第2、3章估計更多

### 轉換工具

寫一個 `scripts/docx-to-html.py`，批次處理 15 個 docx：
1. 提取圖片到正確目錄
2. 輸出每章的 HTML 內容片段（不含 nav/footer，只含正文）
3. 人工審閱輸出後，套入頁面模板

---

## 頁面設計

### 目錄頁 `/life/driving-guide/`

- 頁面標題：「日本駕照完全攻略｜外免切替・學科試天書」
- 簡介段落（定位、適用對象）
- 15章列表，每章有標題 + 一句說明
- 第1、2章：直接連結
- 第3章起：顯示鎖頭圖示（第二階段加付費解鎖按鈕）

### 章節頁 `/life/driving-guide/chapter-X/`

版面結構：
```
[Nav]
[章節標題 + 麵包屑: 生活 > 駕照天書 > 第X章]
[左：固定側邊目錄（桌面版）]  [右：章節正文]
[上一章 / 下一章 導航]
[Footer]
```

- 側邊目錄：顯示全部15章，當前章高亮，付費章節顯示鎖頭
- 正文：忠實還原 docx 內容（表格、圖片、標題層級）
- 手機版：側邊目錄收起為下拉選單

### 樣式原則

- 沿用 `/assets/css/styles.css`，不新增獨立 CSS 檔
- 表格樣式：加入現有 styles.css（`.guide-table`）
- 圖片：`max-width: 100%`，置中，有 caption

---

## SEO 設計

### 每章 meta

```html
<title>第X章 [章節名稱]｜日本駕照天書 — IsshoHub</title>
<meta name="description" content="[章節一句說明，含關鍵字]">
<link rel="canonical" href="https://isshohub.com/life/driving-guide/chapter-X/">
```

### Flexible Sampling（第二階段加）

付費章節加 schema 標記，讓 Googlebot 看完整內容：

```html
<div itemprop="isAccessibleForFree" content="True">
  <!-- 免費預覽部分 -->
</div>
<div itemprop="isAccessibleForFree" content="False">
  <!-- 付費內容 -->
</div>
```

### hreflang

天書目前只有繁體中文，暫不加 hreflang，之後有英文版再加。

---

## 第二階段（付費）預留設計

### 訂閱模式

- 價格：¥500（一次性）
- 有效期：90 天
- 支付：Stripe（信用卡 + 支付寶）

### Supabase 新表 `subscriptions`

```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  product text DEFAULT 'driving-guide',
  expires_at timestamptz NOT NULL,
  stripe_session_id text,
  created_at timestamptz DEFAULT now()
);
```

### Cloudflare Functions（預留）

- `functions/api/create-checkout.js` — 建立 Stripe Checkout Session
- `functions/api/stripe-webhook.js` — 接收付款成功，寫入 subscriptions

---

## 實作順序（第一階段）

1. 寫 `scripts/docx-to-html.py`，提取圖片 + 輸出 HTML 片段
2. 人工審閱輸出，確認格式正確
3. 建立目錄頁 `/life/driving-guide/index.html`
4. 建立 15 個章節頁面（套模板）
5. 加入 styles.css 表格/圖片樣式
6. 更新 `build.js` sitemap 納入新頁面
7. 更新 `data.js` nav（driving-guide 加入 life 子選單）
8. 測試、commit、push

---

## 待確認

- 目錄頁是否加入 life 分類的 nav 子選單？
- 章節頁是否顯示在 sitemap（付費章節是否索引）？
- 免費章節：第1、2章；付費章節：第3-14章；免責聲明（第15章）公開 ✅

