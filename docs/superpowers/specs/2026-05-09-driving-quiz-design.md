# 外免切替模擬試題 設計規格

**日期：** 2026-05-09  
**功能：** 日本駕照外免切替模擬試題測驗  
**路徑：** `/life/driving-quiz/`

---

## 一、功能目標

提供外免切替（外國駕照換日本駕照）的模擬筆試練習，以 **吸引目標訪客、推動會員註冊** 為核心目的。

SEO 導流 → 試題體驗 → 會員轉化 → 錯題追蹤留存

---

## 二、試題資料

**來源：** `駕照筆試練習題_改寫版.docx`（已處理完畢）

| 項目 | 內容 |
|------|------|
| 總題數 | 100 題 |
| 題型 | 是非題（○ / ✕） |
| 語言 | 繁體中文（主）+ 英文（i18n） |
| 附圖題數 | 20 題（圖片已存入 `assets/img/quiz/`） |
| 命名規則 | `q034.gif`、`q038.png`…依題號命名 |

### 2.1 JSON 資料格式

```json
{
  "id": 1,
  "q": "在市區駕駛時，若前方有行人正在過行人穿越道，即使有信號燈，也必須讓行人優先通過。",
  "answer": true,
  "explanation": "根據道路交通法第38條，...",
  "img": null,
  "tags": ["行人優先", "信號燈"]
}
```

- `img`：無圖題為 `null`；有圖題填寫相對路徑，例如 `"/assets/img/quiz/q034.gif"`
- `tags`：用於未來弱點分析（初期不顯示於 UI）

**資料存放：** `assets/js/quiz-data.js`（`const QUIZ_DATA = [...]`）

---

## 三、使用者流程

### 3.1 訪客（未登入）

```
進入 /life/driving-quiz/
  ↓
看到頁面說明 + 「開始測驗（訪客模式）」按鈕
  ↓
隨機抽取 20 題開始測驗
  ↓
Q15 完成後 → 「軟提示」Banner（可關閉）
  ↓
完成 20 題 → 顯示得分
  ↓
「強 CTA」：「登入 / 註冊以解鎖 100 題 + 記錄錯題」
```

### 3.2 已登入會員

```
進入 /life/driving-quiz/
  ↓
看到頁面說明 + 「開始完整測驗（100 題）」按鈕
  ↓
100 題全部，順序隨機排列
  ↓
每題作答後，錯題即時存入 Supabase
  ↓
完成 100 題 → 顯示得分 + 錯題複習入口
```

---

## 四、頁面架構（`/life/driving-quiz/`）

### 4.1 靜態 HTML 結構

```
/life/driving-quiz/
  index.html          ← 測驗主頁（SPA 式單頁，JS 控制畫面切換）
```

**頁面分為 4 個「場景」（用 JS 切換 display）：**

| scene | 說明 |
|-------|------|
| `#scene-intro` | 介紹頁：說明、題數、開始按鈕 |
| `#scene-quiz` | 測驗畫面：題目 + ○/✕ 按鈕 + 進度條 |
| `#scene-result` | 成績頁：分數 + 錯誤題數 + CTA（視登入狀態而定） |
| `#scene-review` | 錯題複習（僅登入用戶，顯示本次錯題詳解） |

### 4.2 測驗畫面元素

```
[進度條]  Q5 / 20

[圖片（如有）]

問題文字

[○ 正確]   [✕ 錯誤]

作答後：
  [即時反饋框] ✅ 正確！/ ❌ 錯誤，正確答案是：○
  解說文字
  [下一題 →]
```

### 4.3 軟提示 Banner（Q15 後）

僅訪客用戶，Q15 答完後，題目上方出現可關閉 Banner：

> 「📌 登入後可練習全部 100 題，並追蹤你的錯題 →」  
> [登入 / 註冊]　[✕ 繼續練習]

### 4.4 成績頁 CTA

**訪客用戶：**

```
你答對了 14 / 20 題（70%）

完整版包含 100 題，並自動記錄你的錯題。
[立即免費註冊]  [以訪客再練習一次]
```

**已登入用戶：**

```
你答對了 82 / 100 題（82%）

[複習本次錯題（18 題）]  [再練習一次]
```

---

## 五、錯題追蹤（Supabase）

### 5.1 資料表設計

```sql
-- 用戶作答記錄（每次測驗）
create table quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  quiz_type   text not null default 'driving',
  score       int,
  total       int,
  attempted_at timestamptz default now()
);

-- 錯題記錄
create table quiz_wrong_answers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  quiz_type   text not null default 'driving',
  question_id int not null,
  wrong_count int not null default 1,
  last_wrong_at timestamptz default now(),
  unique(user_id, quiz_type, question_id)
);
```

