# 高度專門職積分試算器 實現計劃

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推薦）或 superpowers:executing-plans 逐任務實現此計劃。步驟使用複選框（`- [ ]`）語法來跟蹤進度。

**目標：** 在 `visa/index.html` 的高度專門職區塊嵌入互動式積分試算器，支援三條路徑、即時計分、雙語顯示、結果建議。

**架構：** 純前端 Vanilla JS，積分邏輯與 UI 全部封裝在 `assets/js/hsp-calculator.js`；樣式追加至 `assets/css/styles.css` 末尾；`visa/index.html` 加入容器 div 與 script tag。語言跟隨 `IsshoCore.onLangChange()`。

**技術棧：** HTML + CSS + Vanilla JS（ES5 compatible IIFE）、`IsshoCore.getLang()`、`IsshoCore.onLangChange()`

---

## 檔案結構

| 檔案 | 變更類型 | 職責 |
|------|----------|------|
| `assets/js/hsp-calculator.js` | **新增** | 積分數據表、UI 渲染、計分邏輯、結果建議 |
| `assets/css/styles.css` | **追加** | 計算器版面樣式（路徑選擇、問題區、分數欄、結果區、手機版） |
| `visa/index.html` | **修改** | 加入 `#hsp` 容器 div 於文章區上方；加入 `<script>` 載入計算器 |

---

## 任務 1：建立積分數據表（hsp-calculator.js 骨架）

**檔案：**
- 新增：`assets/js/hsp-calculator.js`

- [ ] **步驟 1：建立 IIFE 骨架與三路徑積分數據表**

建立 `/Users/kit/Desktop/Isshohub/assets/js/hsp-calculator.js`，內容如下：

