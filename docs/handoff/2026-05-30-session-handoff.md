# Session Handoff — 2026-05-28 ~ 2026-05-30

> 為下個 session 接手用。重點：**這個 session 同時做了「PSI 效能優化」、「Refresh flash 修復」、「外免天書印尼版試跑」三件事**。

---

## TL;DR

1. **PSI FCP/LCP 結論：放棄優化**（內部結論，不是 bug） — Lighthouse simulated 是模擬遊戲，IsshoHub observed FCP = 2.3s 真實沒問題，沒 CrUX 數據 = PSI 分數對排名影響極弱
2. **Refresh flash 連環修復成功**：hot pills + hero 兩個 flash 都消除（用 SSG match JS render 的方式）
3. **外免天書 chapter-1 印尼版 + lang toggle 全站 ID button 已上線**，待用戶肉眼驗證 + 找印尼譯者校對
4. **Samsung 閃爍**：加了 color-scheme=light meta，等 Samsung 用戶反饋驗證

---

## 這個 Session 的 Commits（按時序）

```
92f690f  perf: GTM defer to window.load+1s        — PSI 改善有限（noise 範圍）
ad3987f  fix: 全站 color-scheme=light meta       — Samsung dark mode 衝突修法
8f70ef0  docs: 記錄 PageSpeed FCP/LCP 排查全過程   — 重要！避免下次重蹈覆轍
5790e8a  docs: Supabase fetch metadata-only 設計
29744a7  perf: Supabase fetch metadata-only      — 真實 transfer 260KB→45KB ✓
0475097  fix: 緊急移除 video_duration             — 上一個 commit 用了不存在的欄位導致 fetch 全失敗
3e79048  docs: hot pills SSG 設計
c37511f  feat: SSG hot pills 消除首頁熱搜 flash   — 成功 ✓
b706178  fix: SSG hero match JS renderHero       — hero flash 也消除 ✓
2402171  feat: 外免天書 chapter-1 印尼版 + ID button — 待用戶驗證
```

10 個 commits。3 個 docs，7 個 code change，0 個 revert。

---

## 外免天書印尼版 — 目前狀態

### 已建好
- `life/driving-guide/id/index.html` (ID hub，chapter-1 active，2-15 「Akan Datang」灰色)
- `life/driving-guide/id/chapter-1/index.html` (印尼翻譯版)
  - **30 個圖片 src 跟 TC 100% match**（grep diff 驗證為空）
  - HTML structure / CSS class 完全 follow TC chapter-1 template
  - 只翻譯純文字節點
- 全站 lang toggle 3 個 button（繁中 / EN / ID）僅在 4 個既有頁面更新：
  - `life/driving-guide/index.html` (TC hub)
  - `life/driving-guide/en/index.html` (EN hub)
  - `life/driving-guide/chapter-1/index.html` (TC ch1)
  - `life/driving-guide/en/chapter-1/index.html` (EN ch1)
- `build.js` STATIC_PAGES 加 ID hub + chapter-1 URL（下次 build 進 sitemap）

### 待做（給下個 session）

**Phase 1：驗證 chapter-1**
- 用戶肉眼掃 ID chapter-1 確認：圖片正常、表格排版跟 TC/EN 一致、印尼文流暢
- 用戶找懂日本駕照規定的印尼譯者校對專業術語（日本駕駛專業詞如「外免切替」、「原動機付自転車」我保留日文+印尼語譯，可能不夠在地化）

**Phase 2：印尼版章節 2-15**（用戶提供翻譯後）
- 同樣模式：copy TC chapter-N → 換 lang/canonical/hreflang/nav/redirect → 翻譯文字
- 每建一章，同時更新對應 TC + EN chapter-N 的 lang toggle 加 ID button
- 每建一章，build.js STATIC_PAGES 加對應 URL
- ID hub 把對應章節從「Akan Datang」改為可點連結

**Phase 3：未來其他語言**
- 用戶提到日後會加更多語言（之後說）
- Pattern：`life/driving-guide/{lang}/` + 同樣 lang toggle 擴展

### 重要注意事項

1. **`<html lang="id">` 用 `id`（不是 `in`）** — Indonesian 的 ISO 639-1 code
2. **`localStorage.issho.lang` 用 `'id'` 字串** — 跟 lang button data-lang-set 一致
3. **絕對不能改任何 image src、CSS class、HTML structure** — 用戶之前踩雷的關鍵
4. **沒翻譯的章節 lang toggle 暫不加 ID button** — 避免點 ID 跳到 404

---

## PSI FCP/LCP — 給未來自己的警告

> **詳見**：`docs/handoff/2026-05-28-pagespeed-fcp-lcp-investigation.md`（這個 session 寫的完整 postmortem）

