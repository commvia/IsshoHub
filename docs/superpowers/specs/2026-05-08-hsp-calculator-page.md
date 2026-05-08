# 高度專門職積分試算器 — 獨立工具頁設計規格

**目標：** 將積分試算器從 `visa/index.html` 的全寬 section 移出，改為在文章 grid 頂部放置一張工具卡，並建立獨立工具頁 `/visa/hsp-calculator/`，讓訪客與文章連結均可直接進入。

**架構：** 純前端 Vanilla JS，無後端。新增 `visa/hsp-calculator/index.html`；修改 `visa/index.html` 的 JS 渲染邏輯，注入工具卡；複用現有 `hsp-calculator.js`。

**技術棧：** HTML + CSS + Vanilla JS（ES5 compatible），`IsshoCore.getLang()` / `IsshoCore.onLangChange()`

---

## 變更範圍

| 檔案 | 類型 | 說明 |
|------|------|------|
| `visa/index.html` | 修改 | 移除 `#hsp` 計算器 section；注入工具卡 HTML/JS |
| `visa/hsp-calculator/index.html` | 新增 | 獨立工具頁，含完整試算器 |
| `assets/css/styles.css` | 追加 | 工具卡樣式 |

`hsp-calculator.js` 不需改動。

---

## 一、visa/index.html 修改

### 1-A 移除完整計算器 section

刪除以下區塊（約 12 行）：

```html
<!-- =============== HSP CALCULATOR =============== -->
<section class="section hsp-calc-section" id="hsp">
  ...
</section>
```

同時移除頁底 inline script 內的 HSP i18n IIFE（`updateHspI18n`）。

移除 `hsp-calculator.js?v=1` 的 script tag（獨立頁才需要）。

### 1-B 工具卡注入邏輯

在 `filterAndRender()` 函數中，於渲染 `#visaArticlesGrid` 之前，**永遠**在文章 HTML 開頭插入一張工具卡：

```javascript
const toolCardHTML = buildHspToolCard(lang);
document.getElementById('visaArticlesGrid').innerHTML = toolCardHTML + gridArticles.map(...).join('');
```

工具卡**永遠顯示**，不論 `activeSub` 為何，確保所有訪客都能看到入口。

### 1-C 工具卡 HTML 結構

```html
<div class="hsp-tool-card">
  <div class="hsp-tool-card-icon">⬡</div>
  <div class="hsp-tool-card-body">
    <div class="hsp-tool-card-tag">工具 · Tool</div>
    <div class="hsp-tool-card-title">高度專門職積分試算 / HSP Points Calculator</div>
    <div class="hsp-tool-card-desc">
      （繁中）根據日本官方積分表，估算你的高度專門職資格分數。
      （英文）Estimate your Highly Skilled Professional visa points.
    </div>
  </div>
  <a href="/visa/hsp-calculator/" class="hsp-tool-card-btn">
    開始試算 →
  </a>
</div>
```

雙語：`buildHspToolCard(lang)` 函數依 `lang` 輸出對應文字。卡片跨越整個 grid 寬度（`grid-column: 1 / -1`）。

---

## 二、新頁面 `/visa/hsp-calculator/index.html`

### 頁面架構

複用 visa 頁面的 nav / footer shell，重新建立以下主要內容區：

```
[Nav]
[簡版 Hero — 深藍底，無背景圖]
  Breadcrumb: 首頁 › 簽證 › 高度專門職積分試算
  標題：高度專門職積分試算
  副標：根據官方積分表，初步估算你的高度專門職資格分數。
[計算器 section]
  <div id="hspCalculator" class="hsp-calculator"></div>
[Footer]
```

### 資源載入

```html
<link rel="stylesheet" href="/assets/css/styles.css?v=8">
<script src="/assets/js/data.js?v=4"></script>
<script src="/assets/js/core.js?v=9"></script>
<script src="/assets/js/hsp-calculator.js?v=1"></script>
```

`hsp-calculator.js` 的 `init()` 在 DOMContentLoaded 自動掛載 `#hspCalculator`，無需額外 JS。

### 雙語支援

頁面標題與副標題元素加上固定 `id`，由底部 inline script 的 i18n IIFE 處理語言切換（與舊 `visa/index.html` 相同邏輯）。

### SEO

```html
<title>高度專門職積分試算 — IsshoHub</title>
<meta name="description" content="根據日本出入國在留管理廳官方積分表，線上估算高度専門職 (i) 三條路徑的資格分數。">
```

---

## 三、工具卡 CSS

追加至 `styles.css` 末尾：

```css
/* HSP Tool Card (visa index) */
.hsp-tool-card {
  grid-column: 1 / -1;
  display: flex; align-items: center; gap: 20px;
  background: var(--navy-ink, #0d2444); color: #fff;
  border-radius: var(--r-lg, 16px); padding: 20px 24px;
  margin-bottom: 4px; text-decoration: none;
}
.hsp-tool-card-icon {
  font-size: 32px; flex-shrink: 0;
  width: 56px; height: 56px;
  background: rgba(217,182,131,.15);
  border: 1px solid rgba(217,182,131,.3);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #d9b683;
}
.hsp-tool-card-body { flex: 1; min-width: 0; }
.hsp-tool-card-tag { font-size: 10px; letter-spacing: .14em; color: #d9b683; margin-bottom: 4px; }
.hsp-tool-card-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.hsp-tool-card-desc { font-size: 13px; opacity: .7; }
.hsp-tool-card-btn {
  flex-shrink: 0; padding: 10px 20px; border-radius: 8px;
  background: #d9b683; color: var(--navy-ink, #0d2444);
  font-size: 13px; font-weight: 700; white-space: nowrap;
  text-decoration: none; transition: opacity .15s;
}
.hsp-tool-card-btn:hover { opacity: .85; }

@media (max-width: 600px) {
  .hsp-tool-card { flex-wrap: wrap; }
  .hsp-tool-card-btn { width: 100%; text-align: center; }
}
```

---

## 免責聲明

`/visa/hsp-calculator/` 頁面底部計算器下方顯示：
「本試算器僅供參考，實際資格以入國管理局審核為準。」（由 `hsp-calculator.js` 的 `buildHTML()` 自動渲染，無需額外處理。）
