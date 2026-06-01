# 雙語 Category 頁面設計（解決美國曝光 0 點擊問題）

> **狀態**：MVP（階段 1） — 待開工
> **日期**：2026-05-31
> **背景**：GSC 顯示美國 52 曝光 0 點擊；diagnose 確認原因為 category 頁（`/tax/`、`/visa/` 等）`<html lang="zh-Hant">` + 中文 title/description，Google 給美國用戶看到中文 → 不點擊。

---

## 問題

10 個 category 頁（`news / visa / biz / house / culture / tax / life / places / pets / story`）+ 2 個 info 頁（`about / privacy`）+ 首頁 `/`，全部是「單 URL 雙語」設計：

- `<html lang="zh-Hant">`（Google 視為中文頁）
- `<title>` 與 `<meta description>` 純中文
- `hreflang="en"` 自指到同一個 TC URL（hreflang spec 違規）
- 英文版內容只能靠 lang-toggle button 手動切換

實際後果：美國訪客在 Google 搜尋結果看到中文 → 不點 → CTR=0。

## 目標

讓 Google 為每個 category 頁建立**獨立的 EN URL**，與 TC URL 互為翻譯，使英文搜尋結果顯示英文 title/snippet，提升 US/EN-locale CTR。

## 範圍

- **階段 1（本 spec）**：MVP — 單一頁 `/en/tax/` 上線並驗證
- **階段 2（另立 spec）**：批次完成剩下 12 頁（9 個 category + about + privacy + 首頁）

階段 2 啟動條件：階段 1 deploy 後至少 1-2 天，且 GSC 顯示 `/en/tax/` 已被收錄。

## 設計決策（已用戶確認）

| 決策 | 選定 | 理由 |
|------|------|------|
| URL 結構 | `/en/<cat>/` 前綴 | 跟 driving-guide 一致，對 Google 表達「EN 站根目錄」清楚 |
| 施工順序 | 1 頁 MVP 先驗證，再批次 | 吸取過去 17 commits 無效果的教訓，一次只改一個變數 |
| 自動跳轉 | C（只在 `localStorage.issho.lang === 'en'` 時跳）| 不偵測 navigator.language，零誤跳風險 |

## 階段 1 詳細設計

### 檔案改動

#### 1. 新建 `en/tax/index.html`

從 `tax/index.html` 複製整份，做以下改動：

| 元素 | TC 原值 | EN 改為 |
|------|---------|---------|
| `<html lang>` | `zh-Hant` | `en` |
| `<title>` | `稅務・保險・年金 — IsshoHub` | `Tax, Insurance & Pension — IsshoHub` |
| `<meta name="description">` | 「確定申告、法人稅、消費稅、健康保險與國民年金——在日生活所有稅務與保險知識。」 | `Tax filing, corporate tax, consumption tax, health insurance and national pension — everything you need to know about money in Japan.` |
| `<meta name="keywords">`（如有）| 中文 | EN 翻譯 |
| `<meta property="og:title">` | 同 title | EN |
| `<meta property="og:description">` | 中文 | EN |
| `<meta property="og:locale">` | `zh_TW` | `en_US` |
| `<meta property="og:locale:alternate">` | `en_US` | `zh_TW` |
| `<meta property="og:url">` | `https://isshohub.com/tax/` | `https://isshohub.com/en/tax/` |
| `<link rel="canonical">` | `/tax/` | `/en/tax/` |
| hreflang `zh-Hant` | `/tax/` | `/tax/` |
| hreflang `en` | `/tax/`（自指 ❌）| `/en/tax/` |
| hreflang `x-default` | `/tax/` | `/tax/` |
| 麵包屑文字 | 「首頁 / 稅務・保險・年金」 | `Home / Tax, Insurance & Pension` |
| `<body data-lang>` | `tc` | `en` |
| H1 主標 | 「稅務・保險・年金」 | `Tax, Insurance & Pension` |
| H1 副標（小字）| `TAX, INSURANCE & PENSION` | `稅務・保險・年金`（對稱）|
| 簡介段 `<p>` | 「確定申告、法人稅、消費稅、健康保險與國民年金⋯」 | EN 翻譯 |
| 「全部文章」section heading | 「全部文章」 | `All Articles` |
| 「{N} 篇文章」 | 中文 | `{N} Articles` |
| 「{N} 個子分類」 | 中文 | `{N} Subcategories` |

**保持不變**：
- 所有 `<script src="...">` 包含 core.js、data.js、supabase
- Anti-FOUC `<style>` 區塊
- nav `<div id="navLinks"></div>` 空容器（由 core.js JS 填）
- 所有 admin / login / footer 結構
- nav 連結內 URL：core.js 動態建出來都是 TC URL（如 `/news/`、`/visa/`），暫不改

#### 2. 修 `tax/index.html`

**僅兩處改動**：

A. 修 hreflang 自指 bug（line 33）
```diff
- <link rel="alternate" hreflang="en" href="https://isshohub.com/tax/" />
+ <link rel="alternate" hreflang="en" href="https://isshohub.com/en/tax/" />
```

B. 在 `<head>` 加 localStorage redirect 腳本（緊接 charset/viewport 後）
```html
<!-- Auto-redirect EN users who previously chose EN — see brainstorming 2026-05-31 -->
<script>
(function() {
  try {
    if (localStorage.getItem('issho.lang') === 'en') {
      window.location.replace('/en/tax/');
    }
  } catch (_) {}
})();
</script>
```