```javascript
(function (global) {
  'use strict';

  /* ── 積分數據表 ── */
  var SCORES = {

    /* 學歷 — academic */
    edu_academic: [
      { value: 'phd',      pts: 30, tc: '博士學位',               en: 'Doctoral degree' },
      { value: 'master',   pts: 20, tc: '碩士學位',               en: "Master's degree" },
      { value: 'bachelor', pts: 10, tc: '學士學位',               en: "Bachelor's degree" },
      { value: 'none',     pts: 0,  tc: '以上均無',               en: 'None of the above' },
    ],
    /* 學歷 — technical */
    edu_technical: [
      { value: 'phd',      pts: 30, tc: '博士學位',               en: 'Doctoral degree' },
      { value: 'mba',      pts: 25, tc: 'MBA / MOT',              en: 'MBA / MOT' },
      { value: 'master',   pts: 20, tc: '碩士學位',               en: "Master's degree" },
      { value: 'bachelor', pts: 10, tc: '學士學位',               en: "Bachelor's degree" },
      { value: 'none',     pts: 0,  tc: '以上均無',               en: 'None of the above' },
    ],
    /* 學歷 — business */
    edu_business: [
      { value: 'mba',      pts: 25, tc: 'MBA / MOT',              en: 'MBA / MOT' },
      { value: 'phd_msc',  pts: 20, tc: '博士／碩士學位',          en: 'Doctoral / Master\'s degree' },
      { value: 'bachelor', pts: 10, tc: '學士學位',               en: "Bachelor's degree" },
      { value: 'none',     pts: 0,  tc: '以上均無',               en: 'None of the above' },
    ],

    /* 多領域雙學位 +5（所有路徑） */
    dual_degree: { pts: 5, tc: '同時持有不同專業的雙學位 +5', en: 'Dual degree across different fields +5' },

    /* 職業經歷 — academic */
    exp_academic: [
      { value: '7+', pts: 15, tc: '7年以上', en: '7 years or more' },
      { value: '5+', pts: 10, tc: '5年以上', en: '5 years or more' },
      { value: '3+', pts: 5,  tc: '3年以上', en: '3 years or more' },
      { value: '0',  pts: 0,  tc: '3年未滿', en: 'Less than 3 years' },
    ],
    /* 職業經歷 — technical */
    exp_technical: [
      { value: '10+', pts: 20, tc: '10年以上', en: '10 years or more' },
      { value: '7+',  pts: 15, tc: '7年以上',  en: '7 years or more' },
      { value: '5+',  pts: 10, tc: '5年以上',  en: '5 years or more' },
      { value: '3+',  pts: 5,  tc: '3年以上',  en: '3 years or more' },
      { value: '0',   pts: 0,  tc: '3年未滿',  en: 'Less than 3 years' },
    ],
    /* 職業經歷 — business */
    exp_business: [
      { value: '10+', pts: 25, tc: '10年以上', en: '10 years or more' },
      { value: '7+',  pts: 20, tc: '7年以上',  en: '7 years or more' },
      { value: '5+',  pts: 15, tc: '5年以上',  en: '5 years or more' },
      { value: '3+',  pts: 10, tc: '3年以上',  en: '3 years or more' },
      { value: '0',   pts: 0,  tc: '3年未滿',  en: 'Less than 3 years' },
    ],

    /* 年齡（academic / technical 共用；business 無年齡加分） */
    age: [
      { value: 'u30', pts: 15, tc: '29歲以下', en: 'Under 30' },
      { value: '30',  pts: 10, tc: '30–34歲',  en: '30–34' },
      { value: '35',  pts: 5,  tc: '35–39歲',  en: '35–39' },
      { value: '40+', pts: 0,  tc: '40歲以上', en: '40 or above' },
    ],

    /* 年收入 — academic / technical（年齡分層）
       salary_at[age_band] = 對應可選薪資等級陣列
       age_band: 'u30' | '30' | '35' | '40+'
    */
    salary_academic: {
      u30: [
        { value: '1000+', pts: 40, tc: '1,000萬日圓以上',   en: '¥10M+' },
        { value: '900',   pts: 35, tc: '900–1,000萬',       en: '¥9M–10M' },
        { value: '800',   pts: 30, tc: '800–900萬',         en: '¥8M–9M' },
        { value: '700',   pts: 25, tc: '700–800萬',         en: '¥7M–8M' },
        { value: '600',   pts: 20, tc: '600–700萬',         en: '¥6M–7M' },
        { value: '500',   pts: 15, tc: '500–600萬',         en: '¥5M–6M' },
        { value: '400',   pts: 10, tc: '400–500萬',         en: '¥4M–5M' },
        { value: '0',     pts: 0,  tc: '400萬未滿',         en: 'Under ¥4M' },
      ],
      '30': [
        { value: '1000+', pts: 40, tc: '1,000萬日圓以上',   en: '¥10M+' },
        { value: '900',   pts: 35, tc: '900–1,000萬',       en: '¥9M–10M' },
        { value: '800',   pts: 30, tc: '800–900萬',         en: '¥8M–9M' },
        { value: '700',   pts: 25, tc: '700–800萬',         en: '¥7M–8M' },
        { value: '600',   pts: 20, tc: '600–700萬',         en: '¥6M–7M' },
        { value: '500',   pts: 15, tc: '500–600萬',         en: '¥5M–6M' },
        { value: '0',     pts: 0,  tc: '500萬未滿',         en: 'Under ¥5M' },
      ],
      '35': [
        { value: '1000+', pts: 40, tc: '1,000萬日圓以上',   en: '¥10M+' },
        { value: '900',   pts: 35, tc: '900–1,000萬',       en: '¥9M–10M' },
        { value: '800',   pts: 30, tc: '800–900萬',         en: '¥8M–9M' },
        { value: '700',   pts: 25, tc: '700–800萬',         en: '¥7M–8M' },
        { value: '600',   pts: 20, tc: '600–700萬',         en: '¥6M–7M' },
        { value: '0',     pts: 0,  tc: '600萬未滿',         en: 'Under ¥6M' },
      ],
      '40+': [
        { value: '1000+', pts: 40, tc: '1,000萬日圓以上',   en: '¥10M+' },
        { value: '900',   pts: 35, tc: '900–1,000萬',       en: '¥9M–10M' },
        { value: '800',   pts: 30, tc: '800–900萬',         en: '¥8M–9M' },
        { value: '0',     pts: 0,  tc: '800萬未滿',         en: 'Under ¥8M' },
      ],
    },

    /* 年收入 — business（無年齡分層） */
    salary_business: [
      { value: '3000+', pts: 50, tc: '3,000萬以上',   en: '¥30M+' },
      { value: '2500',  pts: 40, tc: '2,500–3,000萬', en: '¥25M–30M' },
      { value: '2000',  pts: 30, tc: '2,000–2,500萬', en: '¥20M–25M' },
      { value: '1500',  pts: 20, tc: '1,500–2,000萬', en: '¥15M–20M' },
      { value: '1000',  pts: 10, tc: '1,000–1,500萬', en: '¥10M–15M' },
      { value: '0',     pts: 0,  tc: '1,000萬未滿（最低300萬）', en: 'Under ¥10M (min ¥3M)' },
    ],

    /* 特別加算（所有路徑，多選，key → pts） */
    bonus: [
      { key: 'innovation_co',    pts: 10, tc: '任職創新支援指定企業',                   en: 'Working at a designated innovation-support company' },
      { key: 'innovation_sme',   pts: 10, tc: '上述企業且屬中小企業（需同時選上項）',    en: 'Above company is an SME (select above item too)' },
      { key: 'local_gov',        pts: 10, tc: '任職地方政府特定機構',                   en: 'Working at a designated local government institution' },
      { key: 'sme_rnd',          pts: 5,  tc: '中小企業研發費比率 >3%',                 en: 'SME with R&D expense ratio >3%' },
      { key: 'foreign_qual',     pts: 5,  tc: '外國業務相關資格／表彰',                  en: 'Foreign business qualification or commendation' },
      { key: 'jp_uni',           pts: 10, tc: '畢業於日本大學或研究所',                 en: 'Graduated from a Japanese university or graduate school' },
      { key: 'jlpt_n1',          pts: 15, tc: '日語 N1 或日語專業學位',                 en: 'JLPT N1 or Japanese language major' },
      { key: 'jlpt_n2',          pts: 10, tc: '日語 N2（不可與N1重複）',               en: 'JLPT N2 (cannot combine with N1)' },
      { key: 'growth_field',     pts: 10, tc: '成長領域先端項目',                       en: 'Leading project in growth sector' },
      { key: 'top_uni',          pts: 10, tc: '世界排名前300大學（QS/THE/上交大任2項）或Top Global校', en: 'Top 300 world university (2 of QS/THE/SJTU) or Top Global' },
      { key: 'jica',             pts: 5,  tc: 'JICA Innovative Asia 培訓1年以上',      en: 'JICA Innovative Asia training (1+ year)' },
    ],

    /* 研究業績 — academic（2項以上→25分，1項→20分） */
    research_academic: [
      { key: 'patent',   tc: '至少1項專利發明',                     en: 'At least 1 patent invention' },
      { key: 'grant',    tc: '外國政府競爭性補助3次以上',             en: '3+ competitive grants from foreign governments' },
      { key: 'paper',    tc: '學術期刊論文3篇以上（通訊作者）',       en: '3+ academic papers (corresponding author)' },
      { key: 'other',    tc: '其他法務大臣認定業績',                  en: 'Other achievements recognized by Minister of Justice' },
    ],

    /* 研究業績 — technical（各項獨立15分） */
    research_technical: [
      { key: 'patent',   pts: 15, tc: '專利發明',                    en: 'Patent invention' },
      { key: 'grant',    pts: 15, tc: '外國政府競爭性補助3次以上',     en: '3+ competitive grants from foreign governments' },
      { key: 'paper',    pts: 15, tc: '學術期刊論文3篇以上',           en: '3+ academic papers' },
      { key: 'other',    pts: 15, tc: '其他法務大臣認定業績',          en: 'Other achievements recognized by Minister of Justice' },
    ],

    /* 獨有 — technical */
    tech_qual: [
      { value: '2+', pts: 10, tc: '2個以上日本國家資格',    en: '2+ Japanese national qualifications' },
      { value: '1',  pts: 5,  tc: '1個日本國家資格',        en: '1 Japanese national qualification' },
      { value: '0',  pts: 0,  tc: '無',                    en: 'None' },
    ],
    tech_invest: { pts: 10, tc: '從事投資運用相關業務', en: 'Engaged in investment management operations' },

    /* 獨有 — business */
    biz_position: [
      { value: 'rep',    pts: 10, tc: '代表取締役／代表執行役員', en: 'Representative Director / Representative Executive Officer' },
      { value: 'dir',    pts: 5,  tc: '取締役／執行役員／執行社員', en: 'Director / Executive Officer / Executive Member' },
      { value: 'none',   pts: 0,  tc: '上述職位以外',            en: 'None of the above' },
    ],
    biz_invest: { pts: 5, tc: '對日本投資1億日圓以上', en: 'Invested ¥100M+ in Japan' },
  };

  /* ── 語言輔助 ── */
  function t(obj) {
    var lang = (window.IsshoCore && window.IsshoCore.getLang()) || 'tc';
    return lang === 'tc' ? obj.tc : obj.en;
  }

  global.IsshoHSP = { SCORES: SCORES, t: t };

})(window);
```

