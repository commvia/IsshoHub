# 外免切替模擬試題 實作計劃

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推薦）或 superpowers:executing-plans 逐任務實現此計劃。步驟使用複選框（`- [ ]`）語法追蹤進度。

**目標：** 在 `/life/driving-quiz/` 建立外免切替筆試模擬測驗，訪客 20 題、登入會員 100 題，錯題記錄存 Supabase，並在 life 頁外免切替子分類注入工具字卡。

**架構：** 單頁 SPA（4 個 scene 用 JS 切換），題目資料存靜態 JS 檔，Supabase 只在會員模式寫入錯題/成績。SEO 靜態參考區塊硬編在頁面底部供 Google 抓取。

**技術棧：** 原生 HTML + Vanilla JS、Supabase JS SDK v2（已全局載入）、IsshoCore（語言/auth 橋接）、Cloudflare Pages 靜態托管。

---

## 背景知識（必讀）

本專案是純靜態網站，**無建構工具、無框架、無 npm**。所有 JS 皆為 IIFE 或全局變數。

| 全局物件 | 來源 | 說明 |
|----------|------|------|
| `window.IsshoCore` | `core.js` | `C.getLang()` 回傳 `'tc'` 或 `'en'`；`C.onLangChange(fn)` 監聽語言切換 |
| `window.IsshoAuth` | `supabase-client.js` | `IsshoAuth.getUser()` async 回傳 user 或 null；`IsshoAuth.getClient()` 回傳 Supabase client |
| `window.IsshoCategory` | `category-page.js` | `IsshoCategory.init(catKey, options)` 渲染文章分類頁 |
| `window.ISSHO_DATA` | `data.js` | 靜態文章資料、nav 結構 |

**CSS 版本控制：** `styles.css?v=N`，修改 CSS 後必須在所有 HTML 檔中同步升版（見下方版本 bump 清單）。

**Supabase client 用法：**
```javascript
const db = IsshoAuth.getClient();
// Insert
await db.from('quiz_attempts').insert({ user_id: user.id, ... });
// RPC
await db.rpc('increment_quiz_wrong_count', { p_user_id: ..., p_quiz_type: ..., p_question_id: ... });
```

**已存在的圖片資產：** `assets/img/quiz/` 已有 20 張圖片（q034.gif、q038.png…等，依題號命名）。

---

## 檔案清單

| 動作 | 路徑 | 職責 |
|------|------|------|
| 新增 | `life/driving-quiz/index.html` | 測驗頁（4 scenes + SEO 靜態參考區塊） |
| 新增 | `assets/js/quiz-data.js` | 100 題資料（QUIZ_DATA 全局陣列） |
| 新增 | `assets/js/driving-quiz.js` | 測驗引擎（狀態機、Supabase 寫入） |
| 修改 | `assets/css/styles.css` | 新增測驗相關 CSS（版本 v25 → v26） |
| 修改 | `assets/js/category-page.js` | IsshoCategory.init() 加入 toolCard 選項（v10 → v11） |
| 修改 | `life/index.html` | 加入工具字卡函式、使用新的 init options（category-page v11） |
| 手動 | Supabase SQL Editor | 建立 quiz_attempts / quiz_wrong_answers 資料表、RLS、RPC 函式 |

---

## 任務 1：Supabase 資料表 + RLS + RPC

> ⚠️ **此任務需人工操作**：前往 Supabase 控制台 → SQL Editor，執行以下 SQL。

**驗證方式：** 在 Supabase 側邊欄 Table Editor 確認三張表存在，且每張表的 "RLS Enabled" 狀態為 ON。

- [ ] **步驟 1：執行建表 SQL**

```sql
-- 測驗記錄（每次完成測驗寫入一筆）
create table if not exists quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  quiz_type    text not null default 'driving',
  score        int  not null,
  total        int  not null,
  attempted_at timestamptz default now()
);

-- 錯題累積記錄（upsert，wrong_count 遞增）
create table if not exists quiz_wrong_answers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  quiz_type     text not null default 'driving',
  question_id   int  not null,
  wrong_count   int  not null default 1,
  last_wrong_at timestamptz default now(),
  unique(user_id, quiz_type, question_id)
);
```

- [ ] **步驟 2：建立 RLS 策略**

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

- [ ] **步驟 3：建立 RPC 函式（原子遞增 wrong_count）**

```sql
create or replace function increment_quiz_wrong_count(
  p_user_id    uuid,
  p_quiz_type  text,
  p_question_id int
) returns void language plpgsql security definer as $$
begin
  insert into quiz_wrong_answers (user_id, quiz_type, question_id, wrong_count, last_wrong_at)
  values (p_user_id, p_quiz_type, p_question_id, 1, now())
  on conflict (user_id, quiz_type, question_id)
  do update set
    wrong_count   = quiz_wrong_answers.wrong_count + 1,
    last_wrong_at = now();
end;
$$;
```

---

## 任務 2：quiz-data.js — 100 題資料檔

**檔案：**
- 新增：`assets/js/quiz-data.js`

**目標：** 建立全局陣列 `QUIZ_DATA`，包含 100 道外免切替是非題。題目來源：`/Users/kit/Downloads/駕照筆試練習題_改寫版.docx`。

- [ ] **步驟 1：用 Python 提取 docx 文字，了解格式**

```bash
python3 - <<'EOF'
import zipfile, xml.etree.ElementTree as ET

docx = '/Users/kit/Downloads/駕照筆試練習題_改寫版.docx'
with zipfile.ZipFile(docx) as z:
    with z.open('word/document.xml') as f:
        tree = ET.parse(f)

ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
paras = tree.getroot().findall('.//w:p', ns)
lines = []
for p in paras:
    text = ''.join(r.text or '' for r in p.findall('.//w:t', ns))
    if text.strip():
        lines.append(text.strip())

for i, l in enumerate(lines[:60]):
    print(f'{i:3}: {l[:100]}')
EOF
```

預期：印出前 60 行的題目文字，可看出題號、題目、答案、解說的格式。

- [ ] **步驟 2：確認附圖題號與 assets/img/quiz/ 的對應**

已知有圖的題號：34, 38, 39, 49, 64, 66, 72, 73, 74, 77, 78, 81, 82, 83, 85, 89, 93, 96, 99, 100

