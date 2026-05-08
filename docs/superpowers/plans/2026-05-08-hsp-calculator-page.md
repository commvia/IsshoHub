# HSP 計算器獨立工具頁 實現計劃

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推薦）或 superpowers:executing-plans 逐任務實現此計劃。步驟使用複選框（`- [ ]`）語法來跟蹤進度。

**目標：** 將 HSP 積分計算器從 `visa/index.html` 的全寬 section 移出，改為文章 grid 頂部的工具卡（連結到新獨立頁），並建立 `/visa/hsp-calculator/` 作為計算器的專屬頁面。

**架構：** 純前端 Vanilla JS，無後端。三個變更：① `styles.css` 追加工具卡與頁面 hero CSS；② `visa/index.html` 移除舊計算器並注入工具卡；③ 新增 `visa/hsp-calculator/index.html` 完整工具頁。`hsp-calculator.js` 不需改動。

**技術棧：** HTML + CSS + Vanilla JS，`IsshoCore.getLang()` / `IsshoCore.onLangChange()`，`styles.css?v=9`

---

## 檔案結構

| 檔案 | 變更類型 | 職責 |
|------|----------|------|
| `assets/css/styles.css` | 追加 | 工具卡 `.hsp-tool-card` 樣式 + `/visa/hsp-calculator/` 頁面 hero 樣式 |
| `visa/index.html` | 修改 | 移除計算器 section / script tag / i18n IIFE；新增 `buildHspToolCard()` 函數；修改 `filterAndRender()` |
| `visa/hsp-calculator/index.html` | 新增 | 獨立工具頁，複用 nav / footer，掛載 `#hspCalculator` |

---

## 任務 1：追加 CSS + 升版本號

**檔案：**
- 修改：`assets/css/styles.css`（末尾追加）
- 修改：所有 `*.html`（`styles.css?v=8` → `styles.css?v=9`）

- [ ] **步驟 1：追加 CSS 至 `styles.css` 末尾**

```css
/* ═══════════════════════════════════════
   HSP Tool Card (visa/index.html article grid)
   ═══════════════════════════════════════ */
.hsp-tool-card {
  grid-column: 1 / -1;
  display: flex; align-items: center; gap: 20px;
  background: var(--navy-ink, #0d2444); color: #fff;
  border-radius: var(--r-lg, 16px); padding: 20px 24px;
  margin-bottom: 4px;
}
.hsp-tool-card-icon {
  font-size: 28px; flex-shrink: 0;
  width: 56px; height: 56px;
  background: rgba(217,182,131,.15);
  border: 1px solid rgba(217,182,131,.3);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #d9b683;
}
.hsp-tool-card-body { flex: 1; min-width: 0; }
.hsp-tool-card-tag { font-size: 10px; letter-spacing: .14em; color: #d9b683; margin-bottom: 4px; text-transform: uppercase; }
.hsp-tool-card-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.hsp-tool-card-desc { font-size: 13px; opacity: .7; line-height: 1.5; }
.hsp-tool-card-btn {
  flex-shrink: 0; padding: 10px 20px; border-radius: 8px;
  background: #d9b683; color: var(--navy-ink, #0d2444);
  font-size: 13px; font-weight: 700; white-space: nowrap;
  text-decoration: none; transition: opacity .15s;
}
.hsp-tool-card-btn:hover { opacity: .85; }

@media (max-width: 600px) {
  .hsp-tool-card { flex-wrap: wrap; }
  .hsp-tool-card-btn { width: 100%; text-align: center; margin-top: 4px; }
}

/* ═══════════════════════════════════════
   HSP Calculator Page Hero (/visa/hsp-calculator/)
   ═══════════════════════════════════════ */
.hsp-page-hero {
  background: var(--navy-ink, #0d2444);
  padding: 48px 0 40px;
  color: #fff;
}
.hsp-page-breadcrumb {
  font-size: 12px; color: rgba(255,255,255,.5);
  margin-bottom: 16px; display: flex; align-items: center; gap: 6px;
}
.hsp-page-breadcrumb a { color: rgba(217,182,131,.8); text-decoration: none; }
.hsp-page-breadcrumb a:hover { color: #d9b683; }
.hsp-page-breadcrumb-sep { opacity: .4; }
.hsp-page-title { font-size: clamp(24px,4vw,36px); font-weight: 800; margin-bottom: 10px; line-height: 1.2; }
.hsp-page-sub { font-size: 15px; opacity: .7; max-width: 540px; line-height: 1.6; }

.hsp-page-calc-section { padding: 40px 0 64px; background: var(--paper, #fbf9f3); }
```

