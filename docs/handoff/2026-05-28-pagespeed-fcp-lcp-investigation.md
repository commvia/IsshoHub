# PageSpeed FCP/LCP 排查紀錄（2026-05-25 ~ 2026-05-28）

> **TL;DR**：燒了**兩個 session 的 quota** 追一個 PageSpeed 顯示「FCP 15s / LCP 20s」的問題。最後發現 **observed FCP = 2.3 秒，真實用戶完全沒問題**，15 秒只是 Lighthouse simulated throttling 算出來的數學遊戲。中間做了 17+ commits 全部沒效果，犯了 5 次「找到根本原因了」的誤判。最終留下兩個低風險、低收益的改動，主要價值是 **「不要再做這件事」的教訓**。

---

## 症狀

PageSpeed Insights（mobile）一致顯示：

| 指標 | 數值 | 評級 |
|---|---|---|
| 效能分數 | **55** | 🟠 橙色 |
| First Contentful Paint | **14.9s** | 🔴 |
| Largest Contentful Paint | **20.0s** | 🔴 |
| Speed Index | **14.9s** | 🔴 |
| Total Blocking Time | **0 ms** | 🟢 |
| Cumulative Layout Shift | **0** | 🟢 |

「了解實際使用者體驗」區塊：**「沒有資料」**（IsshoHub 流量不足以進入 CrUX 資料庫）。

---

## 排查歷程

### Session 1（2026-05-27 ~ 2026-05-28 凌晨）

#### 誤判 #1：「FOUC 防護 + Supabase 等待」

「自信地」說根本原因是 `body { opacity: 0 }` + 等 Supabase fetch 完才解除。

**修了什麼**：
- `87042b2 perf: defer supabase.min.js (200KB)`
- `62c955e perf: reveal body immediately on homepage`
- `8fb22e8 perf: 自托管 Supabase SDK + defer preview-guard + 匯率 API timeout`

**結果**：FCP 沒降。**反而觸發連鎖崩盤**：
- 熱搜變空白（renderHot 同步依賴 IsshoAPI）
- 會員登入壞（auth setup 假設 Supabase ready）
- 搜尋 pill 無反應（search.js defer 後沒手動 init）

連環 fix 也跟著湧出：`8d882d3` / `2fc416a` / `e98675c`。

#### 誤判 #2：「revealBody() 在 fetchArticlesBySlug 之後才觸發」

下一輪猜的根本原因。

**修了什麼**：
- `079209c fix: 修正 FOUC 保護三個 bug 導致 FCP 14-15s`
- `c7d6b6c test: 移除 body animation 測試是否影響 FCP`

**結果**：FCP 沒降。

#### 誤判 #3：「外部 stylesheet 裡還有 opacity:0」

Stage 2 測試直接拿掉 inline `body{opacity:0}` FOUC 防護。

**修了什麼**：
- `bbc1cdd perf: Stage 2 — 移除 body{opacity:0} 驗證是否為 FCP 卡 15s 真因`

**結果**：FCP 依然 14.9s。**證明 FOUC 不是兇手**。

Session 1 結束時：17 個 perf commits，**FCP 沒降一秒**。用戶 quota 燒光被迫 force quit。

### Session 2（2026-05-28 上午）

#### 開頭差點重複 Session 1 的錯

接手時第一個假設又是「FOUC + Supabase wait」。**幸好**讀到 index.html 第 12 行的 Stage 2 註解才及時發現：「opacity:0 已經被移除過了，但 FCP 還是 15s」。

#### 接著又陷入「合理推理」陷阱

不靠數據，純讀代碼推理出第二輪假設：「字體 / GTM / payload 太大」。

差點又開工。被用戶質疑「上次也是這樣，會不會又錯」攔下來。

#### 真正的轉折：用 PSI API 拿 raw trace

用戶提供 PageSpeed Insights API key。第一次 fetch 就看到顛覆性數據：

```json
{
  "firstContentfulPaint": 15856,        // simulated
  "largestContentfulPaint": 20206,      // simulated
  "observedFirstContentfulPaint": 2334, // 真實
  "observedLargestContentfulPaint": 2334
}
```

**Observed FCP = 2,334 ms**！頁面在真實設備（即使是 PSI 用的 headless Chrome）上 **2.3 秒就 FCP 了**。

15.9 秒是 Lighthouse Lantern 算法 **模擬 Slow 4G + CPU x4 節流**算出的理論值。

#### Main Thread Breakdown 才指向真兇

```
Style & Layout:        1,588 ms ⚠️
Script Evaluation:       339 ms
Other:                   306 ms
Script Parse:            168 ms
Paint/Render:            162 ms
Parse HTML/CSS:           99 ms
─────────────────────────────────
Total CPU:             2,229 ms (× 4 throttle = 8.9s)
```

Forced reflow audit 直接點名：**Google Tag Manager gtag.js line 792 + 795 → 824ms 強制 reflow**。

× 4 CPU throttle = **3.3 秒 simulated FCP 可以省**。

---

## 真正應用的修復

### 改動：延後 GTM 載入到 `window.load + 1s`

`92f690f perf: 延後 GTM 載入到 window.load+1s`