各圖片路徑格式：`"/assets/img/quiz/q034.gif"` 或 `"/assets/img/quiz/q034.png"`（副檔名依實際檔案）。

執行以下指令確認每個圖片的實際副檔名：

```bash
ls /Users/kit/Desktop/Isshohub/assets/img/quiz/ | sort
```

- [ ] **步驟 3：建立 quiz-data.js**

從 docx 提取全部 100 題，寫入下方格式。`id` 為題號（1–100），`answer` 為 `true`（○正確）或 `false`（✕錯誤），`img` 為 null 或圖片路徑。

```javascript
// assets/js/quiz-data.js
const QUIZ_DATA = [
  {
    id: 1,
    q: "（題目文字，從 docx 照抄）",
    answer: true,
    explanation: "（解說文字，從 docx 照抄）",
    img: null,
    tags: []
  },
  // ... 題目 2–33
  {
    id: 34,
    q: "（題目文字）",
    answer: false,
    explanation: "（解說）",
    img: "/assets/img/quiz/q034.gif",
    tags: []
  },
  // ... 繼續全部 100 題
];
```

**注意：**
- 從 docx 原文照抄，不要改寫題目內容
- 答案 ○ → `true`，✕ → `false`
- 有圖的題號（見步驟 2 清單）加上正確的 img 路徑，其餘為 `null`
- `tags` 全部填 `[]`（Phase 2 再補）

- [ ] **步驟 4：Commit**

```bash
git add assets/js/quiz-data.js
git commit -m "feat: 新增外免切替 100 題資料檔"
```

---

## 任務 3：測驗 CSS（styles.css v25 → v26）

**檔案：**
- 修改：`assets/css/styles.css`（在檔案末尾追加）
- 修改：以下 16 個 HTML 檔的 `styles.css?v=25` → `styles.css?v=26`

版本 bump 清單：
```
index.html
biz/index.html  pets/index.html  places/index.html  admin/index.html
tax/index.html  life/index.html  visa/index.html  bookmarks/index.html
news/index.html  house/index.html  article/index.html
article/_template.html  story/index.html  culture/index.html
visa/hsp-calculator/index.html
```

- [ ] **步驟 1：在 styles.css 末尾追加以下 CSS**

```css
/* =====================================================
   Driving Quiz
   ===================================================== */

/* Progress */
.quiz-progress-text { font-size: 12px; color: var(--ink-3, #999); margin-bottom: 6px; }
.quiz-progress-track { background: #e8e4da; border-radius: 999px; height: 5px; margin-bottom: 20px; }
.quiz-progress-fill { background: #a8762f; height: 100%; border-radius: 999px; transition: width .3s ease; }

/* Question card */
.quiz-card { background: #fff; border: 1px solid #e4dfd4; border-radius: 16px; padding: 28px 24px; max-width: 680px; margin: 0 auto; }
.quiz-img { max-width: 100%; max-height: 240px; object-fit: contain; border-radius: 8px; margin-bottom: 16px; display: block; }
.quiz-question { font-size: 17px; line-height: 1.75; color: var(--ink, #1a1714); margin-bottom: 24px; }

/* Answer buttons */
.quiz-btn-row { display: flex; gap: 12px; }
.quiz-btn { flex: 1; padding: 14px 8px; border-radius: 10px; border: 2px solid; font-size: 20px; font-weight: 700; cursor: pointer; background: transparent; transition: background .15s, color .15s; }
.quiz-btn-true  { border-color: #22a45d; color: #22a45d; }
.quiz-btn-false { border-color: #e0341e; color: #e0341e; }
.quiz-btn-true:hover:not(:disabled)  { background: #22a45d; color: #fff; }
.quiz-btn-false:hover:not(:disabled) { background: #e0341e; color: #fff; }
.quiz-btn:disabled { opacity: .38; cursor: not-allowed; }

/* Feedback */
.quiz-feedback { display: none; padding: 16px; border-radius: 10px; margin-top: 16px; }
.quiz-feedback.correct { background: #edfaf3; border: 1px solid #22a45d; }
.quiz-feedback.wrong   { background: #fdf0ee; border: 1px solid #e0341e; }
.quiz-feedback-label { font-weight: 700; font-size: 15px; margin-bottom: 8px; }
.quiz-feedback-explanation { font-size: 13px; line-height: 1.65; color: var(--ink-2, #5a5a4a); }
.quiz-next-btn { display: block; margin-top: 14px; width: 100%; padding: 11px; background: var(--navy-ink, #0d2444); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }

/* Soft banner (guest) */
.quiz-soft-banner { display: none; background: #fff8ec; border: 1px solid #e8c97a; border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; display: none; align-items: center; gap: 10px; font-size: 13px; }
.quiz-soft-banner.visible { display: flex; }
.quiz-soft-banner-msg { flex: 1; }
.quiz-soft-banner-cta { color: #a8762f; font-weight: 600; text-decoration: underline; cursor: pointer; white-space: nowrap; }
.quiz-soft-banner-close { cursor: pointer; color: var(--ink-3, #999); font-size: 18px; line-height: 1; flex-shrink: 0; }

/* Intro scene */
.quiz-intro { max-width: 560px; margin: 48px auto; text-align: center; padding: 0 16px; }
.quiz-intro-title { font-size: 28px; font-weight: 800; color: var(--navy-ink, #0d2444); margin-bottom: 12px; }
.quiz-intro-desc { font-size: 15px; color: var(--ink-2, #5a5a4a); line-height: 1.65; margin-bottom: 28px; }
.quiz-intro-meta { display: flex; justify-content: center; gap: 32px; margin-bottom: 32px; }
.quiz-intro-meta-item { text-align: center; }
.quiz-intro-meta-num { display: block; font-size: 36px; font-weight: 800; color: var(--navy-ink, #0d2444); }
.quiz-intro-meta-label { font-size: 12px; color: var(--ink-3, #999); margin-top: 2px; }
.quiz-start-btn { display: inline-block; padding: 14px 28px; background: var(--navy-ink, #0d2444); color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; }
.quiz-start-note { font-size: 12px; color: var(--ink-3, #999); margin-top: 10px; }

/* Result scene */
.quiz-result { max-width: 480px; margin: 48px auto; text-align: center; padding: 0 16px; }
.quiz-result-pct { font-size: 64px; font-weight: 900; color: var(--navy-ink, #0d2444); line-height: 1; }
.quiz-result-label { font-size: 16px; color: var(--ink-2, #5a5a4a); margin: 8px 0 32px; }
.quiz-result-sub { font-size: 14px; color: var(--ink-2, #5a5a4a); margin-bottom: 20px; }
.quiz-result-btns { display: flex; flex-direction: column; gap: 10px; }
.quiz-result-btn-primary { padding: 14px; background: #a8762f; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
.quiz-result-btn-secondary { padding: 13px; background: transparent; color: var(--ink-2, #5a5a4a); border: 1.5px solid #ddd6c8; border-radius: 10px; font-size: 14px; cursor: pointer; }

/* Review scene */
.quiz-review-header { max-width: 680px; margin: 32px auto 20px; padding: 0 16px; display: flex; align-items: center; gap: 12px; }
.quiz-review-back { background: none; border: none; cursor: pointer; color: var(--ink-3, #999); font-size: 13px; padding: 0; }
.quiz-review-title { font-size: 18px; font-weight: 700; }
.quiz-review-list { max-width: 680px; margin: 0 auto; padding: 0 16px 60px; }
.quiz-review-item { background: #fff; border: 1px solid #e4dfd4; border-radius: 12px; padding: 20px; margin-bottom: 10px; }
.quiz-review-num { font-size: 11px; color: var(--ink-3, #999); letter-spacing: .06em; margin-bottom: 8px; }
.quiz-review-img { max-width: 180px; max-height: 140px; object-fit: contain; margin-bottom: 10px; display: block; }
.quiz-review-q { font-size: 15px; line-height: 1.65; font-weight: 500; margin-bottom: 8px; }
.quiz-review-answer { font-size: 13px; color: #e0341e; font-weight: 600; margin-bottom: 4px; }
.quiz-review-explanation { font-size: 13px; color: var(--ink-2, #5a5a4a); line-height: 1.6; }

/* SEO reference section */
.quiz-reference { max-width: 680px; margin: 80px auto 0; padding: 40px 16px 80px; border-top: 1px solid #e4dfd4; }
.quiz-reference-title { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
.quiz-reference-note { font-size: 13px; color: var(--ink-3, #999); margin-bottom: 24px; }
.quiz-reference details { border: 1px solid #e4dfd4; border-radius: 8px; margin-bottom: 6px; }
.quiz-reference summary { padding: 12px 16px; cursor: pointer; font-size: 14px; font-weight: 500; list-style: none; color: var(--ink, #1a1714); }
.quiz-reference summary::-webkit-details-marker { display: none; }
.quiz-reference details[open] summary { border-bottom: 1px solid #e4dfd4; }
.quiz-reference .ref-body { padding: 12px 16px; }
.quiz-reference .ref-answer { font-size: 13px; font-weight: 600; color: var(--navy-ink, #0d2444); margin-bottom: 4px; }
.quiz-reference .ref-explanation { font-size: 13px; color: var(--ink-2, #5a5a4a); line-height: 1.6; }

/* Quiz page layout */
.quiz-page-inner { padding: 32px 0; }
@media (max-width: 600px) {
  .quiz-card { padding: 20px 16px; border-radius: 12px; }
  .quiz-intro-title { font-size: 22px; }
  .quiz-result-pct { font-size: 52px; }
}
```