- [ ] **步驟 2：升版本號（v=8 → v=9）**

```bash
find /Users/kit/Desktop/Isshohub -name "*.html" | xargs sed -i '' 's|styles\.css?v=8|styles.css?v=9|g'
```

驗證：
```bash
grep -r "styles.css?v=8" /Users/kit/Desktop/Isshohub --include="*.html" | wc -l
# 預期：0
grep -r "styles.css?v=9" /Users/kit/Desktop/Isshohub --include="*.html" | wc -l
# 預期：15（或更多）
```

- [ ] **步驟 3：Commit**

```bash
cd /Users/kit/Desktop/Isshohub
git add assets/css/styles.css
git add -u
git commit -m "feat: hsp 工具卡與工具頁 hero CSS"
```

---

## 任務 2：修改 visa/index.html

**檔案：**
- 修改：`visa/index.html`

本任務有三個子操作：移除舊計算器、新增 `buildHspToolCard()` 函數、修改 `filterAndRender()`。

### 2-A 移除 HSP calculator section（HTML）

找到並完整刪除以下 13 行（目前在 387–399 行）：

```html
<!-- =============== HSP CALCULATOR =============== -->
<section class="section hsp-calc-section" id="hsp">
  <div class="container">
    <div class="section-head">
      <div>
        <div class="section-eyebrow">— 高度専門職</div>
        <h2 class="section-title" id="hspCalcTitle">高度專門職積分試算</h2>
        <div class="section-sub" id="hspCalcSub">根據官方積分表，初步估算你的高度專門職資格分數。</div>
      </div>
    </div>
    <div id="hspCalculator" class="hsp-calculator"></div>
  </div>
</section>
```

### 2-B 移除 hsp-calculator.js script tag

找到並刪除（目前在 628 行）：

```html
<script src="/assets/js/hsp-calculator.js?v=1"></script>
```

### 2-C 移除 updateHspI18n IIFE（inline script 底部）

找到並刪除以下 15 行（目前在 888–902 行）：

```javascript
  /* HSP Calculator section 雙語 */
  (function updateHspI18n() {
    function setHspLang() {
      var lang = (window.IsshoCore && window.IsshoCore.getLang()) || 'tc';
      var L = lang === 'tc';
      var title = document.getElementById('hspCalcTitle');
      var sub   = document.getElementById('hspCalcSub');
      if (title) title.textContent = L ? '高度專門職積分試算' : 'HSP Points Calculator';
      if (sub)   sub.textContent   = L ? '根據官方積分表，初步估算你的高度專門職資格分數。' : 'Estimate your Highly Skilled Professional visa points based on the official scoring table.';
    }
    setHspLang();
    if (window.IsshoCore && window.IsshoCore.onLangChange) {
      window.IsshoCore.onLangChange(setHspLang);
    }
  })();
```

### 2-D 新增 buildHspToolCard() 函數

在 inline script 的 `filterAndRender()` 函數定義**之前**插入：

```javascript
  /* ── HSP 工具卡 ── */
  function buildHspToolCard(lang) {
    const L = lang === 'tc';
    return `<div class="hsp-tool-card">
      <div class="hsp-tool-card-icon">⬡</div>
      <div class="hsp-tool-card-body">
        <div class="hsp-tool-card-tag">${L ? '工具' : 'Tool'}</div>
        <div class="hsp-tool-card-title">${L ? '高度專門職積分試算' : 'HSP Points Calculator'}</div>
        <div class="hsp-tool-card-desc">${L ? '根據日本官方積分表，估算你的高度專門職資格分數。' : 'Estimate your Highly Skilled Professional visa points based on the official scoring table.'}</div>
      </div>
      <a href="/visa/hsp-calculator/" class="hsp-tool-card-btn">${L ? '開始試算 →' : 'Calculate →'}</a>
    </div>`;
  }
```