- [ ] **步驟 2：在瀏覽器 console 驗證數據表載入**

載入頁面後執行：
```javascript
console.log(Object.keys(window.IsshoHSP.SCORES));
// 預期輸出包含：['edu_academic', 'edu_technical', 'edu_business', 'dual_degree', ...]
console.log(window.IsshoHSP.SCORES.age.length); // 預期：4
console.log(window.IsshoHSP.SCORES.bonus.length); // 預期：11
```

- [ ] **步驟 3：Commit**

```bash
git add assets/js/hsp-calculator.js
git commit -m "feat: hsp-calculator 積分數據表骨架"
```

---

## 任務 2：計分邏輯函數

**檔案：**
- 修改：`assets/js/hsp-calculator.js`（在 `global.IsshoHSP = ...` 之前追加）

- [ ] **步驟 1：追加 `calcScore(state)` 函數**

在 `global.IsshoHSP = ...` 那一行之前，插入：

```javascript
  /* ── 計分函數 ── */
  /* state 結構：
    {
      path: 'academic' | 'technical' | 'business',
      edu: string (value from edu_* array),
      dual: boolean,
      exp: string (value from exp_* array),
      age: string (value from age array),
      salary: string (value),
      research: string[] (keys, academic/technical only),
      bonus: string[] (keys from bonus array),
      tech_qual: string (technical only),
      tech_invest: boolean (technical only),
      biz_position: string (business only),
      biz_invest: boolean (business only),
    }
  */
  function calcScore(state) {
    var breakdown = {};
    var total = 0;

    function add(key, pts) {
      breakdown[key] = pts;
      total += pts;
    }

    var path = state.path;
    var S = SCORES;

    /* 學歷 */
    var eduList = path === 'academic' ? S.edu_academic
                : path === 'technical' ? S.edu_technical
                : S.edu_business;
    var eduItem = eduList.find(function(e) { return e.value === state.edu; });
    add('edu', eduItem ? eduItem.pts : 0);

    /* 多領域雙學位 */
    add('dual', state.dual ? S.dual_degree.pts : 0);

    /* 職業經歷 */
    var expList = path === 'academic' ? S.exp_academic
                : path === 'technical' ? S.exp_technical
                : S.exp_business;
    var expItem = expList.find(function(e) { return e.value === state.exp; });
    add('exp', expItem ? expItem.pts : 0);

    /* 年齡（business 無年齡加分） */
    if (path !== 'business') {
      var ageItem = S.age.find(function(e) { return e.value === state.age; });
      add('age', ageItem ? ageItem.pts : 0);
    } else {
      add('age', 0);
    }

    /* 年收入 */
    if (path === 'business') {
      var salItem = S.salary_business.find(function(e) { return e.value === state.salary; });
      add('salary', salItem ? salItem.pts : 0);
    } else {
      /* academic / technical 年齡分層 */
      var ageBand = state.age || 'u30';
      var salList = S.salary_academic[ageBand] || S.salary_academic['u30'];
      var salItem2 = salList.find(function(e) { return e.value === state.salary; });
      add('salary', salItem2 ? salItem2.pts : 0);
    }

    /* 研究業績 */
    var resKeys = state.research || [];
    if (path === 'academic') {
      var count = resKeys.length;
      add('research', count >= 2 ? 25 : count === 1 ? 20 : 0);
    } else if (path === 'technical') {
      var resPts = 0;
      S.research_technical.forEach(function(r) {
        if (resKeys.indexOf(r.key) !== -1) resPts += r.pts;
      });
      add('research', resPts);
    } else {
      add('research', 0);
    }

    /* 特別加算 */
    var bonusKeys = state.bonus || [];
    var bonusPts = 0;
    S.bonus.forEach(function(b) {
      if (bonusKeys.indexOf(b.key) !== -1) bonusPts += b.pts;
    });
    add('bonus', bonusPts);

    /* 獨有 — technical */
    if (path === 'technical') {
      var tqItem = S.tech_qual.find(function(e) { return e.value === state.tech_qual; });
      add('tech_qual', tqItem ? tqItem.pts : 0);
      add('tech_invest', state.tech_invest ? S.tech_invest.pts : 0);
    }

    /* 獨有 — business */
    if (path === 'business') {
      var posItem = S.biz_position.find(function(e) { return e.value === state.biz_position; });
      add('biz_position', posItem ? posItem.pts : 0);
      add('biz_invest', state.biz_invest ? S.biz_invest.pts : 0);
    }

    return { total: total, breakdown: breakdown };
  }
```