- [ ] **步驟 2：版本 bump styles.css v25 → v26（批次執行）**

```bash
cd /Users/kit/Desktop/Isshohub
find . -name "*.html" -not -path "./life/driving-quiz/*" \
  -exec sed -i '' 's/styles\.css?v=25/styles.css?v=26/g' {} +
echo "Done. Verify:"
grep -r "styles.css?v=" --include="*.html" . | grep -v "driving-quiz"
```

預期：所有 HTML 全部改為 `v=26`。

- [ ] **步驟 3：Commit**

```bash
git add assets/css/styles.css
git add $(find . -name "*.html" | xargs grep -l "styles.css" | grep -v driving-quiz)
git commit -m "feat: 新增外免切替測驗 CSS，styles.css 升版 v26"
```

---

## 任務 4：driving-quiz.js — 完整測驗引擎

**檔案：**
- 新增：`assets/js/driving-quiz.js`

- [ ] **步驟 1：建立 driving-quiz.js**

```javascript
// assets/js/driving-quiz.js
(function (global) {
  'use strict';

  /* ── 雙語字串 ── */
  var T = {
    tc: {
      intro_title:    '外免切替模擬試題',
      intro_desc:     '正式筆試前的最佳練習。訪客可練習 20 題；登入後解鎖全部 100 題，並記錄錯題。',
      qs_label:       '題',
      mode_guest:     '訪客模式',
      mode_member:    '完整模式',
      start_guest:    '開始測驗（訪客 · 20 題）',
      start_member:   '開始完整測驗（100 題）',
      start_note_guest:  '登入後可練習 100 題 + 記錄錯題',
      start_note_member: '全部 100 題，順序隨機排列',
      progress:       function (cur, tot) { return 'Q' + cur + ' / ' + tot; },
      btn_true:       '○ 正確',
      btn_false:      '✕ 錯誤',
      correct:        '✅ 正確！',
      wrong:          function (ans) { return '❌ 錯誤，正確答案是：' + (ans ? '○ 正確' : '✕ 錯誤'); },
      next:           '下一題 →',
      soft_msg:       '登入後可練習全部 100 題，並追蹤你的錯題',
      soft_cta:       '登入 / 註冊',
      soft_close:     '✕',
      result_score:   function (s, t) { return s + ' / ' + t + ' 答對'; },
      result_pct:     function (s, t) { return Math.round(s / t * 100) + '%'; },
      result_cta_sub: '完整版包含 100 題，並自動記錄你的錯題。',
      btn_register:   '立即免費註冊',
      btn_retry_guest:'再練習一次',
      btn_retry:      '再練習一次',
      btn_review:     function (n) { return '複習本次錯題（' + n + ' 題）'; },
      review_title:   '本次錯題複習',
      review_back:    '← 返回',
      review_answer:  function (ans) { return '正確答案：' + (ans ? '○ 正確' : '✕ 錯誤'); },
      ref_title:      '外免切替筆試題庫參考',
      ref_note:       '以下為全部 100 道練習題，展開可查看答案與解說。',
      ref_answer:     function (ans) { return '答案：' + (ans ? '○ 正確' : '✕ 錯誤'); },
    },
    en: {
      intro_title:    'Driving Licence Conversion Practice',
      intro_desc:     'Practice for the foreign licence conversion written test. Guests get 20 questions; members unlock all 100 + wrong-answer tracking.',
      qs_label:       'Qs',
      mode_guest:     'Guest mode',
      mode_member:    'Full mode',
      start_guest:    'Start Practice (Guest · 20 Qs)',
      start_member:   'Start Full Practice (100 Qs)',
      start_note_guest:  'Sign in to access 100 Qs + track wrong answers',
      start_note_member: 'All 100 questions in random order',
      progress:       function (cur, tot) { return 'Q' + cur + ' / ' + tot; },
      btn_true:       '○ True',
      btn_false:      '✕ False',
      correct:        '✅ Correct!',
      wrong:          function (ans) { return '❌ Wrong. Correct answer: ' + (ans ? '○ True' : '✕ False'); },
      next:           'Next →',
      soft_msg:       'Sign in to practice all 100 questions and track your mistakes',
      soft_cta:       'Sign In / Register',
      soft_close:     '✕',
      result_score:   function (s, t) { return s + ' / ' + t + ' correct'; },
      result_pct:     function (s, t) { return Math.round(s / t * 100) + '%'; },
      result_cta_sub: 'Full version has 100 questions with automatic wrong-answer tracking.',
      btn_register:   'Register Free',
      btn_retry_guest:'Try Again',
      btn_retry:      'Try Again',
      btn_review:     function (n) { return 'Review Wrong Answers (' + n + ')'; },
      review_title:   'Wrong Answer Review',
      review_back:    '← Back',
      review_answer:  function (ans) { return 'Correct answer: ' + (ans ? '○ True' : '✕ False'); },
      ref_title:      'Driving Test Question Reference',
      ref_note:       'All 100 practice questions. Expand each to see the answer and explanation.',
      ref_answer:     function (ans) { return 'Answer: ' + (ans ? '○ True' : '✕ False'); },
    }
  };

  /* ── 狀態 ── */
  var C        = global.IsshoCore;
  var db       = global.IsshoAuth.getClient();
  var user     = null;
  var questions   = [];
  var currentIdx  = 0;
  var score       = 0;
  var sessionWrongs = [];  // 本次錯題（記憶體）
  var softShown   = false;
  var answered    = false;

  /* ── helpers ── */
  function t(key) {
    var lang = C.getLang();
    return (T[lang] || T.tc)[key];
  }
  function tf(key) {  // callable string
    var lang = C.getLang();
    return (T[lang] || T.tc)[key];
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function $(id) { return document.getElementById(id); }

  function showScene(id) {
    ['scene-intro', 'scene-quiz', 'scene-result', 'scene-review'].forEach(function (s) {
      var el = $(s);
      if (el) el.style.display = (s === id) ? '' : 'none';
    });
  }

  /* ── 登入 Modal ── */
  function openLoginModal() {
    var m = $('loginModal');
    if (m) { m.style.display = ''; m.removeAttribute('aria-hidden'); }
  }

  /* ── 更新 Intro UI（依登入狀態）── */
  function updateIntroUI() {
    var lang = C.getLang();
    var tObj = T[lang] || T.tc;
    var isGuest = !user;

    $('intro-title').textContent   = tObj.intro_title;
    $('intro-desc').textContent    = tObj.intro_desc;
    $('intro-qs-num').textContent  = isGuest ? 20 : 100;
    $('intro-qs-label').textContent= tObj.qs_label;
    $('intro-mode').textContent    = isGuest ? tObj.mode_guest : tObj.mode_member;
    $('intro-start-btn').textContent = isGuest ? tObj.start_guest : tObj.start_member;
    $('intro-start-note').textContent= isGuest ? tObj.start_note_guest : tObj.start_note_member;
  }

  /* ── 開始測驗 ── */
  function startQuiz() {
    var isGuest = !user;
    var all = shuffle(QUIZ_DATA.slice());
    questions     = isGuest ? all.slice(0, 20) : all;
    currentIdx    = 0;
    score         = 0;
    sessionWrongs = [];
    softShown     = false;
    showScene('scene-quiz');
    renderQuestion();
  }

  /* ── 渲染題目 ── */
  function renderQuestion() {
    answered = false;
    var q    = questions[currentIdx];
    var lang = C.getLang();
    var tObj = T[lang] || T.tc;
    var total = questions.length;

    /* Progress */
    $('quiz-progress-fill').style.width = (currentIdx / total * 100) + '%';
    $('quiz-progress-text').textContent = tObj.progress(currentIdx + 1, total);

    /* Image */
    var imgEl = $('quiz-img');
    if (q.img) {
      imgEl.src           = q.img;
      imgEl.alt           = '';
      imgEl.style.display = '';
    } else {
      imgEl.style.display = 'none';
    }

    /* Question */
    $('quiz-question').textContent = q.q;

    /* Buttons */
    $('quiz-btn-true').textContent  = tObj.btn_true;
    $('quiz-btn-false').textContent = tObj.btn_false;
    $('quiz-btn-true').disabled  = false;
    $('quiz-btn-false').disabled = false;

    /* Hide feedback */
    var fb = $('quiz-feedback');
    fb.style.display = 'none';
    fb.className     = 'quiz-feedback';

    /* Soft banner (訪客，Q15 之後，只顯示一次) */
    var banner = $('quiz-soft-banner');
    if (!user && currentIdx >= 14 && !softShown) {
      softShown = true;
      banner.classList.add('visible');
      $('soft-msg').textContent = tObj.soft_msg;
      $('soft-cta').textContent = tObj.soft_cta;
      $('soft-close').textContent = tObj.soft_close;
    }
  }

  /* ── 作答 ── */
  function handleAnswer(userAnswer) {
    if (answered) return;
    answered = true;

    var q       = questions[currentIdx];
    var lang    = C.getLang();
    var tObj    = T[lang] || T.tc;
    var correct = (userAnswer === q.answer);

    $('quiz-btn-true').disabled  = true;
    $('quiz-btn-false').disabled = true;

    if (correct) {
      score++;
    } else {
      sessionWrongs.push(q);
      if (user) {
        db.rpc('increment_quiz_wrong_count', {
          p_user_id:     user.id,
          p_quiz_type:   'driving',
          p_question_id: q.id
        }).catch(function () { /* silent fail */ });
      }
    }

    /* Feedback */
    var fb = $('quiz-feedback');
    fb.className     = 'quiz-feedback ' + (correct ? 'correct' : 'wrong');
    fb.style.display = '';
    $('feedback-label').textContent       = correct ? tObj.correct : tObj.wrong(q.answer);
    $('feedback-explanation').textContent = q.explanation;
    $('quiz-next-btn').textContent        = tObj.next;
  }

  /* ── 下一題 ── */
  function nextQuestion() {
    currentIdx++;
    if (currentIdx >= questions.length) {
      endQuiz();
    } else {
      renderQuestion();
    }
  }

  /* ── 完成測驗 ── */
  function endQuiz() {
    if (user) {
      db.from('quiz_attempts').insert({
        user_id:  user.id,
        quiz_type:'driving',
        score:    score,
        total:    questions.length
      }).catch(function () {});
    }
    renderResult();
    showScene('scene-result');
  }

  /* ── 渲染成績頁 ── */
  function renderResult() {
    var lang    = C.getLang();
    var tObj    = T[lang] || T.tc;
    var total   = questions.length;
    var pct     = Math.round(score / total * 100);

    $('result-pct').textContent   = tObj.result_pct(score, total);
    $('result-label').textContent = tObj.result_score(score, total);

    var btns = $('result-btns');
    if (user) {
      var reviewBtn = sessionWrongs.length
        ? '<button class="quiz-result-btn-primary" id="btn-review">' + tObj.btn_review(sessionWrongs.length) + '</button>'
        : '';
      btns.innerHTML = reviewBtn +
        '<button class="quiz-result-btn-secondary" id="btn-retry">' + tObj.btn_retry + '</button>';
      var rb = $('btn-review');
      if (rb) rb.onclick = showReview;
      $('btn-retry').onclick = function () { showScene('scene-intro'); updateIntroUI(); };
    } else {
      btns.innerHTML =
        '<p class="quiz-result-sub">' + tObj.result_cta_sub + '</p>' +
        '<button class="quiz-result-btn-primary" id="btn-register">' + tObj.btn_register + '</button>' +
        '<button class="quiz-result-btn-secondary" id="btn-retry">' + tObj.btn_retry_guest + '</button>';
      $('btn-register').onclick = openLoginModal;
      $('btn-retry').onclick    = function () { showScene('scene-intro'); updateIntroUI(); };
    }
  }

  /* ── 錯題複習 ── */
  function showReview() {
    var lang  = C.getLang();
    var tObj  = T[lang] || T.tc;
    $('review-title').textContent = tObj.review_title;
    $('review-back-btn').textContent = tObj.review_back;
    var list = $('review-list');
    list.innerHTML = sessionWrongs.map(function (q, i) {
      return '<div class="quiz-review-item">' +
        '<div class="quiz-review-num">第 ' + (i + 1) + ' 道錯題</div>' +
        (q.img ? '<img src="' + q.img + '" alt="" class="quiz-review-img">' : '') +
        '<div class="quiz-review-q">' + q.q + '</div>' +
        '<div class="quiz-review-answer">' + tObj.review_answer(q.answer) + '</div>' +
        '<div class="quiz-review-explanation">' + q.explanation + '</div>' +
        '</div>';
    }).join('');
    showScene('scene-review');
  }

  /* ── 語言切換時重新渲染當前 scene ── */
  function onLangChange() {
    var visible = ['scene-intro','scene-quiz','scene-result','scene-review'].find(function (id) {
      var el = $(id);
      return el && el.style.display !== 'none';
    });
    if (visible === 'scene-intro') updateIntroUI();
    if (visible === 'scene-result') renderResult();
    if (visible === 'scene-review') showReview();
    if (visible === 'scene-quiz')   renderQuestion();
  }

  /* ── 初始化 ── */
  function init() {
    /* Auth state */
    IsshoAuth.getUser().then(function (u) {
      user = u;
      updateIntroUI();
    });
    IsshoAuth.onAuthChange(function (event, session) {
      user = session ? session.user : null;
      updateIntroUI();
    });

    /* Intro start button */
    var startBtn = $('intro-start-btn');
    if (startBtn) startBtn.addEventListener('click', startQuiz);

    /* Answer buttons */
    var btnTrue  = $('quiz-btn-true');
    var btnFalse = $('quiz-btn-false');
    if (btnTrue)  btnTrue.addEventListener('click',  function () { handleAnswer(true); });
    if (btnFalse) btnFalse.addEventListener('click', function () { handleAnswer(false); });

    /* Next button */
    var nextBtn = $('quiz-next-btn');
    if (nextBtn) nextBtn.addEventListener('click', nextQuestion);

    /* Soft banner */
    var softCta   = $('soft-cta');
    var softClose = $('soft-close');
    if (softCta)   softCta.addEventListener('click', openLoginModal);
    if (softClose) softClose.addEventListener('click', function () {
      $('quiz-soft-banner').classList.remove('visible');
    });

    /* Review back button */
    var backBtn = $('review-back-btn');
    if (backBtn) backBtn.addEventListener('click', function () {
      renderResult();
      showScene('scene-result');
    });

    /* Language change */
    C.onLangChange(onLangChange);

    /* Show intro */
    showScene('scene-intro');
  }

  /* 等 DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
```

