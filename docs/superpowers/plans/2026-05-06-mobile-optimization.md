# IsshoHub 手機版排版優化 實現計劃

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推薦）或 superpowers:executing-plans 逐任務實現此計劃。步驟使用複選框（`- [ ]`）語法來跟蹤進度。

**目標：** 在現有靜態 HTML/CSS 基礎上，對照 React 設計原型，改善手機版視覺體驗——不改架構、不引入框架。

**架構：** 所有更改集中在 `assets/css/styles.css`，以 `@media (max-width: ...)` 的 mobile-first 覆蓋方式加入手機版專用樣式，不刪除現有桌面版 CSS。每個任務獨立 commit，改完即可在瀏覽器手機模擬器中 hard-refresh 驗證。

**技術棧：** 純 CSS（media queries, flexbox, aspect-ratio, overflow scroll）

---

## 改動範圍

**唯一修改的文件：** `assets/css/styles.css`

每個任務直接在文件末尾追加一個注釋標頭 + 新的 `@media (max-width: ...)` 規則。  
⚠️ 不要修改現有行，只追加新規則。現有行已有完整的桌面版樣式，覆蓋值只在 max-width 範圍內生效。

---

## 任務 1：Nav 手機版高度收緊

**文件：** 修改 `assets/css/styles.css`（追加）

**背景：** 現有 nav `.row` height = 68px（桌面適中）。設計原型手機版 nav height = 58px，更緊湊。同時桌面版已有 `backdrop-filter: blur(12px)` ✅，無需改動。

- [ ] **步驟 1：在 styles.css 末尾追加以下 CSS**

```css
/* ============ MOBILE OPTIMIZATIONS ============ */

/* Task 1: Nav compact on mobile */
@media (max-width: 1099px) {
  .nav .row { height: 58px; }
}
```

- [ ] **步驟 2：在瀏覽器 DevTools 手機模式（375px / 390px）驗證**

預期：Nav 高度從 68px 減少到 58px，logo 和按鈕仍垂直居中。

- [ ] **步驟 3：Commit**

```bash
cd /Users/kit/Desktop/Isshohub
git add assets/css/styles.css
git commit -m "style(mobile): nav 手機版高度縮減至 58px"
git push
```

---

## 任務 2：Hero 主圖手機版改為縱向比例

**文件：** 修改 `assets/css/styles.css`（追加）

**背景：** 現有 `.hero-main` 預設 `aspect-ratio: 16/11; min-height: 380px`。在 390px 寬的手機，16/11 ratio = ~268px 高，但 min-height 把它撐到 380px 且不是純比例。設計原型要求 `aspect-ratio: 4/5`（縱向），手機 390px → ~488px 高，更有衝擊力。

- [ ] **步驟 1：在 styles.css 末尾（Task 1 之後）追加**

```css
/* Task 2: Hero portrait ratio on mobile */
@media (max-width: 639px) {
  .hero-main {
    aspect-ratio: 4 / 5;
    min-height: unset;
  }
  .hero-body { padding: 20px; }
  .hero-title { font-size: clamp(22px, 5.5vw, 28px); }
  .hero-sub { font-size: 13.5px; margin-bottom: 12px; }
}
```

- [ ] **步驟 2：驗證**

在 DevTools 375px 模式下，Hero 主圖應呈縱向長方形（高 > 寬），標題和說明文字仍清晰可讀。

- [ ] **步驟 3：Commit**

```bash
git add assets/css/styles.css
git commit -m "style(mobile): hero 主圖改縱向比例 4:5"
git push
```

---

## 任務 3：Hero Side Cards 手機版 2 欄精簡

**文件：** 修改 `assets/css/styles.css`（追加）

**背景：** `.hero-side` 在手機上是 3 張縱向堆疊的卡片（`.side-card`），每張 96×96 縮圖 + 文字。在主圖之後堆 3 張完整卡片視覺上很重。改為 2 欄 grid 且縮小縮圖，更緊湊。

- [ ] **步驟 1：追加**

```css
/* Task 3: Hero side cards 2-column on mobile */
@media (max-width: 639px) {
  .hero-side {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .side-card {
    flex-direction: column;
    gap: 10px;
    padding: 12px;
  }
  .side-thumb {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }
  .side-title { font-size: 13.5px; }
  .side-meta { font-size: 11px; }
}
```

- [ ] **步驟 2：驗證**

手機版 Hero 主圖下方出現 2 欄卡片，不是 3 張全寬堆疊。縮圖為 16:9 橫向。

- [ ] **步驟 3：Commit**

```bash
git add assets/css/styles.css
git commit -m "style(mobile): hero side cards 改 2 欄緊湊版面"
git push
```

---

## 任務 4：分類 Grid 手機版改為橫向滾動

**文件：** 修改 `assets/css/styles.css`（追加）

**背景：** 現有 `.cats` 在手機上是 2 欄 grid（每欄各佔一半寬度）。設計原型要求橫向滾動的分類 tile rail（78px 寬）。改動讓分類區在手機上變成一排可橫滑的 icon tiles。

`.cat-section` 是 `background: var(--navy)` 深色背景，`.cats` 內部有 `background: rgba(255,255,255,.08)` 分隔線。改為橫滑後把 grid 的 border/background 移除，改為 flex。

- [ ] **步驟 1：追加**