並更新 `global.IsshoHSP` 的 export：

```javascript
  global.IsshoHSP = { SCORES: SCORES, t: t, calcScore: calcScore };
```

- [ ] **步驟 2：在 console 驗證計分邏輯**

```javascript
// 測試：technical 路徑，博士、10年、40歲、1000萬、日語N1
var result = window.IsshoHSP.calcScore({
  path: 'technical',
  edu: 'phd',        // 30
  dual: false,       // 0
  exp: '10+',        // 20
  age: '40+',        // 0
  salary: '1000+',   // 40
  research: [],      // 0
  bonus: ['jlpt_n1'], // 15
  tech_qual: '0',    // 0
  tech_invest: false // 0
});
console.log(result.total); // 預期：105
console.log(result.breakdown);
// { edu: 30, dual: 0, exp: 20, age: 0, salary: 40, research: 0, bonus: 15, tech_qual: 0, tech_invest: 0 }
```

- [ ] **步驟 3：Commit**

```bash
git add assets/js/hsp-calculator.js
git commit -m "feat: hsp-calculator 計分邏輯 calcScore()"
```

---

## 任務 3：建議邏輯函數

**檔案：**
- 修改：`assets/js/hsp-calculator.js`（在 `global.IsshoHSP = ...` 前追加）

- [ ] **步驟 1：追加 `getSuggestions(state, result)` 函數**

```javascript
  /* ── 建議邏輯 ── */
  function getSuggestions(state, result) {
    if (result.total >= 70) return [];
    var gap = 70 - result.total;
    var suggestions = [];
    var bonusKeys = state.bonus || [];

    /* 日語加分 */
    if (bonusKeys.indexOf('jlpt_n1') === -1 && bonusKeys.indexOf('jlpt_n2') === -1) {
      suggestions.push({
        pts: 15,
        tc: '取得日語 N1 資格可加 +15 分',
        en: 'Passing JLPT N1 adds +15 points'
      });
    } else if (bonusKeys.indexOf('jlpt_n1') === -1 && bonusKeys.indexOf('jlpt_n2') !== -1) {
      suggestions.push({
        pts: 5,
        tc: '將日語從 N2 提升至 N1 可再加 +5 分',
        en: 'Upgrading from JLPT N2 to N1 adds +5 more points'
      });
    }

    /* 日本大學 */
    if (bonusKeys.indexOf('jp_uni') === -1) {
      suggestions.push({
        pts: 10,
        tc: '若畢業於日本大學或研究所可加 +10 分',
        en: 'Graduating from a Japanese university adds +10 points'
      });
    }

    /* 世界排名大學 */
    if (bonusKeys.indexOf('top_uni') === -1) {
      suggestions.push({
        pts: 10,
        tc: '若畢業於世界前300大學（QS/THE/上交大任2項）可加 +10 分',
        en: 'Top 300 world university (2 of QS/THE/SJTU rankings) adds +10 points'
      });
    }

    /* 成長領域 */
    if (bonusKeys.indexOf('growth_field') === -1) {
      suggestions.push({
        pts: 10,
        tc: '從事成長領域先端項目可加 +10 分',
        en: 'Working on a leading project in a growth sector adds +10 points'
      });
    }

    /* 創新支援企業 */
    if (bonusKeys.indexOf('innovation_co') === -1) {
      suggestions.push({
        pts: 10,
        tc: '任職創新支援指定企業可加 +10 分',
        en: 'Working at a designated innovation-support company adds +10 points'
      });
    }

    /* 排序：分數高的建議優先，只取前3條 */
    suggestions.sort(function(a, b) { return b.pts - a.pts; });
    return suggestions.slice(0, 3);
  }
```

並更新 export：

```javascript
  global.IsshoHSP = { SCORES: SCORES, t: t, calcScore: calcScore, getSuggestions: getSuggestions };
```

- [ ] **步驟 2：Commit**

```bash
git add assets/js/hsp-calculator.js
git commit -m "feat: hsp-calculator 建議邏輯 getSuggestions()"
```

---

## 任務 4：UI 渲染函數（HTML 生成）

**檔案：**
- 修改：`assets/js/hsp-calculator.js`

- [ ] **步驟 1：追加 `buildHTML(path, state)` 函數**

在 `global.IsshoHSP = ...` 前追加：