- [ ] **步驟 2：Commit**

```bash
git add assets/js/driving-quiz.js
git commit -m "feat: 新增外免切替測驗引擎 driving-quiz.js"
```

---

## 任務 5：life/driving-quiz/index.html — 完整測驗頁

**檔案：**
- 新增：`life/driving-quiz/index.html`

此檔為複製 `visa/hsp-calculator/index.html` 的 head/nav/footer 結構，再加入 4 個 scene 和 SEO 參考區塊。

- [ ] **步驟 1：建立目錄**

```bash
mkdir -p /Users/kit/Desktop/Isshohub/life/driving-quiz
```

- [ ] **步驟 2：建立 index.html**

將下方完整 HTML 存入 `life/driving-quiz/index.html`。

```html
<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>外免切替模擬試題 100 道練習 — IsshoHub</title>
<meta name="description" content="外免切替（外國駕照換日本駕照）筆試模擬練習。100 道是非題，即時解說，登入後自動記錄錯題。完全免費。" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@400;500;600;700&family=Shippori+Mincho:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Zen+Old+Mincho:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/styles.css?v=26">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><circle cx='40' cy='40' r='36' fill='%230d2444'/><path d='M 40 8 A 32 32 0 0 1 40 72' stroke='%23d9b683' stroke-width='4' fill='none' stroke-linecap='round'/><text x='40' y='48' text-anchor='middle' font-family='Zen Old Mincho, Shippori Mincho, serif' font-size='26' fill='%23f6f3ec' letter-spacing='-1'>%E4%B8%80</text></svg>">
<style>
  .brand .brand-mark, .footer-brand .brand-mark, .modal-brand .brand-mark, .mobile-menu-head .brand-mark {
    background:transparent!important;border:0!important;padding:0!important;color:inherit!important;
    font-size:0!important;line-height:0!important;width:auto!important;height:auto!important;
    box-shadow:none!important;border-radius:0!important;overflow:visible!important;
    display:inline-flex;align-items:center;justify-content:center;
  }
  .brand .brand-mark svg, .footer-brand .brand-mark svg, .modal-brand .brand-mark svg, .mobile-menu-head .brand-mark svg { display:block;width:38px;height:38px; }
  .modal-brand .brand-mark svg { width:44px;height:44px; }
  .footer-brand .brand-mark svg { width:42px;height:42px; }
  .brand-name .hub { color:#a8762f; }
  a.brand, a.brand:hover { text-decoration:none!important; }
  .footer-brand .brand-name .hub { color:#d9b683; }
</style>
</head>
<body>

<!-- ADMIN BAR -->
<div class="admin-bar" id="adminBar" style="display:none">
  <span class="admin-bar-user" id="adminBarUser"></span>
  <div class="admin-bar-actions">
    <a class="admin-btn" href="/admin/"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg> 文章管理</a>
  </div>
</div>

<!-- TOP BAR -->
<div class="topbar">
  <div class="container row">
    <div class="ticker"><span data-i18n="ticker1"></span><span data-i18n="ticker2"></span></div>
    <div class="meta"><span id="eqTopbar" style="display:none"></span><span class="eq-topbar-sep" style="display:none">·</span><span data-i18n="ticker-rate" id="tickerRate"></span></div>
  </div>
</div>

<!-- NAV -->
<nav class="nav">
  <div class="container row">
    <a class="brand" href="/" style="text-decoration:none;outline:none;">
      <div class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="36" fill="#0d2444"/><path d="M 40 8 A 32 32 0 0 1 40 72" stroke="#d9b683" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="40" y="46" text-anchor="middle" font-family="Zen Old Mincho, Shippori Mincho, serif" font-size="22" font-weight="500" fill="#f6f3ec" letter-spacing="-1">一緒</text></svg>
      </div>
      <div><div class="brand-name">Issho<span class="hub">Hub</span></div><div class="brand-tag">In Japan, together.</div></div>
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
      <button class="auth-btn" id="authBtn" data-i18n="login_btn"></button>
    </div>
    <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Menu">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
    </button>
  </div>
</nav>

<!-- BREADCRUMB -->
<div class="container" style="padding-top:16px;padding-bottom:0;">
  <div class="cat-hero-breadcrumb">
    <a href="/">首頁</a><span class="breadcrumb-sep">/</span>
    <a href="/life/">生活</a><span class="breadcrumb-sep">/</span>
    <span class="current">外免切替模擬試題</span>
  </div>
</div>

<!-- MAIN CONTENT -->
<main class="quiz-page-inner container">

  <!-- Scene: Intro -->
  <div id="scene-intro">
    <div class="quiz-intro">
      <div class="quiz-intro-title" id="intro-title">外免切替模擬試題</div>
      <div class="quiz-intro-desc" id="intro-desc"></div>
      <div class="quiz-intro-meta">
        <div class="quiz-intro-meta-item">
          <span class="quiz-intro-meta-num" id="intro-qs-num">20</span>
          <div class="quiz-intro-meta-label" id="intro-qs-label">題</div>
        </div>
        <div class="quiz-intro-meta-item">
          <span class="quiz-intro-meta-num">○/✕</span>
          <div class="quiz-intro-meta-label">是非題</div>
        </div>
        <div class="quiz-intro-meta-item">
          <span class="quiz-intro-meta-num" id="intro-mode">訪客</span>
          <div class="quiz-intro-meta-label">模式</div>
        </div>
      </div>
      <button class="quiz-start-btn" id="intro-start-btn">開始測驗</button>
      <div class="quiz-start-note" id="intro-start-note"></div>
    </div>
  </div>

  <!-- Scene: Quiz -->
  <div id="scene-quiz" style="display:none">
    <!-- Soft banner (guest only, shown after Q15) -->
    <div class="quiz-soft-banner" id="quiz-soft-banner">
      <span class="quiz-soft-banner-msg" id="soft-msg"></span>
      <span class="quiz-soft-banner-cta" id="soft-cta"></span>
      <span class="quiz-soft-banner-close" id="soft-close">✕</span>
    </div>

    <div class="quiz-progress-text" id="quiz-progress-text">Q1 / 20</div>
    <div class="quiz-progress-track">
      <div class="quiz-progress-fill" id="quiz-progress-fill" style="width:0%"></div>
    </div>

    <div class="quiz-card">
      <img id="quiz-img" src="" alt="" class="quiz-img" style="display:none">
      <div class="quiz-question" id="quiz-question"></div>
      <div class="quiz-btn-row">
        <button class="quiz-btn quiz-btn-true"  id="quiz-btn-true">○ 正確</button>
        <button class="quiz-btn quiz-btn-false" id="quiz-btn-false">✕ 錯誤</button>
      </div>
      <div class="quiz-feedback" id="quiz-feedback">
        <div class="quiz-feedback-label" id="feedback-label"></div>
        <div class="quiz-feedback-explanation" id="feedback-explanation"></div>
        <button class="quiz-next-btn" id="quiz-next-btn">下一題 →</button>
      </div>
    </div>
  </div>

  <!-- Scene: Result -->
  <div id="scene-result" style="display:none">
    <div class="quiz-result">
      <div class="quiz-result-pct" id="result-pct">—%</div>
      <div class="quiz-result-label" id="result-label"></div>
      <div class="quiz-result-btns" id="result-btns"></div>
    </div>
  </div>

  <!-- Scene: Review -->
  <div id="scene-review" style="display:none">
    <div class="quiz-review-header">
      <button class="quiz-review-back" id="review-back-btn">← 返回</button>
      <div class="quiz-review-title" id="review-title">本次錯題複習</div>
    </div>
    <div class="quiz-review-list" id="review-list"></div>
  </div>

</main>

<!-- SEO 靜態參考區塊：由實作者從 quiz-data.js 生成 100 個 <details> 元素填入此處 -->
<section class="quiz-reference" id="question-reference">
  <h2 class="quiz-reference-title">外免切替筆試題庫參考</h2>
  <p class="quiz-reference-note">以下為全部 100 道練習題，展開可查看答案與解說。</p>
  <!-- [實作者：執行步驟 3 的腳本生成 100 個 <details> 並貼入此處] -->
</section>

<!-- FOOTER（從 life/index.html 複製完整 footer HTML） -->
<!-- [實作者：複製 life/index.html 中 <footer class="footer"> ... </footer> 的完整 HTML 貼入此處] -->

<!-- LOGIN MODAL（從 visa/hsp-calculator/index.html 複製完整 modal HTML） -->
<!-- [實作者：複製 visa/hsp-calculator/index.html 中 <div class="modal-overlay" ... 的完整 HTML 貼入此處] -->

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="/assets/js/data.js?v=4"></script>
<script src="/assets/js/supabase-client.js?v=7"></script>
<script src="/assets/js/core.js?v=9"></script>
<script src="/assets/js/quiz-data.js"></script>
<script src="/assets/js/driving-quiz.js"></script>
<script>
(function () {
  window.IsshoCore.init('life');
})();
</script>
</body>
</html>
```

