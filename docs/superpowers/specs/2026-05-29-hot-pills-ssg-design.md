# Hot Pills SSG 設計 — 消除首頁熱搜 flash

> **狀態**：設計階段，待用戶 review 後實作
> **日期**：2026-05-29
> **目標**：refresh index page 時，hot search pills 不再閃過 `data.js` 裡的舊靜態 fallback
> **約束**：不影響現網站任何功能（用戶明確要求）

---

## 問題

當前 hot pills 在 refresh 時會閃過 `data.js` 裡的 D.hot 靜態 fallback（已 stale 過半的內容），原因：

```
1. HTML 載入，pills 區為空
2. data.js + core.js 跑 → renderHot() → IsshoAPI 還沒 ready（defer）
3. renderHot 用 D.hot 靜態畫 8 個 pill ← 用戶看到「舊」內容
4. supabase.min.js 載完 → renderHot() 又跑 → fetch hot_searches → 替換為新內容
5. 用戶看到「閃」
```

D.hot 跟 Supabase 比對：8 個中有 6 個不同（D.hot 從未跟 admin 編輯同步過）。

---

## 解法

把 hot_searches 用 build.js 在部署時寫進 HTML（跟既有 hero / picks / news / stories / latest / cat sections 完全一樣的 SSG pattern）。

```
新流程：
1. HTML 載入時 pills 區已有正確內容（build.js 寫入）
2. 用戶第一眼就看到正確 pills
3. renderHot() 在 IsshoAPI 未 ready 時直接 return（不再 overwrite SSG）
4. IsshoAPI ready 時 renderHot() fetch + 替換（通常跟 SSG 一樣 = no-op；如果 build 後 admin 改過就會更新）
```

---

## Schema 驗證（避免重蹈 video_duration 覆轍）

```bash
curl Supabase hot_searches → 確認回應有以下欄位:
  active, id, keyword_en, keyword_tc, sort_order
```

✅ 全部存在，需要的 4 個（keyword_tc, keyword_en, sort_order, active）都有。

---

## 改動清單（共 3 處）

### 1. `index.html` 行 239 — 加 SSG markers

**Before**：
```html
<div class="hot-pills" id="hotPills"></div>
```

**After**：
```html
<!-- SSG:hotPills:start --><div class="hot-pills" id="hotPills"></div><!-- SSG:hotPills:end -->
```

### 2. `index.html` 行 633-654 — renderHot() 移除 fallback render

**Before**：
```js
function renderHot() {
    const lang = getLang();
    const pills = document.getElementById('hotPills');
    if (!pills) return;
    if (!window.IsshoAPI) {
      pills.innerHTML = D.hot.map(p => ...).join('');  // ← 移除這個會 overwrite SSG 的 fallback
      return;
    }
    window.IsshoAPI.fetchHotSearches().then(({ data }) => { ... });
}
```

**After**：
```js
function renderHot() {
    const lang = getLang();
    const pills = document.getElementById('hotPills');
    if (!pills) return;
    /* SSG 已填入 hot pills 於 build time，IsshoAPI 未 ready 時不要 overwrite */
    if (!window.IsshoAPI) return;
    window.IsshoAPI.fetchHotSearches().then(({ data }) => { ... });
}
```

**內部 fallback 保留**：fetchHotSearches 回空時仍 fallback 到 D.hot（line 649-651），這是「Supabase 線上 down 時的 last resort」邏輯，保留不動。

### 3. `build.js` — 加 hot_searches fetch + SSG inject

在 `generateHomepageSSG` 函數內加：

```js
/* Fetch hot_searches in parallel with site_settings (already fetched) */
const { data: hotSearches } = await supabase
  .from('hot_searches')
  .select('keyword_tc, keyword_en, sort_order')
  .eq('active', true)
  .order('sort_order');

const hotPillsHtml = (hotSearches || [])
  .map((p, i) => `<button class="pill"><span class="rank">${String(p.sort_order || i + 1).padStart(2, '0')}</span>${escHtml(p.keyword_tc || p.keyword_en || '')}</button>`)
  .join('');
```