```javascript
  /* ── UI：生成計算器 HTML ── */
  function buildHTML(path, state) {
    var lang = (window.IsshoCore && window.IsshoCore.getLang()) || 'tc';
    var L = lang === 'tc';
    var S = SCORES;

    function radio(name, items, current) {
      return items.map(function(item) {
        return '<label class="hsp-radio-label">' +
          '<input type="radio" name="' + name + '" value="' + item.value + '"' +
          (item.value === current ? ' checked' : '') + '> ' +
          (L ? item.tc : item.en) +
          (item.pts ? ' <span class="hsp-pts">+' + item.pts + '</span>' : '') +
          '</label>';
      }).join('');
    }

    function checkbox(name, items, current) {
      return items.map(function(item) {
        var key = item.key || item.value;
        var checked = (current || []).indexOf(key) !== -1;
        return '<label class="hsp-check-label">' +
          '<input type="checkbox" name="' + name + '" value="' + key + '"' +
          (checked ? ' checked' : '') + '> ' +
          (L ? item.tc : item.en) +
          (item.pts ? ' <span class="hsp-pts">+' + item.pts + '</span>' : '') +
          '</label>';
      }).join('');
    }

    /* 薪資選項（academic/technical 依年齡帶） */
    function salaryOptions() {
      if (path === 'business') {
        return radio('salary', S.salary_business, state.salary);
      }
      var band = state.age || 'u30';
      var list = S.salary_academic[band] || S.salary_academic['u30'];
      return radio('salary', list, state.salary);
    }

    /* 路徑選擇 */
    var paths = [
      { value: 'academic',  tc: '學術研究',  en: 'Academic Research' },
      { value: 'technical', tc: '高度技術',  en: 'Advanced Technical' },
      { value: 'business',  tc: '高度經營',  en: 'Business Management' },
    ];
    var pathHTML = paths.map(function(p) {
      return '<button class="hsp-path-btn' + (p.value === path ? ' active' : '') + '" data-path="' + p.value + '">' +
        (L ? p.tc : p.en) + '</button>';
    }).join('');

    /* 學歷選項 */
    var eduList = path === 'academic' ? S.edu_academic
                : path === 'technical' ? S.edu_technical
                : S.edu_business;

    /* 研究業績區塊（academic / technical 才顯示） */
    var resHTML = '';
    if (path === 'academic') {
      resHTML = '<div class="hsp-section">' +
        '<div class="hsp-section-label">' + (L ? '研究業績（符合2項以上得25分，1項得20分）' : 'Research Achievements (2+ items = 25 pts, 1 item = 20 pts)') + '</div>' +
        checkbox('research', S.research_academic, state.research) +
        '</div>';
    } else if (path === 'technical') {
      resHTML = '<div class="hsp-section">' +
        '<div class="hsp-section-label">' + (L ? '研究業績（各項各 +15 分）' : 'Research Achievements (+15 pts each)') + '</div>' +
        checkbox('research', S.research_technical, state.research) +
        '</div>';
    }

    /* technical 獨有 */
    var techHTML = '';
    if (path === 'technical') {
      techHTML = '<div class="hsp-section">' +
        '<div class="hsp-section-label">' + (L ? '日本國家資格' : 'Japanese National Qualifications') + '</div>' +
        radio('tech_qual', S.tech_qual, state.tech_qual) +
        '<label class="hsp-check-label" style="margin-top:8px">' +
        '<input type="checkbox" name="tech_invest" value="1"' + (state.tech_invest ? ' checked' : '') + '> ' +
        (L ? S.tech_invest.tc : S.tech_invest.en) + ' <span class="hsp-pts">+10</span>' +
        '</label></div>';
    }

    /* business 獨有 */
    var bizHTML = '';
    if (path === 'business') {
      bizHTML = '<div class="hsp-section">' +
        '<div class="hsp-section-label">' + (L ? '職位' : 'Position') + '</div>' +
        radio('biz_position', S.biz_position, state.biz_position) +
        '</div>' +
        '<div class="hsp-section">' +
        '<label class="hsp-check-label">' +
        '<input type="checkbox" name="biz_invest" value="1"' + (state.biz_invest ? ' checked' : '') + '> ' +
        (L ? S.biz_invest.tc : S.biz_invest.en) + ' <span class="hsp-pts">+5</span>' +
        '</label></div>';
    }

    /* 年齡區塊（business 不顯示） */
    var ageHTML = '';
    if (path !== 'business') {
      ageHTML = '<div class="hsp-section">' +
        '<div class="hsp-section-label">' + (L ? '年齡' : 'Age') + '</div>' +
        radio('age', S.age, state.age) +
        '</div>';
    }

    return '<div class="hsp-path-selector">' + pathHTML + '</div>' +
      '<div class="hsp-body">' +
        '<div class="hsp-questions">' +
          '<div class="hsp-section">' +
            '<div class="hsp-section-label">' + (L ? '學歷' : 'Education') + '</div>' +
            radio('edu', eduList, state.edu) +
            '<label class="hsp-check-label hsp-dual">' +
              '<input type="checkbox" name="dual" value="1"' + (state.dual ? ' checked' : '') + '> ' +
              (L ? S.dual_degree.tc : S.dual_degree.en) +
            '</label>' +
          '</div>' +
          '<div class="hsp-section">' +
            '<div class="hsp-section-label">' + (L ? '職業經歷' : 'Work Experience') + '</div>' +
            radio('exp', path === 'academic' ? S.exp_academic : path === 'technical' ? S.exp_technical : S.exp_business, state.exp) +
          '</div>' +
          ageHTML +
          '<div class="hsp-section">' +
            '<div class="hsp-section-label">' + (L ? '年收入（日圓）' : 'Annual Income (JPY)') + '</div>' +
            salaryOptions() +
          '</div>' +
          resHTML +
          techHTML +
          bizHTML +
          '<div class="hsp-section">' +
            '<div class="hsp-section-label">' + (L ? '特別加算（可多選）' : 'Special Bonuses (multi-select)') + '</div>' +
            checkbox('bonus', S.bonus, state.bonus) +
          '</div>' +
        '</div>' +
        '<div class="hsp-score-panel">' +
          '<div class="hsp-score-inner">' +
            '<div class="hsp-score-label">' + (L ? '目前得分' : 'Current Score') + '</div>' +
            '<div class="hsp-score-num" id="hspScoreNum">0</div>' +
            '<div class="hsp-score-bar-wrap"><div class="hsp-score-bar" id="hspScoreBar" style="width:0%"></div></div>' +
            '<div class="hsp-score-threshold">' + (L ? '門檻：70 分' : 'Threshold: 70 pts') + '</div>' +
            '<button class="hsp-result-btn" id="hspResultBtn">' + (L ? '查看結果與建議' : 'View Results & Tips') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="hsp-result" id="hspResult" style="display:none"></div>' +
      '<div class="hsp-disclaimer">' +
        (L ? '本試算器僅供參考，實際資格以入國管理局審核為準。' : 'This calculator is for reference only. Eligibility is subject to official Immigration Bureau review.') +
      '</div>';
  }
```