- [ ] **步驟 3：生成 SEO 參考區塊的 100 個 details 元素**

執行以下 Node.js 腳本，生成 HTML 並貼入 `<section class="quiz-reference">` 中（替換注釋行）：

```bash
node -e "
const data = require('/Users/kit/Desktop/Isshohub/assets/js/quiz-data.js');
// 注意：quiz-data.js 用 const QUIZ_DATA = [...] 定義全局，Node 環境需 eval
"
```

由於 `quiz-data.js` 用瀏覽器全局方式定義，用以下方式提取：

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('/Users/kit/Desktop/Isshohub/assets/js/quiz-data.js', 'utf8');
// 提取陣列部分
const match = src.match(/const QUIZ_DATA = (\[[\s\S]*?\]);/);
if (!match) { console.error('QUIZ_DATA not found'); process.exit(1); }
const data = eval(match[1]);
const html = data.map(function(q) {
  const ans = q.answer ? '○ 正確' : '✕ 錯誤';
  return '<details>\n  <summary>第 ' + q.id + ' 題：' + q.q.slice(0, 40) + (q.q.length > 40 ? '...' : '') + '</summary>\n  <div class=\"ref-body\"><div class=\"ref-answer\">答案：' + ans + '</div><div class=\"ref-explanation\">' + q.explanation + '</div></div>\n</details>';
}).join('\n');
console.log(html);
" > /tmp/quiz-reference.html
wc -l /tmp/quiz-reference.html
head -20 /tmp/quiz-reference.html
```

將 `/tmp/quiz-reference.html` 的內容貼入 `index.html` 的 `<section class="quiz-reference">` 內（替換注釋行）。

- [ ] **步驟 4：複製 footer 和 login modal**

```bash
# 從 visa/hsp-calculator/index.html 提取 footer
grep -n "<footer\|</footer>" /Users/kit/Desktop/Isshohub/visa/hsp-calculator/index.html