**核心結論**：
- IsshoHub 沒 CrUX 數據，PSI lab score 對 Google 排名幾乎不影響
- Observed FCP = 2.3s（真實），simulated FCP = 14.9s（Lighthouse 數學模擬）
- 兩個 session 累計 18+ commits 試圖降 simulated FCP，**幾乎沒移動**
- 真正能降的是「砍 styles.css unused / 砍 hero side cards / 砍 cat sections」這種 invasive 改動 — 高機率破壞 admin/熱搜/會員

**下次用戶提到 PSI 分數時的 SOP**：
1. 先看 `docs/handoff/2026-05-28-pagespeed-fcp-lcp-investigation.md`
2. 不要再陷入「找根本原因」陷阱
3. 直接告訴用戶：「這是 Lighthouse 數學模擬，IsshoHub observed 2.3s 沒問題」
4. 不動手除非用戶 explicitly 要破壞性改動

---

## Refresh Flash — 已修好的 + 機制

**已修**：
- Hot pills (D.hot stale fallback flash) → SSG hot pills via build.js
- Hero (FEATURED chip + 作者+日期 meta vs JS 簽證 + kicker) → SSG hero match JS output

**機制**：build.js 在部署時 fetch Supabase 寫進 HTML，輸出格式跟 JS renderXxx() **完全一樣**，這樣 JS post-fetch 替換 DOM 是 visually invisible。

**理論還可能 flash 的區塊**（如果用戶反映）：
- Editor's picks
- News section
- Latest section
- Stories section
- Cat sections

修法同類：build.js ssgXxx 函數確保跟 JS renderXxx() 同輸出。

---

## Samsung 閃爍 — 待驗證

**已做**：全站 55 個 HTML 加 `<meta name="color-scheme" content="light" />`

**假設**：Samsung Internet 的 auto dark mode 嘗試 invert hero 區（深色背景 + 白字）導致重複 repaint

**驗證**：需要 Samsung 用戶實測。等用戶反饋。

**如果還閃**：依序試
1. 拿掉 `.hero-chip` 的 `backdrop-filter: blur(8px)`
2. 拿掉 `.hero-img` 的 `filter: saturate(1.05)`
3. 請用戶錄 video 看真實症狀重新判斷

---

## 關鍵雷區清單（**不要碰**）

從 git log + 多次修壞重修的痛苦經驗：

| 不要 | 為什麼 |
|---|---|
| 動 `supabase.min.js` 的 defer 載入方式 | 上 session 拆 defer 引發 5 個連鎖 bug |
| 動 `core.js` / `data.js` 變 defer | core 是依賴根，動了骨牌 |
| 動 `_loadAdminModules()` 動態載入 | admin bar 注入時序脆弱 |
| 動 `renderHot()` / `renderHotPills()` 邏輯 | 補了 fallback 才不空白 |
| 動 `applySettings` 去重 + `renderHero` 流程 | bfcache flash 修過好幾輪才穩 |
| 動 styles.css 的「unused CSS」清理 | 高機率破壞 admin / modal / dynamic |
| 在 select 字串加 DB 不存在的欄位 | 整個 fetch 失敗（剛剛踩過 video_duration） |
| 用 regex 處理巢狀 HTML | 用 cheerio。曾造成 17 個 orphan `</div>` |
| 把 admin / user 文字寫回靜態 HTML | Gemini 之前發現過洩漏 |

## 動代碼前 SOP

1. **動 Supabase select 欄位前** → `curl Supabase` 測欄位真的存在
2. **動 SSG/lang/redirect 邏輯前** → 跑 `node build.js` local 驗證
3. **批量改 HTML 前** → 先在 1 個檔案測試 + 看 diff
4. **commit 前** → `git diff --stat` 確認只動該動的檔案
5. **每個改動部署後** → 至少 1 個方法驗證真的有效（curl, PSI API, 肉眼看）

---

## 仍 in_progress 的 task

- Task #7 — Samsung 手機閃爍診斷（等用戶反饋）

其他 task（#1-6, #8-11）都已 completed。

---

## Memory 還沒寫進去的事

下個 session 開頭可以考慮把這幾條存進 `MEMORY.md`：

1. **IsshoHub PSI 優化是假問題** — 不要再陷入
2. **SSG match JS render 是 refresh flash 的標準解** — hot pills + hero 已驗證
3. **印尼版外免天書 chapter-1 已建** — 之後 2-15 follow 同樣模式
4. **動 select 欄位前先 curl 驗證** — 避免 video_duration 重蹈覆轍

---

## 相關 docs

- `docs/handoff/2026-05-28-pagespeed-fcp-lcp-investigation.md` — PSI 完整 postmortem
- `docs/superpowers/specs/2026-05-28-supabase-fetch-metadata-only-design.md` — metadata-only fetch 設計
- `docs/superpowers/specs/2026-05-29-hot-pills-ssg-design.md` — hot pills SSG 設計
- `docs/handoff/2026-05-06-session-handoff.md` — 更早的 session handoff（參考格式）