並更新 export：
```javascript
  global.IsshoHSP = { SCORES: SCORES, t: t, calcScore: calcScore, getSuggestions: getSuggestions, buildHTML: buildHTML };
```

- [ ] **步驟 2：Commit**

```bash
git add assets/js/hsp-calculator.js
git commit -m "feat: hsp-calculator UI buildHTML()"
```

---

## 任務 5：結果區渲染 + 主控函數 init()

**檔案：**
- 修改：`assets/js/hsp-calculator.js`

- [ ] **步驟 1：追加 `renderResult()` 與 `init()` 函數**

在 `global.IsshoHSP = ...` 前追加：

```javascript
  /* ── 結果區渲染 ── */
  function renderResult(result, state) {
    var lang = (window.IsshoCore && window.IsshoCore.getLang()) || 'tc';
    var L = lang === 'tc';
    var total = result.total;
    var gap = 70 - total;
    var suggestions = getSuggestions(state, result);
    var S = SCORES;

    var statusHTML = total >= 70
      ? '<div class="hsp-result-status pass">' + (L ? '✓ 預計達標（70 分以上）' : '✓ Likely Eligible (70+ points)') + '</div>'
      : '<div class="hsp-result-status fail">' + (L ? '✗ 尚未達標，距 70 分還差 ' + gap + ' 分' : '✗ Not yet eligible — ' + gap + ' more points needed') + '</div>';

    /* 細分表 */
    var labels = {
      edu:          { tc: '學歷', en: 'Education' },
      dual:         { tc: '雙學位加分', en: 'Dual Degree Bonus' },
      exp:          { tc: '職業經歷', en: 'Work Experience' },
      age:          { tc: '年齡', en: 'Age' },
      salary:       { tc: '年收入', en: 'Annual Income' },
      research:     { tc: '研究業績', en: 'Research Achievements' },
      bonus:        { tc: '特別加算', en: 'Special Bonuses' },
      tech_qual:    { tc: '國家資格', en: 'National Qualifications' },
      tech_invest:  { tc: '投資運用業務', en: 'Investment Operations' },
      biz_position: { tc: '職位', en: 'Position' },
      biz_invest:   { tc: '對日投資', en: 'Japan Investment' },
    };
    var breakdownHTML = Object.keys(result.breakdown).map(function(key) {
      var pts = result.breakdown[key];
      if (pts === 0 && key === 'dual') return '';
      if (pts === 0 && (key === 'research' || key === 'tech_qual' || key === 'tech_invest' || key === 'biz_position' || key === 'biz_invest')) return '';
      var label = labels[key] ? (L ? labels[key].tc : labels[key].en) : key;
      return '<div class="hsp-breakdown-row">' +
        '<span>' + label + '</span>' +
        '<span class="hsp-breakdown-pts' + (pts > 0 ? ' pos' : '') + '">' + (pts > 0 ? '+' : '') + pts + '</span>' +
        '</div>';
    }).filter(Boolean).join('') +
    '<div class="hsp-breakdown-total">' +
      '<span>' + (L ? '合計' : 'Total') + '</span>' +
      '<span>' + total + ' ' + (L ? '分' : 'pts') + '</span>' +
    '</div>';

    /* 建議 */
    var sugHTML = '';
    if (suggestions.length && total < 70) {
      sugHTML = '<div class="hsp-suggestions">' +
        '<div class="hsp-sug-title">' + (L ? '可提升分數的方向：' : 'Ways to increase your score:') + '</div>' +
        suggestions.map(function(s) {
          return '<div class="hsp-sug-item"><span class="hsp-sug-pts">+' + s.pts + '</span>' + (L ? s.tc : s.en) + '</div>';
        }).join('') +
        '</div>';
    }

    return statusHTML + '<div class="hsp-breakdown">' + breakdownHTML + '</div>' + sugHTML;
  }

  /* ── 主控函數 ── */
  function init() {
    var el = document.getElementById('hspCalculator');
    if (!el) return;

    var state = {
      path: 'technical',
      edu: 'none', dual: false, exp: '0', age: 'u30', salary: '0',
      research: [], bonus: [],
      tech_qual: '0', tech_invest: false,
      biz_position: 'none', biz_invest: false,
    };

    function updateScore() {
      var result = calcScore(state);
      var numEl = document.getElementById('hspScoreNum');
      var barEl = document.getElementById('hspScoreBar');
      if (numEl) numEl.textContent = result.total;
      if (barEl) barEl.style.width = Math.min(100, (result.total / 120) * 100) + '%';
    }

    function render() {
      el.innerHTML = buildHTML(state.path, state);
      updateScore();
      bindEvents();
    }

    function bindEvents() {
      /* 路徑切換 */
      el.querySelectorAll('.hsp-path-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          state.path = btn.dataset.path;
          state.salary = '0'; state.research = [];
          state.tech_qual = '0'; state.tech_invest = false;
          state.biz_position = 'none'; state.biz_invest = false;
          render();
        });
      });

      /* radio inputs */
      el.querySelectorAll('input[type="radio"]').forEach(function(inp) {
        inp.addEventListener('change', function() {
          var name = inp.name;
          if (name === 'edu') state.edu = inp.value;
          else if (name === 'exp') state.exp = inp.value;
          else if (name === 'age') { state.age = inp.value; state.salary = '0'; render(); return; }
          else if (name === 'salary') state.salary = inp.value;
          else if (name === 'tech_qual') state.tech_qual = inp.value;
          else if (name === 'biz_position') state.biz_position = inp.value;
          updateScore();
        });
      });

      /* checkbox inputs */
      el.querySelectorAll('input[type="checkbox"]').forEach(function(inp) {
        inp.addEventListener('change', function() {
          var name = inp.name;
          if (name === 'dual') { state.dual = inp.checked; }
          else if (name === 'tech_invest') { state.tech_invest = inp.checked; }
          else if (name === 'biz_invest') { state.biz_invest = inp.checked; }
          else if (name === 'research') {
            if (inp.checked) { if (state.research.indexOf(inp.value) === -1) state.research.push(inp.value); }
            else { state.research = state.research.filter(function(k) { return k !== inp.value; }); }
          } else if (name === 'bonus') {
            if (inp.checked) { if (state.bonus.indexOf(inp.value) === -1) state.bonus.push(inp.value); }
            else { state.bonus = state.bonus.filter(function(k) { return k !== inp.value; }); }
          }
          updateScore();
        });
      });

      /* 查看結果按鈕 */
      var resultBtn = document.getElementById('hspResultBtn');
      var resultEl = document.getElementById('hspResult');
      if (resultBtn && resultEl) {
        resultBtn.addEventListener('click', function() {
          var result = calcScore(state);
          resultEl.innerHTML = renderResult(result, state);
          resultEl.style.display = '';
          resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    }

    render();

    /* 語言切換時重新渲染 */
    if (window.IsshoCore && window.IsshoCore.onLangChange) {
      window.IsshoCore.onLangChange(function() { render(); });
    }
  }
```