### 2-E 修改 filterAndRender() — 注入工具卡

找到 `filterAndRender()` 內的三個 `visaArticlesGrid.innerHTML` 賦值點，改為在最前面加上 `buildHspToolCard(lang) +`。

**改前（三處分別）：**

```javascript
      if (gridArticles.length) {
        document.getElementById('visaArticlesGrid').innerHTML = gridArticles.map(a => sbCardHTML(a)).join('');
      } else if (articles.length) {
        /* Sub-cat exists but no articles yet */
        document.getElementById('visaArticlesGrid').innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--ink-3);">
            <div style="font-size:36px;margin-bottom:12px;">📭</div>
            <div style="font-size:15px;font-weight:500;">${lang === 'tc' ? '這個分類暫時沒有文章' : 'No articles in this sub-category yet'}</div>
          </div>`;
      } else {
        /* No Supabase articles at all — fallback to static data */
        document.getElementById('visaArticlesGrid').innerHTML = D.visa_articles.map(a => C.cardHTML(a)).join('');
      }
```

**改後：**

```javascript
      const toolCard = buildHspToolCard(lang);
      if (gridArticles.length) {
        document.getElementById('visaArticlesGrid').innerHTML = toolCard + gridArticles.map(a => sbCardHTML(a)).join('');
      } else if (articles.length) {
        /* Sub-cat exists but no articles yet */
        document.getElementById('visaArticlesGrid').innerHTML = toolCard + `
          <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--ink-3);">
            <div style="font-size:36px;margin-bottom:12px;">📭</div>
            <div style="font-size:15px;font-weight:500;">${lang === 'tc' ? '這個分類暫時沒有文章' : 'No articles in this sub-category yet'}</div>
          </div>`;
      } else {
        /* No Supabase articles at all — fallback to static data */
        document.getElementById('visaArticlesGrid').innerHTML = toolCard + D.visa_articles.map(a => C.cardHTML(a)).join('');
      }
```

- [ ] **步驟 1：執行 2-A、2-B、2-C — 移除舊計算器**（三個刪除操作）

- [ ] **步驟 2：執行 2-D — 插入 buildHspToolCard() 函數**

- [ ] **步驟 3：執行 2-E — 修改 filterAndRender()**

- [ ] **步驟 4：驗證 visa/index.html 不再含有計算器殘留**

```bash
grep -n "hspCalculator\|hsp-calculator\.js\|updateHspI18n\|hspCalcTitle" /Users/kit/Desktop/Isshohub/visa/index.html
# 預期：無輸出（0 match）
```

並驗證工具卡函數存在：
```bash
grep -n "buildHspToolCard\|hsp-tool-card" /Users/kit/Desktop/Isshohub/visa/index.html
# 預期：至少 2 行（函數定義 + filterAndRender 呼叫）
```

- [ ] **步驟 5：Commit**

```bash
cd /Users/kit/Desktop/Isshohub
git add visa/index.html
git commit -m "feat: visa 頁移除計算器 section，改為工具卡入口"
```

---

## 任務 3：新增 /visa/hsp-calculator/index.html

**檔案：**
- 新增：`visa/hsp-calculator/index.html`

- [ ] **步驟 1：建立目錄並建立頁面**

```bash
mkdir -p /Users/kit/Desktop/Isshohub/visa/hsp-calculator
```

建立 `visa/hsp-calculator/index.html`，完整內容如下：

```html
<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>高度專門職積分試算 — IsshoHub</title>
<meta name="description" content="根據日本出入國在留管理廳官方積分表，線上估算高度専門職 (i) 三條路徑的資格分數。" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@400;500;600;700&family=Shippori+Mincho:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Zen+Old+Mincho:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/styles.css?v=9">