```css
/* Task 4: Category grid → horizontal scroll on mobile */
@media (max-width: 639px) {
  .cat-section { padding: 44px 0 52px; }

  .cats {
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    gap: 8px;
    background: transparent;
    border: none;
    border-radius: 0;
    margin-top: 24px;
    /* bleed to container edges for full-width scroll */
    margin-left: -20px;
    margin-right: -20px;
    padding-left: 20px;
    padding-right: 20px;
    padding-bottom: 4px;
  }
  .cats::-webkit-scrollbar { display: none; }

  .cat {
    flex-shrink: 0;
    width: 78px;
    padding: 12px 4px 10px;
    background: rgba(255,255,255,0.05);
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    gap: 8px;
  }
  .cat:hover { background: rgba(217,182,131,0.12); }

  .cat-icon {
    width: 48px; height: 48px;
    border-radius: 12px;
    box-shadow: 0 4px 12px -4px rgba(13,36,68,0.35);
  }
  .cat-icon svg { width: 22px; height: 22px; }

  .cat-label-tc { font-size: 11px; }
  .cat-label-en { display: none; }
  .cat-count { display: none; }

  /* Disable hover popover on mobile (tap to navigate instead) */
  .cat.has-sub:hover .cat-popover { opacity: 0; pointer-events: none; }
}
```

- [ ] **步驟 2：驗證**

手機版分類區顯示一排 78px 寬的縱向 icon tile，可左右滑動，不換行。

- [ ] **步驟 3：Commit**

```bash
git add assets/css/styles.css
git commit -m "style(mobile): 分類 grid 改橫向滾動 tile rail"
git push
```

---

## 任務 5：Article Cards 手機版改為橫向排列

**文件：** 修改 `assets/css/styles.css`（追加）

**背景：** 現有手機版文章卡片是完整縱向卡片（圖片 16:10 在上，文字在下）。設計原型要求橫向佈局：104×104 正方形縮圖在左，標題 + meta 在右。僅對普通 `.card`（非 `.featured`、非 `.overlay`）生效。

- [ ] **步驟 1：追加**

```css
/* Task 5: Article cards horizontal layout on mobile */
@media (max-width: 719px) {
  .article-grid { gap: 10px; }

  /* Horizontal card: thumb left, body right */
  .card:not(.featured):not(.overlay) {
    flex-direction: row;
    align-items: stretch;
  }
  .card:not(.featured):not(.overlay) .card-media {
    width: 104px;
    min-width: 104px;
    aspect-ratio: 1 / 1;
    border-radius: var(--r-lg) 0 0 var(--r-lg);
    flex-shrink: 0;
  }
  .card:not(.featured):not(.overlay) .card-tag {
    font-size: 9.5px;
    padding: 3px 7px;
    left: 8px; top: 8px;
  }
  .card:not(.featured):not(.overlay) .card-body {
    padding: 12px 14px;
    gap: 5px;
    justify-content: center;
  }
  .card:not(.featured):not(.overlay) .card-title {
    font-size: 14px;
    line-height: 1.38;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card:not(.featured):not(.overlay) .card-excerpt { display: none; }
  .card:not(.featured):not(.overlay) .card-meta {
    padding-top: 8px;
    font-size: 10.5px;
  }

  /* Keep featured card vertical on mobile but compact */
  .card.featured { flex-direction: column; }
  .card.featured .card-media { aspect-ratio: 16 / 9; min-height: unset; flex: none; width: 100%; }
  .card.featured .card-body { padding: 16px; }
  .card.featured .card-title { font-size: 18px; }
}
```

- [ ] **步驟 2：驗證**

手機版文章列表：普通卡片變為橫向（縮圖左，文字右）。Featured 大卡維持縱向但縮小。Overlay 卡片不受影響。

- [ ] **步驟 3：Commit**

```bash
git add assets/css/styles.css
git commit -m "style(mobile): article card 改橫向排列"
git push
```

---

## 任務 6：Hot Search 手機版縱向排列

**文件：** 修改 `assets/css/styles.css`（追加）

**背景：** 現有 `.hotsearch-inner` 是 `flex-wrap: wrap`，label 和 pills 在手機上會換行但 label 仍有右邊框。改為在手機上縱向排列，label 在上、pills 在下，視覺更整潔。

- [ ] **步驟 1：追加**

```css
/* Task 6: Hot search vertical layout on mobile */
@media (max-width: 639px) {
  .hotsearch-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
  }
  .hotsearch-label {
    border-right: none;
    border-bottom: 1px solid var(--line);
    padding-right: 0;
    padding-bottom: 10px;
    width: 100%;
    font-size: 11px;
  }
  .hot-pills { gap: 6px; }
  .pill { font-size: 12px; padding: 6px 10px; }
}
```

- [ ] **步驟 2：驗證**

手機版熱門搜尋：「🔻 熱門搜尋」標籤在上，pills 在下並排。不再有奇怪的 wrap。

- [ ] **步驟 3：Commit**

```bash
git add assets/css/styles.css
git commit -m "style(mobile): hot search 改縱向排列"
git push
```

---

## 自檢

**規格覆蓋度：**
- [x] Nav 高度 → Task 1
- [x] Hero 縱向比例 → Task 2
- [x] Hero side cards 精簡 → Task 3
- [x] 分類橫滑 → Task 4
- [x] Article card 橫向 → Task 5
- [x] Hot search 縱向 → Task 6
- [x] Nav backdrop-blur → 已有 ✅ 無需改動
- [x] Design tokens → 現有變量已對齊設計，無需改動
- [x] 底部 Tab Bar → 架構限制，不在範圍內

**占位符掃描：** 無 TODO / 待定項目。

**一致性：** 所有任務只追加 CSS，不修改現有行，無衝突風險。