並在 `injectBetween` 區加：
```js
injectBetween('hotPills', '<div class="hot-pills" id="hotPills">', '</div>', hotPillsHtml);
```

並把 console.log 加上 hot pills 計數。

---

## 影響評估（逐項確認不影響功能）

| 功能 | 改前 | 改後 | 是否影響 |
|---|---|---|---|
| 首次 paint hot pills | 顯示 D.hot stale | 顯示 SSG 寫入的正確內容 | ✅ 修好 |
| 切換 EN/TC | 觸發 renderHot → fetch | 同左（lang change 邏輯不變） | ✅ 不影響 |
| Supabase up 時 hot_searches 拉到資料 | 替換 D.hot | 通常跟 SSG 一樣 = no-op；admin build 後改過才更新 | ✅ 正常 |
| Supabase up 時 hot_searches 表為空 | fallback 用 D.hot | SSG 是空 → JS fallback 用 D.hot | ✅ 保留 |
| Supabase down（runtime）但 SSG 有內容 | 用 D.hot stale | **用 SSG 內容**（比現在好，因為 SSG 是 build 時的真實 Supabase） | ✅ 反而更好 |
| Supabase down（build time）| N/A | hotPillsHtml = ''（pills 區空），runtime JS 會 fetch 補；Supabase 也 down 就 fallback D.hot | ✅ 兩道防線 |
| Admin hot-search-manager 後台編輯 | 直接寫 Supabase | 同左 | ✅ 完全不變 |
| 部署後 admin 立刻改 hot_searches | 用戶直接看到新（runtime fetch） | 用戶先看 SSG（build 時的），1-2 秒後 JS fetch 替換為最新 | ✅ 最終一致 |
| 上 session 修過的雷區（會員、admin、熱搜後台） | — | 全部不在影響範圍 | ✅ 不碰 |

---

## 風險與緩解

| 風險 | 嚴重度 | 緩解 |
|---|---|---|
| build.js fetch hot_searches 失敗 | 🟡 | hotPillsHtml 變空 string，runtime JS 會用 fetchHotSearches 補；都失敗就用 D.hot fallback |
| 用戶切 EN 但 IsshoAPI 未 ready | 🟢 極低 | pills 暫時顯示 TC，IsshoAPI ready 後 renderHot fetch 重畫成 EN（< 1 秒） |
| SSG marker 寫錯位置 | 🟢 | 部署前 local 跑一次 build 看 console.log |
| `escHtml` 函數不存在 | 🟢 | 已 grep 確認 build.js 內已有使用（line 331） |
| 改動破壞 admin 後台熱搜編輯 | 🟢 零 | admin 走 hot-search-manager.js → Supabase，完全不過首頁 path |

**Rollback**：1 個 `git revert <commit>` + push，3 分鐘恢復原狀。

---

## 不做的事（YAGNI）

- ❌ 不刪除 D.hot 從 data.js（保留作 last-resort fallback when both SSG and Supabase fail）
- ❌ 不改 preview.html 的 renderHot（preview 是內部工具，不在生產路徑）
- ❌ 不改 fetchHotSearches 函數（不需要動）
- ❌ 不寫單元測試（沒測試基礎設施 + 改動小）
- ❌ 不重構 renderHot（已經夠簡單）

---

## 驗證計劃

**部署前**：local 跑 `node build.js`（如果能跑）看 console.log 是否含 hot pills 計數

**部署後**：
1. 你肉眼 refresh 首頁 3 次 — 確認 hot pills **不再閃**
2. 切 EN，確認 pills 變 EN keyword
3. 切回 TC，確認 pills 變 TC keyword
4. 進 admin 熱搜後台確認可正常編輯（不會被改動破壞）
5. View-source 看 HTML 內 `<!-- SSG:hotPills:start -->` 後面是否有 8 個 button HTML

**失敗指標**：以上任何一項異常 → 立刻 `git revert`
