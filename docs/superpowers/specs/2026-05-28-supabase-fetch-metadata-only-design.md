# Supabase 首頁 fetch metadata-only 優化設計

> **狀態**：設計階段，待用戶 review 後實作
> **日期**：2026-05-28
> **目標**：把首頁兩個 `fetchArticles` 的 transfer size 從 ~424 KB 降到 ~30-50 KB，不影響任何顯示或功能

---

## 動機

PSI 報告顯示首頁總 payload 4.4 MB，其中 Supabase articles fetch 佔 **424 KB**（兩次呼叫：100 篇 260 KB + 20 篇 164 KB）。

實際分析（見 `docs/handoff/2026-05-28-pagespeed-fcp-lcp-investigation.md`）發現：

- 真正佔大頭的是每篇文章的 `body_tc` / `body_en` 欄位（每篇 5-10 KB）
- 首頁卡片**完全不顯示文章正文**，只用 13 個 metadata 欄位
- 把 body 連同其他不用的欄位 select 出來 = 純粹浪費頻寬

未來文章從 31 篇成長到 500 篇時，這個浪費會線性放大（260 KB → 1.3 MB）。

---

## 範圍

**動的**：
- `assets/js/supabase-client.js` 的 `fetchArticles()` — 加 `columns` 參數
- `index.html` 的兩處呼叫：`loadSupabaseArticles()` (line 749) 和 `loadCatArticles()` (line 874)

**不動的**：
- `fetchArticle(slug)` — 文章詳情頁，需要 body，維持 `select('*')`
- `fetchArticlesBySlug(slugs)` — hero / story articles，雖然也可優化但這次不動（風險區分）
- `fetchAllArticles()` — admin 後台，已經自己 select 精簡欄位
- `searchArticles()` — 獨立函數，已經自己控制欄位
- `category-page.js` 的 `fetchArticles({ category, limit: 30 })` — 副分類頁面，不在這次範圍

---

## 設計

### `fetchArticles` 函數修改

**現狀**：
```js
async function fetchArticles(options = {}) {
  let query = getClient()
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (options.category) query = query.or(`category_key.eq.${options.category},category_keys.cs.{${options.category}}`);
  if (options.featured) query = query.eq('featured', true);
  if (options.limit)    query = query.limit(options.limit);

  const { data, error } = await query;
  return { data, error };
}
```

**改後**：
```js
async function fetchArticles(options = {}) {
  let query = getClient()
    .from('articles')
    .select(options.columns || '*')     // 新增：允許指定欄位
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (options.category) query = query.or(`category_key.eq.${options.category},category_keys.cs.{${options.category}}`);
  if (options.featured) query = query.eq('featured', true);
  if (options.limit)    query = query.limit(options.limit);

  const { data, error } = await query;
  return { data, error };
}
```

**重點**：`columns` 未傳入則退回 `'*'`，**完全向後相容**。所有現有不傳 columns 的呼叫者（category-page.js / admin 後台等）行為不變。

### 首頁呼叫修改

定義一個共用欄位常數，兩個呼叫都用：

```js
/* 首頁卡片需要的 13 個欄位（不包含 body 等大欄位） */
const HOMEPAGE_CARD_COLUMNS = 'id, slug, title_tc, title_en, excerpt_tc, excerpt_en, cover_image_url, category_key, category_keys, published_at, featured, author, video_duration';

async function loadSupabaseArticles() {
  if (_sbArticles) return _sbArticles;
  if (!window.IsshoAPI) return [];
  const { data } = await window.IsshoAPI.fetchArticles({
    limit: 20,
    columns: HOMEPAGE_CARD_COLUMNS,
  });
  _sbArticles = data || [];
  return _sbArticles;
}

async function loadCatArticles() {
  if (_catArticles) return _catArticles;
  if (!window.IsshoAPI) return [];
  const { data } = await window.IsshoAPI.fetchArticles({
    limit: 100,
    columns: HOMEPAGE_CARD_COLUMNS,
  });
  _catArticles = data || [];
  return _catArticles;
}
```

---

## 影響評估（已驗證）