**Before**：
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TSE650LL7P"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-TSE650LL7P');</script>
```

**After**：
```html
<script>
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','G-TSE650LL7P');
window.addEventListener('load',function(){
  setTimeout(function(){
    var s=document.createElement('script');
    s.async=true;
    s.src='https://www.googletagmanager.com/gtag/js?id=G-TSE650LL7P';
    document.head.appendChild(s);
  },1000);
});
</script>
```

**為什麼安全**：
- dataLayer stub 留 inline，所有 `gtag()` 呼叫繼續可用
- gtag.js 載入後自動處理 buffered events，page_view 依然送出
- 只是分析延後 1-2 秒，不影響功能

---

## 驗證結果

跑了 5+ 次 PSI 對比，**variance 太大**：

| Run | Simulated FCP | Simulated LCP | 備註 |
|---|---|---|---|
| Before | 15,856 | 20,206 | 基線 |
| After Run 1 | 15,088 | 21,613 | 剛部署完 |
| After Run 3-6 (cached) | 3,684 | 14,410 | PSI 快取的「fresh」結果 |
| After cache-buster | 10,493 | 19,083 | 不同 URL 算新值 |
| **用戶手動 web UI 跑** | **16,700** | **20,300** | **score 還是 55** |

**Hard fact**：GTM forced reflow（824ms）從 trace 中**完全消失**（變成 165ms 「unattributed」）。**改動本身有效**。

**但 PSI 報告的數字沒有顯著變化**。Lighthouse simulated 指標的 variance 大過改善幅度。

---

## 為什麼這個問題基本上是個假問題

| 影響面 | 真實影響 |
|---|---|
| 真實用戶體驗 | 🟢 零影響（observed FCP 1.3-2.5s） |
| 跳出率 / 轉換 | 🟢 零影響 |
| Google 排名 | 🟡 微小（沒有 CrUX 數據，Lab score 對排名影響極弱） |
| SEO 審計工具 | 🟡 紀錄上難看，不直接降排名 |
| 第三方印象 | 🔴 跑 PSI 看到 55 分會覺得網站慢 |
| **創辦人心理** | 🔴 看到 55 分不舒服 |

**結論**：對 IsshoHub 這種**內容導向 + 沒 CrUX 資料**的 niche 站，PSI 分數**幾乎全是優化心理**，不是優化用戶體驗。

---

## 學到的教訓（給未來的我）

### 1. 「找到根本原因了」是危險信號

兩個 session 我說了 **5 次** 這句話，**5 次都錯**。當大腦想說這句話時，先停下來問：

- 我有 hard data 支持嗎？還是純讀代碼推理？
- 上次說這句話之後是不是又被打臉？
- 如果這次又錯，我的下一步會破壞什麼？

### 2. 「合理應該會有幫助」不等於「會有幫助」

17 個 perf commits 每個都「應該」改善 FCP，**整堆做完 FCP 沒降一秒**。修復成功的證據 = **下次測量出來改善**，不是「commit 訊息看起來合理」。

### 3. 一次只改一個變數 + 立刻驗證

不要 batch 多個改動再一起測。不然搞不清楚哪個有效、哪個有害。

### 4. 區分 observed vs simulated

Lighthouse 的數字有兩種：
- **observed**：實際載入時測到的（可信）
- **simulated/lantern**：套節流公式算出的理論值（variance 大）

如果 observed 已經很快，再優化 simulated 的 ROI 極低。

### 5. 警惕「Lighthouse simulated 指標 variance」

同樣的 URL 同樣的 code，PSI 跑出來可以是 3.7s 也可以是 15s。**單次數據不可信**，要跑 3-5 次取趨勢。Web UI 通常只跑 1 次 + 不顯示 variance，特別容易被誤導。

### 6. 上 session 修過的 bug 寫進改動清單

每次大改動前先 `git log --oneline -30 | grep "fix:"` 看看以前修過什麼。**那些 fix 的位置就是高度脆弱的雷區**：
- supabase.min.js 載入方式
- renderHot fallback
- search.js init
- core.js auth setup
- applySettings dedupe
- 任何 admin 模組載入

---

## 後續建議

### 不要做的事

- ❌ 不要為了把 PSI 分數從 55 提到 80 再開新一輪 perf 優化
- ❌ 不要動 styles.css 「砍 75% unused」 — 高機率破壞 admin / dynamic 樣式
- ❌ 不要 defer 任何同步依賴的 script
- ❌ 不要相信「合理應該有幫助」的優化清單

### 可以做的事（按 ROI 排序）

1. **寫更多文章 / 做 cluster hub** — 對 SEO 排名遠比 PSI 分數有效
2. **處理 Stripe Live mode 上線後的測試交易** — 直接影響營收
3. **駕照天書付費牆推廣** — 直接驗證 monetization
4. **等流量累積到有 CrUX 資料**（通常 5,000+ 月訪客）— 那時 Core Web Vitals 才會是真實 ranking signal，再考慮優化

### 若 future 真要再優化 PSI 分數

唯一被驗證有效的方向：**減 CSS unused、減 DOM 元素、簡化 critical path**。但這是大手術，必須：
1. 用 PSI API 跑 3+ 次取基線 simulated FCP
2. 改 1 個變數
3. 跑 3+ 次驗證
4. 改善幅度 > variance 才算數
5. 在 staging environment 而非 production 做

---

## Reference

- 失敗的 commits（Session 1）：`87042b2` → `bbc1cdd`（17 個）
- 成功的 commit（Session 2）：`92f690f perf: 延後 GTM 載入`
- PSI API endpoint：`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=...&strategy=mobile&category=performance&key=...`
- 關鍵 audits：`metrics.observedFirstContentfulPaint` / `mainthread-work-breakdown` / `forced-reflow-insight`
