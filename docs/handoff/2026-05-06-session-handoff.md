# IsshoHub — Session Handoff（2026-05-06）

> 給新 chatroom 的 AI：這是 IsshoHub 專案的接力文件，讓你不需要用戶重新解釋。

---

## 專案概覽

**IsshoHub** — 面向香港/台灣人移居日本的雙語資訊網站（繁中/英）

- **Hosting**：Cloudflare Pages（SSG + 動態 Supabase 資料）
- **Backend**：Supabase（PostgreSQL）
- **Frontend**：純 HTML + 純 JavaScript（無框架）
- **Repo**：GitHub → `commvia/IsshoHub`（main branch）
- **本地路徑**：`/Users/kit/Desktop/Isshohub/`

**自動部署規則**：每次 `git push` → Cloudflare Pages 自動重 build（GitHub 整合已設定）

---

## 重要檔案地圖

| 檔案 | 用途 |
|------|------|
| `assets/js/supabase-client.js` | Supabase client + 所有 API 函式（`IsshoAuth`、`IsshoAPI`） |
| `assets/js/article-editor.js` | Admin 文章編輯器（含副分類多選、儲存、Deploy Hook） |
| `assets/js/category-page.js` | 分類頁通用控制器（`IsshoCategory.init(key)`） |
| `assets/js/data.js` | 靜態導航資料（`ISSHO_DATA.nav`），副分類 key 來源 |
| `assets/css/styles.css` | 全站樣式 |
| `visa/index.html` | 簽證分類頁靜態 HTML（有自己的 inline JS） |
| `build.js` | SSG build 腳本（生成文章靜態頁） |
| `index.html` | 主頁 |

---

## Supabase 資料結構（articles 表）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `category_key` | text | 主分類（如 `"visa"`） |
| `category_keys` | text[] | 所有主分類（跨收錄用） |
| `sub_category_key` | text | **舊欄位**，單一副分類（backward compat） |
| `sub_category_keys` | text[] | **新欄位**，多副分類陣列（如 `["policy","wh"]`） |

副分類 key 來自 `data.js` nav 的 URL hash：  
例如 `/visa/#wh` → key = `wh`，`/visa/#business-manager` → key = `business-manager`

---

## 本次已完成的功能

### 1. Cloudflare Pages SSG 設定
- Build command：`npm install && node build.js`
- Output directory：`/`（根目錄）
- 環境變數：`SUPABASE_URL`、`SUPABASE_SERVICE_KEY`、`SITE_URL`

### 2. 自動 Deploy Hook
每次 Admin 發佈文章 → 自動 POST 到 Cloudflare webhook，觸發重 build：
```javascript
// 在 article-editor.js saveArticle() 函式末尾
fetch('https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/21a8d5a7-e3ee-4b66-acc6-84135738d99f', { method: 'POST' }).catch(() => {});
```

### 3. 多副分類收錄功能（✅ 已完成）
**需求**：一篇文章可同時收錄到多個副分類（同一或跨主分類）

**實作：**
- `article-editor.js`：副分類改為 checkbox 多選 UI（`renderSubCatCheckboxes()`）
- `supabase-client.js`：`fetchAllArticles()` 加入 `sub_category_keys` 欄位
- `category-page.js`：加入 `articleHasSub()` helper，支援新舊欄位
- `visa/index.html`：加入 `articleHasSub()` helper（這個頁面有自己的 inline JS）
- CSS：加入 `.editor-subcat-group` 群組樣式

**向下相容邏輯**（`articleHasSub` 函式）：
```javascript
function articleHasSub(a, subKey) {
  if (a.sub_category_keys && a.sub_category_keys.length) {
    return a.sub_category_keys.includes(subKey);  // 新欄位
  }
  return a.sub_category_key === subKey;  // 舊欄位 fallback
}
```

---

## 重要坑：visa/index.html 的特殊性

`visa/index.html` **不使用** `category-page.js`！它有自己的 inline JavaScript，直接在 HTML 內定義 `renderSubcatNav`、`filterArticles` 等函式。

其他分類頁（life、tax、house 等）大多使用 `IsshoCategory.init()` 通過 `category-page.js`。

如果以後要修改分類頁邏輯，**兩個地方都要改**：
1. `assets/js/category-page.js`
2. `visa/index.html`（inline script）

---

## 目前狀態（2026-05-06 session 結束時）

- ✅ 多副分類功能代碼已完成並 push
- ✅ Supabase `sub_category_keys` 欄位已建立（ALTER TABLE 已執行）
- ✅ visa/index.html 已修復（`articleHasSub` 已加入）
- ⏳ 等待 Cloudflare 重 build 完成後驗證

**最後 commit：** `70d9418 fix: visa 分類頁使用 articleHasSub 支援多副分類篩選`

---

## 待處理事項

### 優先
- [ ] **驗證**：Hard refresh 簽證分類頁，確認副分類 tab 顯示正確文章數（非 0）

### 之後
- [ ] **手機版排版優化**：用戶有一個 Claude 設計的 React 原型（ZIP 檔）作參考，但不想做 React 遷移。要在現有純 HTML/CSS 基礎上改善手機版體驗
- [ ] **圖片優化**：文章配圖加 `loading="lazy"`、考慮圖片壓縮
- [ ] 購買網域（用戶已提及）

---

## 用戶偏好

- 回覆語言：**繁體中文**
- 改完直接 commit + push，不需要問
- 有計劃的功能優先用 `subagent-driven-development` skill 執行
- 有 superpowers-zh skill 框架（20 個 skills）在 `~/.claude/skills/`

---

## 如何繼續手機版優化

用戶有一個 ZIP 檔：`/Users/kit/Downloads/IssoHub.zip`（Claude 設計的 React 原型）。
這個是**設計參考**，不是要直接用的代碼。

用戶希望在現有靜態 HTML 基礎上改善手機排版。建議：
1. 先解壓 ZIP 看設計
2. 在現有 `index.html` + `assets/css/styles.css` 上做 CSS 調整
3. 不需要 React，只用 CSS media queries