| 對象 | 影響 |
|---|---|
| 首頁所有卡片顯示 | ✅ 完全相同（11 個欄位都有） |
| Editor's picks featured 篩選 | ✅ 相同（有 `featured` 欄位） |
| 分類 badge 數字 | ✅ 相同（count 從 fetch 結果算） |
| 分類 sections（多分類） | ✅ 相同（有 `category_keys`） |
| 點卡片進文章內頁 | ✅ 相同（內頁另外用 `fetchArticle(slug)`） |
| 語言切換 | ✅ 相同（兩語 title/excerpt 都拿） |
| Admin 後台 | ✅ 不受影響（用 `fetchAllArticles`） |
| 搜尋 | ✅ 不受影響（用 `searchArticles`） |
| 副分類頁面 | ✅ 不受影響（用 category-page.js 內的 fetchArticles，不傳 columns） |
| 上 session 修過的 bug 雷區（admin / 熱搜 / 會員） | ✅ 全部不受影響（不動那些路徑） |

**唯一行為差異**：article object 不再包含 `body_tc, body_en, read_time, tags, sub_category_key, sub_category_keys, status, created_at, updated_at` 等首頁不用的欄位。

---

## 預期改善

| 指標 | 改前 | 改後 |
|---|---|---|
| `fetchArticles({limit:100})` transfer | 260 KB | ~50-80 KB |
| `fetchArticles({limit:20})` transfer | 164 KB | ~15-25 KB |
| 首頁總 payload | 4.4 MB | ~4.0 MB |
| Simulated FCP | 14.9s | **不確定**（PSI variance 大，但理論上會降 1-2s） |
| Observed FCP（真實） | 2.3s | 2.0-2.2s |

**坦白**：simulated FCP 變化無法精準預測，需要實測。但這個改動的價值不只是 PSI score，更是「未來不會爆」+ 真實流量減少。

---

## 風險

| 風險 | 嚴重度 | 緩解 |
|---|---|---|
| `select` 字串拼錯欄位名 | 🟡 | Supabase 會立刻回 400 error，console 看到即知 |
| 漏 select 某個首頁實際用到的欄位 | 🟡 | 已 grep 確認所有 `a.xxx` 存取，但仍可能漏（建議部署後肉眼掃首頁一次） |
| 未來新功能需要 body | 🟢 | 加進 `HOMEPAGE_CARD_COLUMNS` 即可 |
| Supabase RLS 對某些欄位限制 | 🟢 極低 | anon key 對 published articles 全欄位可讀 |

**Rollback**：1 個 `git revert <commit>` + push + 等部署，3 分鐘恢復。

---

## 驗證方式

1. 改動部署後，請用戶手動瀏覽首頁，肉眼確認：
   - Hero 顯示正常
   - Editor picks 6 張卡顯示正常
   - News / Latest / Stories 顯示正常
   - 10 個 category sections 都有內容（不是空白）
   - Browse Categories badge 數字正確
2. 跑 PSI API 5 次取平均，比較 `fetchArticles` 的 transferSize
3. 如果肉眼有任何顯示異常，立刻 revert

---

## 不做的事（YAGNI）

- ❌ 不優化 `fetchArticlesBySlug`（hero / story 用的）— 雖然也可省，但風險區分，留下次
- ❌ 不在 supabase-client.js 加複雜的「欄位驗證」邏輯 — 信任 caller 傳對
- ❌ 不寫單元測試 — 沒有測試基礎設施，且改動極簡單
- ❌ 不重構 `loadSupabaseArticles` / `loadCatArticles` 為單一函數 — 它們的 caching 邏輯不同（一個給 editor，一個給 category sections）

---

## 實作步驟（review 通過後）

1. 改 `assets/js/supabase-client.js` 第 92-105 行（fetchArticles 加 columns 參數）
2. 改 `index.html` 第 749 行（loadSupabaseArticles 加 columns）
3. 改 `index.html` 第 874 行（loadCatArticles 加 columns）
4. 在 index.html 適當位置加 `HOMEPAGE_CARD_COLUMNS` 常數宣告（line 745 附近）
5. 局部 commit + push
6. 等 Cloudflare 部署
7. 跑 PSI 5 次比較 transferSize
8. 用戶肉眼驗證首頁