**錯題邏輯：**
- 測驗進行中，JS 維護一個 `sessionWrongs[]` 陣列，記錄本次答錯的題目 ID
- 每次作答錯誤 → 加入 `sessionWrongs[]`；同時 upsert `quiz_wrong_answers`（`wrong_count + 1`、`last_wrong_at`）
- 每次作答正確 → 若此題有錯誤記錄，**不刪除**（保留歷史）
- 測驗完成後，`quiz_attempts` 寫入得分
- 複習模式（`#scene-review`）：從 `sessionWrongs[]` 撈題目在本地顯示，無需再查 Supabase

### 5.2 RLS 策略

```sql
-- quiz_attempts
alter table quiz_attempts enable row level security;
create policy "own attempts" on quiz_attempts
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- quiz_wrong_answers
alter table quiz_wrong_answers enable row level security;
create policy "own wrong answers" on quiz_wrong_answers
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 六、Life 頁工具字卡

在 `life/index.html` 的「外免切替」子分類下，加入工具字卡，樣式與 HSP 計算機字卡一致（cream 背景、gold 框按鈕）。

### 6.1 外觀

```
─ TOOL · 實用工具

  🚗（駕車圖示 SVG）

  外免切替模擬試題

  免費練習 100 道外免切替筆試題，
  即時解說，系統記錄錯題。

  [開始練習 →]
```

### 6.2 實作方式

仿照 `buildHspToolCard(lang)` 建立 `buildDrivingQuizToolCard(lang)` 函式，在「外免切替」子分類（subcategory key: `licence`，對應 `data.js` 中 `url: "/life/#licence"`）顯示。

---

## 七、SEO 靜態參考頁

為提升 Google 收錄，在測驗頁下方建立靜態的題目參考區塊：

- `<section id="question-reference">` 包含所有 100 題的題目、答案、解說
- 使用語義化 HTML：`<details>/<summary>` 展開格式
- 收合狀態（`open` 由 JS 控制），SEO 爬蟲仍可索引
- 頁面 `<title>`、`<meta description>` 針對「外免切替 模擬試題 練習」關鍵字優化

---

## 八、i18n 與語言切換

頁面語言用 `IsshoCore.getLang()` 取得（回傳 `'tc'` 或 `'en'`），並監聽 `IsshoCore.onLangChange(callback)` 在語言切換時重新渲染題目和 UI 文字。

`driving-quiz.js` 中所有用戶可見字串均需提供 TC / EN 兩個版本。題目資料（`quiz-data.js`）目前只有繁體中文，英文翻譯列為 Phase 2。

---

## 九、檔案清單

| 動作 | 路徑 | 說明 |
|------|------|------|
| 新增 | `life/driving-quiz/index.html` | 測驗主頁 |
| 新增 | `assets/js/quiz-data.js` | 100 題 JSON 資料 |
| 新增 | `assets/js/driving-quiz.js` | 測驗邏輯、Supabase 寫入 |
| 已存在 | `assets/img/quiz/` | 20 張圖片（已提取完畢） |
| 修改 | `assets/css/styles.css` | 新增測驗相關 CSS |
| 修改 | `life/index.html` | 加入工具字卡 + 子分類邏輯 |
| Supabase | `quiz_attempts` | 新增資料表（需手動執行 SQL） |
| Supabase | `quiz_wrong_answers` | 新增資料表（需手動執行 SQL） |

---

**Script 載入順序（`life/driving-quiz/index.html`）：**
```html
<script src="/assets/js/quiz-data.js"></script>      <!-- 先載入題目資料 -->
<script src="/assets/js/driving-quiz.js"></script>    <!-- 再載入測驗邏輯 -->
```

Supabase client 和 IsshoCore 由頁面 `<head>` 載入的全域 scripts 提供（與其他頁面一致）。

---

## 十、暫緩功能（Phase 2）

- 成績分享（社交圖片）
- 每日一題 / 每日挑戰
- 弱點分析視覺化（按 tag 分類錯誤率）
- 多語言題目（目前英文翻譯暫缺）

---

## 十一、成功指標

| 指標 | 目標 |
|------|------|
| 訪客完成 20 題率 | > 60% |
| 訪客 → 會員轉換率 | > 10%（從測驗頁觸發） |
| 每月練習次數 | 可追蹤（quiz_attempts） |