# 從 visa/hsp-calculator/index.html 提取 modal
grep -n "modal-overlay\|</div>.*modal" /Users/kit/Desktop/Isshohub/visa/hsp-calculator/index.html
```

用 Read 工具讀取對應行號的完整 HTML，貼入 `life/driving-quiz/index.html` 對應的注釋位置。

- [ ] **步驟 5：在瀏覽器驗證頁面可正常載入**

```bash
# 確認檔案存在且有內容
wc -l /Users/kit/Desktop/Isshohub/life/driving-quiz/index.html
```

開啟 `life/driving-quiz/index.html`（本地開啟或透過 dev server），確認：
- Intro scene 顯示，有開始按鈕
- 點「開始測驗」進入 quiz scene，題目顯示
- 點 ○ 或 ✕，出現 feedback + 解說
- 點「下一題」可進入下一道

- [ ] **步驟 6：Commit**

```bash
git add life/driving-quiz/index.html
git commit -m "feat: 新增外免切替模擬試題頁 /life/driving-quiz/"
```

---

## 任務 6：category-page.js 工具字卡支援 + life/index.html 整合

**檔案：**
- 修改：`assets/js/category-page.js`（v10 → v11）
- 修改：`life/index.html`

### 6-A：category-page.js 加入 toolCard 選項

- [ ] **步驟 1：修改 init 函式簽名（category-page.js:58）**

找到：
```javascript
    init: function (categoryKey) {
```
改為：
```javascript
    init: function (categoryKey, options) {
      options = options || {};
```

- [ ] **步驟 2：在 `let _featuredOrder = [];` 之後加入工具卡變數（category-page.js:71 附近）**

找到：
```javascript
      let _featuredOrder = [];
```
改為：
```javascript
      let _featuredOrder = [];
      var _toolCardSubs  = (options.toolCard && options.toolCard.subs) || [];
      var _buildToolCard = (options.toolCard && options.toolCard.build) || null;
```

- [ ] **步驟 3：修改 filterAndRender 中的 articles grid 渲染（category-page.js:241 附近）**

找到：
```javascript
            var gridArticles = !activeSub ? articles.filter(function (a) { return a.id !== _featuredId; }) : filtered;
            if (gridArticles.length) {
              articlesGrid.innerHTML = gridArticles.map(function (a) { return sbCardHTML(a, lang); }).join('');
            } else if (articles.length) {
              articlesGrid.innerHTML = emptyHTML(lang);
            } else {
              /* No Supabase articles — fallback to static */
              var staticArticles = D[categoryKey + '_articles'];
              if (staticArticles && staticArticles.length && C.cardHTML) {
                articlesGrid.innerHTML = staticArticles.map(function (a) { return C.cardHTML(a); }).join('');
              } else {
                articlesGrid.innerHTML = emptyHTML(lang);
              }
            }
```

改為：
```javascript
            var gridArticles = !activeSub ? articles.filter(function (a) { return a.id !== _featuredId; }) : filtered;
            var _showTool = _buildToolCard && _toolCardSubs.indexOf(activeSub) !== -1;
            var _toolHtml = _showTool ? _buildToolCard(lang) : '';
            function _injectTool(htmlArr) {
              if (!_toolHtml) return htmlArr.join('');
              return htmlArr.slice(0, 2).join('') + _toolHtml + htmlArr.slice(2).join('');
            }
            if (gridArticles.length) {
              articlesGrid.innerHTML = _injectTool(gridArticles.map(function (a) { return sbCardHTML(a, lang); }));
            } else if (articles.length) {
              articlesGrid.innerHTML = _toolHtml + emptyHTML(lang);
            } else {
              /* No Supabase articles — fallback to static */
              var staticArticles = D[categoryKey + '_articles'];
              if (staticArticles && staticArticles.length && C.cardHTML) {
                articlesGrid.innerHTML = _injectTool(staticArticles.map(function (a) { return C.cardHTML(a); }));
              } else {
                articlesGrid.innerHTML = _toolHtml + emptyHTML(lang);
              }
            }
```

- [ ] **步驟 4：在 life/index.html 更新 category-page.js 版本號**

找到：
```html
<script src="/assets/js/category-page.js?v=10"></script>
```
改為：
```html
<script src="/assets/js/category-page.js?v=11"></script>
```

### 6-B：life/index.html 加入工具字卡函式 + init 呼叫

- [ ] **步驟 5：在 life/index.html 的 `<script>` 區塊中加入工具字卡函式**

找到：
```javascript
(function(){
  var D=window.ISSHO_DATA,meta=(D.cat_meta||{})['life']||{};
```

在此行之前插入：

```javascript
function buildDrivingQuizToolCard(lang) {
  var L = lang === 'tc';
  return '<div class="hsp-tool-card">' +
    '<div class="hsp-tool-card-eyebrow">— TOOL · ' + (L ? '實用工具' : 'Tool') + '</div>' +
    '<div class="hsp-tool-card-icon">' +
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="2" y="7" width="20" height="14" rx="2"/>' +
        '<path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>' +
        '<circle cx="8" cy="14" r="1.2" fill="currentColor" stroke="none"/>' +
        '<circle cx="16" cy="14" r="1.2" fill="currentColor" stroke="none"/>' +
        '<path d="M8 14h8"/>' +
      '</svg>' +
    '</div>' +
    '<div class="hsp-tool-card-title">' + (L ? '外免切替模擬試題' : 'Driving Test Practice') + '</div>' +
    '<div class="hsp-tool-card-desc">' + (L
      ? '免費練習 100 道外免切替筆試是非題，每題附即時解說。登入後系統自動記錄錯題。'
      : 'Practice 100 true/false questions for the foreign licence conversion written test. Instant explanations, wrong-answer tracking for members.'
    ) + '</div>' +
    '<a href="/life/driving-quiz/" class="hsp-tool-card-btn">' + (L ? '開始練習 →' : 'Start Practice →') + '</a>' +
    '</div>';
}
```

- [ ] **步驟 6：將 IsshoCategory.init 呼叫改為帶 options**

找到：
```javascript
  window.IsshoCategory.init('life');
```
改為：
```javascript
  window.IsshoCategory.init('life', {
    toolCard: {
      subs: ['licence'],
      build: buildDrivingQuizToolCard
    }
  });
```

- [ ] **步驟 7：在瀏覽器驗證工具字卡顯示**

開啟 `/life/` 頁，點擊「外免切替」子分類標籤，確認：
- 工具字卡出現在文章列表第 2 和第 3 篇之間
- 工具字卡在其他子分類（交通規則、銀行戶口等）時**不顯示**
- 點「開始練習 →」正確跳轉到 `/life/driving-quiz/`
- 語言切換後字卡文字即時更新

- [ ] **步驟 8：Commit**

```bash
git add assets/js/category-page.js life/index.html
git commit -m "feat: life 頁外免切替子分類加入模擬試題工具字卡"
```

---

## 最終驗證清單

完成全部 6 個任務後，執行以下驗證：

- [ ] `/life/driving-quiz/` 頁可正常開啟，無 JS console 錯誤
- [ ] 訪客模式：正確抽取 20 題，Q15 後顯示 soft banner，完成後強 CTA 出現
- [ ] 會員模式：登入後 intro 顯示 100 題按鈕，完成後有錯題複習入口
- [ ] 有圖題（如第 34 題）正確顯示圖片
- [ ] Supabase：完成測驗後 `quiz_attempts` 有新紀錄
- [ ] Supabase：答錯題後 `quiz_wrong_answers` 有新紀錄或 wrong_count 遞增
- [ ] `life/` 頁外免切替子分類顯示工具字卡，其他子分類不顯示
- [ ] 語言切換（TC/EN）在每個 scene 均正常更新文字
- [ ] SEO 參考區塊有 100 個 `<details>` 元素
- [ ] `styles.css?v=26` 在所有 HTML 檔中已同步
