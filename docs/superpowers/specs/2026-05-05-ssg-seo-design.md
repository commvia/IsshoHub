# IsshoHub — SSG 靜態生成 SEO 方案設計

**日期：** 2026-05-05
**狀態：** 已批准，待實作

---

## 背景

IsshoHub 現時是純 Client-side Rendering（SPA）。Googlebot 訪問文章頁時，初始 HTML 是空殼，需等 JavaScript 執行後才有完整內容，影響索引速度和 SEO 排名。

網站尚未正式推出，域名未購買，是改架構的最佳時機。

---

## 目標

1. 每篇文章生成獨立靜態 HTML 文件，Googlebot 一訪問即得完整內容
2. 文章 URL 改為乾淨路徑 `/article/[slug]/`
3. Sitemap 自動包含所有已發布文章 URL
4. 每篇文章有完整 meta tags 和 JSON-LD 結構化資料
5. 現有分類頁、主頁、Admin 完全不受影響

---

## 架構對比

**改前（SPA）**
```
訪問 /article/?slug=xxx
→ 回傳空 article/index.html
→ JS 向 Supabase 取資料
→ JS 渲染頁面內容
```

**改後（SSG）**
```
訪問 /article/how-to-get-visa/
→ 直接回傳完整 HTML（已含標題、內文、meta、JSON-LD）
→ JS 加載互動功能（書籤、匯率、相關文章）
```

---

## 新增檔案

| 檔案 | 用途 |
|------|------|
| `package.json` | Node.js 項目設定，唯一 dependency：`@supabase/supabase-js` |
| `build.js` | Build script，約 150 行，生成所有靜態文章頁和 sitemap |
| `article/_template.html` | 文章頁 HTML template，含 `{{PLACEHOLDER}}` 替換位 |
| `article/[slug]/index.html` | Build 時自動生成，每篇文章一個，不手動編輯 |
| `sitemap.xml` | Build 時自動覆蓋，包含所有已發布文章 URL |

**不改動的檔案：**
- `index.html`（主頁）
- `visa/`, `biz/`, `house/` 等所有分類頁
- `admin/index.html`
- `bookmarks/index.html`
- `assets/css/styles.css`
- `assets/js/*.js`（除更新內部連結格式外）

---

## Build Script 邏輯（`build.js`）

```
1. 從 Supabase 抓取所有 status=published 的文章
2. 讀取 article/_template.html
3. 對每篇文章：
   a. 把 Markdown 內文轉成 HTML（沿用現有 parser 邏輯）
   b. 替換 template 中的 placeholder：
      - {{TITLE}}、{{EXCERPT}}、{{COVER_IMAGE}}
      - {{CANONICAL_URL}}、{{OG_IMAGE}}
      - {{JSON_LD}}（Article schema）
      - {{CONTENT_HTML}}
   c. 寫入 article/[slug]/index.html
4. 生成 sitemap.xml（含主頁、分類頁、所有文章 URL）
5. 完成，輸出生成數量
```

---

## 文章 Template 更新內容

相比現有 `article/index.html`，template 新增：

**靜態預填（Build 時注入）：**
- `<title>文章標題 — IsshoHub</title>`（不再是空的）
- `<meta name="description" content="文章摘要">`
- 完整 OG tags（og:title、og:description、og:image、og:url）
- `<link rel="canonical">` 指向正確文章 URL
- JSON-LD `Article` schema（標題、作者、發布日期、圖片）

**JS 動態加載（保留）：**
- 書籤功能
- 相關文章
- 匯率計算器
- 語言切換

---

## JSON-LD Article Schema

每篇文章頁注入：

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "文章標題",
  "description": "文章摘要",
  "image": "封面圖片 URL",
  "datePublished": "2026-01-15",
  "dateModified": "2026-01-15",
  "author": {
    "@type": "Organization",
    "name": "IsshoHub"
  },
  "publisher": {
    "@type": "Organization",
    "name": "IsshoHub",
    "url": "https://isshohub.com"
  }
}
```

主頁另加 `WebSite` + `Organization` schema。

---

## URL 結構改變

| 改前 | 改後 |
|------|------|
| `/article/?slug=how-to-get-visa` | `/article/how-to-get-visa/` |

**內部連結更新：**
凡是現有程式碼中生成 `/article/?slug=` 連結的地方，統一改成 `/article/${slug}/`。
主要涉及：`core.js`（`C.cardHTML()`）、`article/index.html`（相關文章）、`index.html`（`sbCardHTML()`）。

---

## Sitemap 更新

Build script 生成的 `sitemap.xml` 結構：

```xml
<url>
  <loc>https://isshohub.com/article/how-to-get-visa/</loc>
  <lastmod>2026-01-15</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

---

## `_redirects` 調整

現有 `_redirects` 有一條規則：
```
/article/*  /article/index.html  200
```

這條規則要**移除**。原本它的作用是讓所有 `/article/` 請求都跳到 SPA。改成 SSG 後，靜態文件直接存在，不需要這條規則。Cloudflare Pages 會直接回傳 `article/[slug]/index.html`。

---

## Cloudflare Pages 設定

| 項目 | 值 |
|------|----|
| Build command | `node build.js` |
| Build output directory | `/`（根目錄） |
| Node.js version | 20 |
| 環境變數（Build 時） | `SUPABASE_URL`、`SUPABASE_SERVICE_KEY` |

**重要：** Build script 使用 `SERVICE_KEY`（非 anon key），具讀取全部文章的權限，只在 Cloudflare Pages 環境變數中設定，不進 git repo。

---

## 觸發 Rebuild

新文章發布後，需要 rebuild 才會生成靜態頁。兩個選項：

- **手動：** 在 Cloudflare Pages Dashboard 按「Redeploy」，約 1-2 分鐘
- **自動：** Admin 發布文章時，呼叫 Cloudflare Pages Deploy Hook URL（一個 POST 請求），自動觸發 rebuild

建議先做手動，待流程穩定後加自動觸發。

---

## 域名更新（日後）

買了域名後，只需：
1. Cloudflare Pages Custom Domain 加入新域名
2. `build.js` 中的 base URL 從 `isshohub.pages.dev` 改成新域名
3. 主頁和分類頁的 canonical / OG URL 一併更新
4. 重新 build 一次

---

## 實作範圍（不包含）

- 分類頁 SSG（分類頁文章量動態，繼續用 client-side 即可）
- 多語言獨立 URL（`/en/article/slug/`）——現階段 URL 語言中立，JS 切換語言即可
- 增量 Build（每次 rebuild 全部文章，文章量增大前不需優化）