並最終更新 export 並呼叫 init：

```javascript
  global.IsshoHSP = { SCORES: SCORES, t: t, calcScore: calcScore, getSuggestions: getSuggestions, buildHTML: buildHTML, renderResult: renderResult, init: init };

  /* 頁面載入後自動初始化 */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
```

- [ ] **步驟 2：Commit**

```bash
git add assets/js/hsp-calculator.js
git commit -m "feat: hsp-calculator renderResult() + init() 主控函數"
```

---

## 任務 6：嵌入 visa/index.html

**檔案：**
- 修改：`visa/index.html`

- [ ] **步驟 1：在文章區上方加入計算器容器**

在 `<!-- =============== FEATURED ARTICLE =============== -->` 之前插入：

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

- [ ] **步驟 2：在 script 區（core.js 之後）加入計算器 JS**

找到：
```html
<script src="/assets/js/core.js?v=9"></script>
```

在其後加入：
```html
<script src="/assets/js/hsp-calculator.js?v=1"></script>
```

- [ ] **步驟 3：更新雙語標題**（`IsshoCore.onLangChange` 已在 JS 內處理，但 section-head 靜態文字需在 `core.js` 完成後的 script 塊更新）

在 visa/index.html 最底部的 `<script>` 塊（`</script>` 之前）加入：

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

- [ ] **步驟 4：Commit**

```bash
git add visa/index.html
git commit -m "feat: visa 頁加入 hsp 計算器容器與 script"
```

---

## 任務 7：CSS 樣式

**檔案：**
- 修改：`assets/css/styles.css`（末尾追加）

- [ ] **步驟 1：追加計算器樣式**

在 `styles.css` 最末尾追加：