**保持不變**：HTML lang、title、所有其他 meta、breadcrumb、H1、body、nav、所有 JS includes。

#### 3. 修 `sitemap.xml`

**A. 找到既有的 `/tax/` URL entry，把它的 hreflang 部分改成正確雙向：**
```xml
<url>
  <loc>https://isshohub.com/tax/</loc>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
  <xhtml:link rel="alternate" hreflang="zh-Hant" href="https://isshohub.com/tax/"/>
  <xhtml:link rel="alternate" hreflang="en" href="https://isshohub.com/en/tax/"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://isshohub.com/tax/"/>
</url>
```

**B. 新增 `/en/tax/` entry：**
```xml
<url>
  <loc>https://isshohub.com/en/tax/</loc>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
  <xhtml:link rel="alternate" hreflang="zh-Hant" href="https://isshohub.com/tax/"/>
  <xhtml:link rel="alternate" hreflang="en" href="https://isshohub.com/en/tax/"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://isshohub.com/tax/"/>
</url>
```

#### 4. 修 `build.js`

在 `STATIC_PAGES` array 內，在 `/tax/` 那筆**後面**新增：
```js
{ loc: `${BASE_URL}/en/tax/`, changefreq: 'weekly', priority: '0.7' },
```

### 不會改的檔案（明確列出）

| 檔案 | 理由 |
|------|------|
| `assets/js/core.js` | 過去 5 次失敗在 nav/i18n/FOUC/auth |
| `assets/js/data.js` | NAV_KEYS / categories 變動風險高 |
| `assets/css/styles.css` | MVP 不需 cache bust |
| `article/_template.html` | 不影響 article 頁 |
| 其他 11 個 category/info/首頁 | 階段 2 才動 |
| 駕照天書 4 語言版本 | 不相關 |
| Admin / Login / Paywall 相關 | 不相關 |
| Anti-FOUC `<style>` 區塊 | 8 層防護不能動（記憶警告） |

## 風險評估

| 風險 | 機率 | 影響 | 緩解 |
|------|------|------|------|
| Redirect loop | 極低 | 中 | `/en/tax/` 不含 redirect 腳本，不可能形成 loop |
| TC 用戶誤跳 EN | 零 | - | 只在已存 `'en'` 時跳，TC 用戶沒有這 flag |
| sitemap.xml 格式錯 | 低 | 低 | 用 Python xml.dom.minidom 驗證 |
| `/en/tax/` 404 | 極低 | 中 | deploy 後 curl 確認 |
| Google 索引慢 | 高 | 低 | 預期 1-2 天才開始收錄，正常 |
| `/tax/` 既有排名變動 | 低 | 中 | hreflang 修正是 SEO 改善，理論上只升不降 |

## 驗證流程

部署到 Cloudflare 後**手動**做：

1. ✅ `curl https://isshohub.com/en/tax/` → 200 OK + EN 內容
2. ✅ `curl https://isshohub.com/tax/` → 200 OK + TC 內容（沒被誤跳）
3. ✅ `curl https://isshohub.com/sitemap.xml` → 含 `/en/tax/` entry + 正確 hreflang
4. ✅ 瀏覽器測 localStorage redirect：
   - 開 `/tax/`，console 跑 `localStorage.setItem('issho.lang','en')`
   - 重新整理 → 應跳 `/en/tax/`
   - console 跑 `localStorage.removeItem('issho.lang')`
   - 重新整理 → 應留在 `/tax/`
5. ✅ Google Rich Results Test：兩個 URL hreflang 雙向都正確
6. ⏳ 等 1-2 天看 GSC `頁面索引` 報告，確認 `/en/tax/` 被收錄
7. ⏳ 等 1 週看 GSC `效能` 報告，US 對 `/en/tax/` 是否有曝光

## 階段 2 啟動條件

以下條件**全部**符合才能啟動階段 2：

- ✅ `/en/tax/` 在 Cloudflare 部署成功（直接訪問 200 OK）
- ✅ localStorage redirect 經瀏覽器測通過
- ✅ 至少 24 小時無 user-reported bug
- ✅ GSC 顯示 `/en/tax/` 已收錄（或至少抓取成功）

階段 2 範圍（另立 spec）：
- 9 個 category 頁：news, visa, biz, house, culture, life, places, pets, story
- 2 個 info 頁：about, privacy
- 首頁 `/` → `/en/`（涉及 build.js SSG 雙語化，複雜度較高）
- 階段 2 可能需動 core.js nav 邏輯（EN 頁 nav 連結指 EN URL）

## 預估時間

- 翻譯與檔案編輯：20 分鐘
- sitemap + build.js：5 分鐘
- 本地 lint / XML 驗證：5 分鐘
- commit + push：5 分鐘
- 部署完手動驗證：10 分鐘
- **總計：< 1 小時**

## 開發者註記

- 此 spec 嚴格遵守過去 handoff 文件（`docs/handoff/2026-05-28-pagespeed-fcp-lcp-investigation.md`）總結的教訓：「一次只改一個變數」、「不要相信『合理應該有幫助』」、「verification-before-completion」
- 階段 1 完成後，無論結果如何，須更新此 spec 加入「實際結果」section（GSC 數據、發現問題、學到教訓）
- 階段 2 spec 必須等階段 1 實際結果出來後才寫