<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><circle cx='40' cy='40' r='36' fill='%230d2444'/><path d='M 40 8 A 32 32 0 0 1 40 72' stroke='%23d9b683' stroke-width='4' fill='none' stroke-linecap='round'/><text x='40' y='48' text-anchor='middle' font-family='Zen Old Mincho, Shippori Mincho, serif' font-size='26' fill='%23f6f3ec' letter-spacing='-1'>%E4%B8%80</text></svg>">

<style>
  .brand .brand-mark,
  .footer-brand .brand-mark,
  .modal-brand .brand-mark,
  .mobile-menu-head .brand-mark {
    background: transparent !important; border: 0 !important; padding: 0 !important;
    color: inherit !important; font-size: 0 !important; line-height: 0 !important;
    width: auto !important; height: auto !important; box-shadow: none !important;
    border-radius: 0 !important; overflow: visible !important;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .brand .brand-mark svg,
  .footer-brand .brand-mark svg,
  .modal-brand .brand-mark svg,
  .mobile-menu-head .brand-mark svg { display: block; width: 38px; height: 38px; }
  .modal-brand .brand-mark svg { width: 44px; height: 44px; }
  .footer-brand .brand-mark svg { width: 42px; height: 42px; }
  .brand-name .hub { color: #a8762f; }
  a.brand, a.brand:hover { text-decoration: none !important; }
  .footer-brand .brand-name .hub { color: #d9b683; }
</style>
</head>
<body>

<!-- =============== ADMIN BAR =============== -->
<div class="admin-bar" id="adminBar" style="display:none">
  <span class="admin-bar-user" id="adminBarUser"></span>
  <div class="admin-bar-actions">
    <a class="admin-btn" href="/admin/"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg> 文章管理</a>
  </div>
</div>

<!-- =============== TOP BAR =============== -->
<div class="topbar">
  <div class="container row">
    <div class="ticker">
      <span data-i18n="ticker1"></span>
      <span data-i18n="ticker2"></span>
    </div>
    <div class="meta">
      <span id="eqTopbar" style="display:none"></span>
      <span class="eq-topbar-sep" style="display:none">·</span>
      <span data-i18n="ticker-rate" id="tickerRate"></span>
    </div>
  </div>
</div>

<!-- =============== NAV =============== -->
<nav class="nav">
  <div class="container row">
    <a class="brand" href="/" style="text-decoration:none;outline:none;">
      <div class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="36" fill="#0d2444"/><path d="M 40 8 A 32 32 0 0 1 40 72" stroke="#d9b683" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="40" y="46" text-anchor="middle" font-family="Zen Old Mincho, Shippori Mincho, serif" font-size="22" font-weight="500" fill="#f6f3ec" letter-spacing="-1">一緒</text></svg>
      </div>
      <div>
        <div class="brand-name">Issho<span class="hub">Hub</span></div>
        <div class="brand-tag">In Japan, together.</div>
      </div>
    </a>
    <div class="nav-links" id="navLinks"></div>
    <div class="nav-right">
      <button class="search-btn" aria-label="Search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      </button>
      <div class="lang-toggle" id="langToggle">
        <button data-lang-set="tc">繁中</button>
        <button data-lang-set="en">EN</button>
      </div>
      <button class="btn-login" data-open-login>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        <span data-i18n="login_btn"></span>
      </button>
      <div class="user-menu" data-user-menu style="display:none">
        <button class="user-menu-btn" id="userMenuBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          <span data-user-name></span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="user-dropdown" id="userDropdown">
          <a href="/bookmarks/">我的收藏</a>
          <a href="#">帳號設定</a>
          <div class="user-dropdown-divider"></div>
          <a href="#" data-sign-out>登出</a>
        </div>
      </div>
      <button class="menu-btn" id="menuBtn" aria-label="Menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
    </div>
  </div>
  <div class="catstrip" id="catstrip"></div>
</nav>

<!-- =============== MOBILE MENU =============== -->
<div class="mobile-menu" id="mobileMenu">
  <div class="mobile-menu-overlay" id="mobileMenuOverlay"></div>
  <div class="mobile-menu-drawer">
    <div class="mobile-menu-head">
      <a class="brand" href="/" style="color:var(--navy-ink);text-decoration:none;outline:none;">
        <div class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="36" fill="#0d2444"/><path d="M 40 8 A 32 32 0 0 1 40 72" stroke="#d9b683" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="40" y="46" text-anchor="middle" font-family="Zen Old Mincho, Shippori Mincho, serif" font-size="22" font-weight="500" fill="#f6f3ec" letter-spacing="-1">一緒</text></svg>
        </div>
        <div>
          <div class="brand-name">Issho<span class="hub">Hub</span></div>
          <div class="brand-tag">In Japan, together.</div>
        </div>
      </a>
      <button class="mobile-menu-close" id="mobileMenuClose">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <nav class="mobile-nav-list" id="mobileNavList"></nav>
    <div class="mobile-menu-footer">
      <div class="lang-toggle" id="mobileLangToggle">
        <button data-lang-set="tc">繁中</button>
        <button data-lang-set="en">EN</button>
      </div>
    </div>
  </div>
</div>

<!-- =============== PAGE HERO =============== -->
<section class="hsp-page-hero">
  <div class="container">
    <div class="hsp-page-breadcrumb">
      <a href="/" id="breadHome">首頁</a>
      <span class="hsp-page-breadcrumb-sep">›</span>
      <a href="/visa/" id="breadVisa">簽證・在留資格</a>
      <span class="hsp-page-breadcrumb-sep">›</span>
      <span id="breadCurrent">高度專門職積分試算</span>
    </div>
    <h1 class="hsp-page-title" id="hspPageTitle">高度專門職積分試算</h1>
    <p class="hsp-page-sub" id="hspPageSub">根據官方積分表，初步估算你的高度專門職資格分數。</p>
  </div>
</section>

<!-- =============== CALCULATOR =============== -->
<section class="hsp-page-calc-section">
  <div class="container">
    <div id="hspCalculator" class="hsp-calculator"></div>
  </div>
</section>

<!-- =============== FOOTER =============== -->
<footer class="footer">
  <div class="container">
    <div class="grid">
      <div class="footer-brand">
        <div class="brand">
          <div class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="36" fill="#f6f3ec"/><path d="M 40 8 A 32 32 0 0 1 40 72" stroke="#a8762f" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="40" y="46" text-anchor="middle" font-family="Zen Old Mincho, Shippori Mincho, serif" font-size="22" font-weight="500" fill="#0d2444" letter-spacing="-1">一緒</text></svg>
          </div>
          <div>
            <div class="brand-name" style="color:#fff;">Issho<span class="hub">Hub</span></div>
            <div class="brand-tag" style="color:rgba(255,255,255,0.45);">In Japan, together.</div>
          </div>
        </div>
        <p data-i18n="footer_about"></p>
        <div class="footer-socials">
          <a href="#" aria-label="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 01-1.38-.9 3.72 3.72 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 5.84a4 4 0 100 8 4 4 0 000-8zm5.2-.4a.96.96 0 110 1.92.96.96 0 010-1.92zM12 9.6a2.4 2.4 0 110 4.8 2.4 2.4 0 010-4.8z"/></svg></a>
          <a href="#" aria-label="Twitter / X"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 3h3.4l-7.4 8.4L23.5 21h-6.8l-5.3-6.9L5.3 21H1.9l7.9-9L1 3h7l4.8 6.4L18.9 3zm-1.2 16h1.9L7.4 5H5.4l12.3 14z"/></svg></a>
          <a href="#" aria-label="YouTube"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.3c-.3-1-1-1.8-2-2.1C19.1 4.7 12 4.7 12 4.7s-7.1 0-9 .5c-1 .3-1.8 1-2.1 2.1C.4 9.2.4 12 .4 12s0 2.8.5 4.7c.3 1 1 1.8 2.1 2.1 1.9.5 9 .5 9 .5s7.1 0 9-.5c1-.3 1.8-1 2.1-2.1.5-1.9.5-4.7.5-4.7s0-2.8-.6-4.7zM9.7 15.5V8.5l6 3.5-6 3.5z"/></svg></a>
          <a href="#" aria-label="LINE"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C5.37 2 0 6.36 0 11.74c0 4.82 4.24 8.86 9.97 9.63.39.08.92.26 1.05.6.12.3.08.79.04 1.08L11 24c-.05.32-.25 1.23 1.09.67 1.34-.57 7.22-4.26 9.85-7.28C23.73 15.4 24 13.6 24 11.74 24 6.36 18.63 2 12 2z"/></svg></a>
        </div>
      </div>
      <div class="footer-col">
        <h5 data-i18n="footer_col1"></h5>
        <div id="footerExplore"></div>
      </div>
      <div class="footer-col">
        <h5 data-i18n="footer_col2"></h5>
        <a href="#" data-i18n="footer_r1"></a>
        <a href="#" data-i18n="footer_r2"></a>
        <a href="#" data-i18n="footer_r3"></a>
        <a href="#" data-i18n="footer_r4"></a>
        <a href="#" data-i18n="footer_r5"></a>
      </div>
      <div class="footer-col">
        <h5 data-i18n="footer_col3"></h5>
        <a href="#" data-i18n="footer_a1"></a>
        <a href="#" data-i18n="footer_a2"></a>
        <a href="#" data-i18n="footer_a3"></a>
        <a href="#" data-i18n="footer_a4"></a>
        <a href="#" data-i18n="footer_a5"></a>
      </div>
    </div>
    <div class="footer-bottom">
      <div>© 2026 IsshoHub · 一緒 · Made with care in Japan</div>
      <div><span data-i18n="footer_lang"></span> / English</div>
    </div>
  </div>
</footer>

<!-- =============== LOGIN MODAL =============== -->
<div class="modal-overlay" id="loginModal" style="display:none" aria-hidden="true">
  <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <button class="modal-close" id="modalClose" aria-label="Close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <div class="modal-brand">
      <div class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="36" fill="#0d2444"/><path d="M 40 8 A 32 32 0 0 1 40 72" stroke="#d9b683" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="40" y="46" text-anchor="middle" font-family="Zen Old Mincho, Shippori Mincho, serif" font-size="22" font-weight="500" fill="#f6f3ec" letter-spacing="-1">一緒</text></svg>
      </div>
      <div class="brand-name">Issho<span class="hub">Hub</span></div>
    </div>
    <div class="modal-tabs">
      <button class="modal-tab active" data-tab-btn="login" data-i18n="tab_login"></button>
      <button class="modal-tab" data-tab-btn="signup" data-i18n="tab_signup"></button>
    </div>
    <h2 class="modal-title" id="modalTitle" data-i18n="login_title"></h2>
    <div data-tab="login">
      <form class="login-form" id="loginForm">
        <div class="form-group"><label data-i18n="login_email"></label><input type="email" name="email" placeholder="your@email.com" autocomplete="email" required /></div>
        <div class="form-group"><label data-i18n="login_password"></label><input type="password" name="password" placeholder="••••••••" autocomplete="current-password" required /></div>
        <div class="form-row"><label class="checkbox-label"><input type="checkbox" name="remember"> <span data-i18n="remember_me"></span></label><a href="#" data-tab-btn="forgot" data-i18n="forgot_link"></a></div>
        <button type="submit" class="btn-submit" data-i18n="login_submit"></button>
      </form>
      <div class="modal-footer"><span data-i18n="no_account"></span> <a href="#" data-tab-btn="signup" data-i18n="signup_link"></a></div>
    </div>
    <div data-tab="signup" style="display:none">
      <form class="login-form" id="signupForm">
        <div class="form-group"><label data-i18n="signup_name"></label><input type="text" name="name" placeholder="Your name" autocomplete="name" required /></div>
        <div class="form-group"><label data-i18n="login_email"></label><input type="email" name="email" placeholder="your@email.com" autocomplete="email" required /></div>
        <div class="form-group"><label data-i18n="login_password"></label><input type="password" name="password" placeholder="••••••••" autocomplete="new-password" required /></div>
        <button type="submit" class="btn-submit" data-i18n="signup_submit"></button>
      </form>
    </div>
    <div data-tab="forgot" style="display:none">
      <p class="modal-sub" data-i18n="forgot_sub"></p>
      <form class="login-form" id="forgotForm">
        <div class="form-group"><label data-i18n="login_email"></label><input type="email" name="email" placeholder="your@email.com" autocomplete="email" required /></div>
        <button type="submit" class="btn-submit" data-i18n="forgot_submit"></button>
      </form>
      <div class="modal-footer"><a href="#" data-tab-btn="login" data-i18n="back_to_login"></a></div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="/assets/js/data.js?v=4"></script>
<script src="/assets/js/supabase-client.js?v=7"></script>
<script src="/assets/js/core.js?v=9"></script>
<script src="/assets/js/hsp-calculator.js?v=1"></script>
<script>
(function () {
  const C = window.IsshoCore;
  C.init('visa');

  /* ── 頁面雙語 ── */
  function setLang() {
    const lang = C.getLang();
    const L = lang === 'tc';
    const els = {
      breadHome:    [L ? '首頁'           : 'Home'],
      breadVisa:    [L ? '簽證・在留資格' : 'Visa & Residency'],
      breadCurrent: [L ? '高度專門職積分試算' : 'HSP Points Calculator'],
      hspPageTitle: [L ? '高度專門職積分試算' : 'HSP Points Calculator'],
      hspPageSub:   [L ? '根據官方積分表，初步估算你的高度專門職資格分數。' : 'Estimate your Highly Skilled Professional visa points based on the official scoring table.'],
    };
    Object.keys(els).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = els[id][0];
    });
  }
  setLang();
  C.onLangChange(setLang);
})();
</script>
</body>
</html>
```

- [ ] **步驟 2：驗證頁面結構**

```bash
grep -c "hspCalculator\|hsp-calculator\.js\|hsp-page-hero\|hspPageTitle" /Users/kit/Desktop/Isshohub/visa/hsp-calculator/index.html
# 預期：4（各 1 處）
```

- [ ] **步驟 3：Commit**

```bash
cd /Users/kit/Desktop/Isshohub
git add visa/hsp-calculator/index.html
git commit -m "feat: 新增 /visa/hsp-calculator/ 獨立工具頁"
```

---

## 任務 4：整合驗證與推送

- [ ] **步驟 1：本地驗證 visa/index.html**

| 項目 | 預期 |
|------|------|
| 頁面載入後，文章 grid 頂部出現深藍色工具卡 | ✓ |
| 工具卡「開始試算 →」按鈕連結到 `/visa/hsp-calculator/` | ✓ |
| 切換 subcat tab 至任意分類，工具卡仍顯示 | ✓ |
| 切換語言，工具卡文字立即更新 | ✓ |
| 舊的計算器 section 不再出現 | ✓ |

- [ ] **步驟 2：本地驗證 /visa/hsp-calculator/**

| 項目 | 預期 |
|------|------|
| 深藍色 hero，breadcrumb 正確顯示 | ✓ |
| 計算器正常渲染（路徑選擇器、問題區、分數欄） | ✓ |
| 「查看結果」正常運作 | ✓ |
| 切換語言，所有文字更新（含計算器內文） | ✓ |
| 手機版分數欄固定在底部 | ✓ |
| DevTools console 無 JS 錯誤 | ✓ |

- [ ] **步驟 3：git push**

```bash
git push
```

---

## 自檢結果

**規格覆蓋度：**
- ✓ visa/index.html 移除全寬計算器 section（任務 2-A）
- ✓ 移除 script tag 與 i18n IIFE（任務 2-B、2-C）
- ✓ 工具卡永遠顯示（所有 articles 分支均注入）（任務 2-D、2-E）
- ✓ 工具卡雙語（任務 2-D）
- ✓ 工具卡 CSS（任務 1）
- ✓ 獨立工具頁 `/visa/hsp-calculator/`（任務 3）
- ✓ 頁面 hero CSS（任務 1）
- ✓ 雙語支援（任務 3 inline script）
- ✓ SEO meta（任務 3 head）
- ✓ styles.css v=9（任務 1）

**占位符：** 無

**類型一致性：** `buildHspToolCard(lang)` 接受 `lang` 字串並回傳 HTML 字串，與 `filterAndRender()` 中使用 `getLang()` 取得 `lang` 的模式一致。