```css
/* ═══════════════════════════════════════
   HSP Calculator
   ═══════════════════════════════════════ */
.hsp-calc-section { background: var(--paper, #fbf9f3); padding: 48px 0; }

.hsp-calculator { margin-top: 24px; }

/* 路徑選擇器 */
.hsp-path-selector { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
.hsp-path-btn {
  padding: 8px 20px; border-radius: 999px; border: 1.5px solid var(--line, #e0ddd6);
  background: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
  color: var(--ink-2, #5a5a4a); transition: all .15s;
}
.hsp-path-btn.active { background: var(--navy-ink, #0d2444); color: #fff; border-color: var(--navy-ink, #0d2444); }
.hsp-path-btn:hover:not(.active) { border-color: var(--navy-ink, #0d2444); color: var(--navy-ink, #0d2444); }

/* 主體：問題 + 分數欄 */
.hsp-body { display: grid; grid-template-columns: 1fr 220px; gap: 24px; align-items: start; }

/* 問題區 */
.hsp-questions { background: #fff; border-radius: var(--r-lg, 16px); border: 1px solid var(--line, #e0ddd6); padding: 24px; }
.hsp-section { margin-bottom: 24px; }
.hsp-section:last-child { margin-bottom: 0; }
.hsp-section-label { font-size: 13px; font-weight: 700; color: var(--navy-ink, #0d2444); margin-bottom: 10px; letter-spacing: .02em; }

.hsp-radio-label,
.hsp-check-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--ink-1, #2a2a1a); padding: 6px 0;
  cursor: pointer; line-height: 1.4;
}
.hsp-radio-label input, .hsp-check-label input { flex-shrink: 0; accent-color: var(--navy-ink, #0d2444); width: 15px; height: 15px; }
.hsp-pts { font-size: 11px; font-weight: 700; color: #a8762f; margin-left: auto; white-space: nowrap; }
.hsp-dual { border-top: 1px dashed var(--line, #e0ddd6); margin-top: 8px; padding-top: 10px; }

/* 分數欄 */
.hsp-score-panel { position: sticky; top: 80px; }
.hsp-score-inner {
  background: var(--navy-ink, #0d2444); color: #fff; border-radius: var(--r-lg, 16px);
  padding: 24px 20px; text-align: center;
}
.hsp-score-label { font-size: 12px; letter-spacing: .08em; opacity: .7; margin-bottom: 8px; }
.hsp-score-num { font-size: 56px; font-weight: 800; line-height: 1; margin-bottom: 12px; font-family: 'Inter', sans-serif; }
.hsp-score-bar-wrap { background: rgba(255,255,255,.15); border-radius: 999px; height: 6px; margin-bottom: 8px; overflow: hidden; }
.hsp-score-bar { background: #d9b683; height: 100%; border-radius: 999px; transition: width .3s ease; }
.hsp-score-threshold { font-size: 12px; opacity: .6; margin-bottom: 20px; }
.hsp-result-btn {
  width: 100%; padding: 10px; border-radius: 8px; border: none;
  background: #d9b683; color: var(--navy-ink, #0d2444); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: opacity .15s;
}
.hsp-result-btn:hover { opacity: .85; }

/* 結果區 */
.hsp-result { background: #fff; border-radius: var(--r-lg, 16px); border: 1px solid var(--line, #e0ddd6); padding: 24px; margin-top: 16px; }
.hsp-result-status { font-size: 16px; font-weight: 700; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; }
.hsp-result-status.pass { background: #e8f5e9; color: #2e7d32; }
.hsp-result-status.fail { background: #fff3e0; color: #e65100; }

.hsp-breakdown { font-size: 13px; }
.hsp-breakdown-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--line, #e0ddd6); color: var(--ink-2, #5a5a4a); }
.hsp-breakdown-pts.pos { font-weight: 700; color: var(--navy-ink, #0d2444); }
.hsp-breakdown-total { display: flex; justify-content: space-between; padding: 10px 0 0; font-weight: 700; font-size: 14px; color: var(--navy-ink, #0d2444); }

.hsp-suggestions { margin-top: 16px; padding: 16px; background: #f0f4ff; border-radius: 8px; }
.hsp-sug-title { font-size: 12px; font-weight: 700; color: var(--navy-ink, #0d2444); margin-bottom: 8px; }
.hsp-sug-item { font-size: 13px; color: var(--ink-1, #2a2a1a); padding: 4px 0; display: flex; gap: 8px; align-items: flex-start; }
.hsp-sug-pts { font-weight: 800; color: #a8762f; white-space: nowrap; min-width: 32px; }

/* 免責聲明 */
.hsp-disclaimer { font-size: 11px; color: var(--ink-3, #9a9a8a); margin-top: 12px; text-align: center; }

/* 手機版 */
@media (max-width: 719px) {
  .hsp-body { grid-template-columns: 1fr; }
  .hsp-score-panel { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; padding: 0; }
  .hsp-score-inner { border-radius: 0; padding: 12px 20px; display: flex; align-items: center; gap: 16px; text-align: left; }
  .hsp-score-label { display: none; }
  .hsp-score-num { font-size: 32px; margin-bottom: 0; }
  .hsp-score-bar-wrap { display: none; }
  .hsp-score-threshold { display: none; }
  .hsp-result-btn { width: auto; margin-left: auto; white-space: nowrap; }
  .hsp-questions { padding-bottom: 80px; }
}
```

- [ ] **步驟 2：升級 styles.css 版本號**

在所有 HTML 檔案中把 `styles.css?v=7` 改為 `styles.css?v=8`：

```bash
find /Users/kit/Desktop/Isshohub -name "*.html" | xargs sed -i '' 's|styles\.css?v=7|styles.css?v=8|g'
```

- [ ] **步驟 3：Commit**

```bash
git add assets/css/styles.css
git add $(git diff --name-only | grep "\.html$")
git commit -m "feat: hsp-calculator CSS 樣式"
```

---

## 任務 8：最終整合與驗證

**檔案：** 全部

- [ ] **步驟 1：本地打開 visa/index.html 驗證以下行為**

| 測試項目 | 預期結果 |
|----------|----------|
| 頁面載入後 #hsp 區塊可見 | ✓ 顯示路徑選擇器和問題表單 |
| 預設路徑「高度技術」 | ✓ 顯示 MBA 選項、10年職業經歷選項 |
| 切換至「學術研究」 | ✓ 研究業績顯示「2項以上25分」說明；薪資選項隨年齡帶更新 |
| 切換至「高度經營」 | ✓ 無年齡區塊；薪資顯示3000萬選項；顯示職位選項 |
| 選擇任意選項 | ✓ 右欄分數即時更新 |
| 點擊「查看結果」 | ✓ 結果區展開，顯示細分和建議 |
| 切換語言 | ✓ 所有文字立即切換為英文／繁中 |
| 手機版（視窗 < 720px） | ✓ 分數欄固定在頁面底部 |

- [ ] **步驟 2：console 驗證無 JS 錯誤**

打開 DevTools → Console，確認無紅色錯誤。

- [ ] **步驟 3：git push**

```bash
git push
```

---

## 自檢結果

**規格覆蓋度：**
- ✓ 三條路徑（academic / technical / business）
- ✓ 學歷（含 MBA/MOT 差異）
- ✓ 多領域雙學位 +5
- ✓ 職業經歷（各路徑不同年資結構）
- ✓ 年齡分層薪資（academic / technical）
- ✓ 年齡（business 無）
- ✓ 研究業績（academic 封頂25分；technical 各項15分）
- ✓ 特別加算11項多選
- ✓ technical 獨有：國家資格、投資運用
- ✓ business 獨有：職位、對日投資
- ✓ 即時計分
- ✓ 結果區：細分表 + 達標狀態 + 建議
- ✓ 雙語（TC/EN）+ 語言切換
- ✓ 手機版固定分數 bar
- ✓ 免責聲明

**佔位符：** 無

**類型一致性：** `state` 物件結構在 calcScore / buildHTML / renderResult / init 中一致使用相同欄位名稱
