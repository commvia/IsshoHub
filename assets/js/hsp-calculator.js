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
      { value: 'phd_msc',  pts: 20, tc: '博士／碩士學位',          en: "Doctoral / Master's degree" },
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

    salary_academic: {
      u30: [
        { value: '1000+', pts: 40, tc: '1,000萬日圓以上', en: '¥10M+' },
        { value: '900',   pts: 35, tc: '900–1,000萬',     en: '¥9M–10M' },
        { value: '800',   pts: 30, tc: '800–900萬',       en: '¥8M–9M' },
        { value: '700',   pts: 25, tc: '700–800萬',       en: '¥7M–8M' },
        { value: '600',   pts: 20, tc: '600–700萬',       en: '¥6M–7M' },
        { value: '500',   pts: 15, tc: '500–600萬',       en: '¥5M–6M' },
        { value: '400',   pts: 10, tc: '400–500萬',       en: '¥4M–5M' },
        { value: '0',     pts: 0,  tc: '400萬未滿',       en: 'Under ¥4M' },
      ],
      '30': [
        { value: '1000+', pts: 40, tc: '1,000萬日圓以上', en: '¥10M+' },
        { value: '900',   pts: 35, tc: '900–1,000萬',     en: '¥9M–10M' },
        { value: '800',   pts: 30, tc: '800–900萬',       en: '¥8M–9M' },
        { value: '700',   pts: 25, tc: '700–800萬',       en: '¥7M–8M' },
        { value: '600',   pts: 20, tc: '600–700萬',       en: '¥6M–7M' },
        { value: '500',   pts: 15, tc: '500–600萬',       en: '¥5M–6M' },
        { value: '0',     pts: 0,  tc: '500萬未滿',       en: 'Under ¥5M' },
      ],
      '35': [
        { value: '1000+', pts: 40, tc: '1,000萬日圓以上', en: '¥10M+' },
        { value: '900',   pts: 35, tc: '900–1,000萬',     en: '¥9M–10M' },
        { value: '800',   pts: 30, tc: '800–900萬',       en: '¥8M–9M' },
        { value: '700',   pts: 25, tc: '700–800萬',       en: '¥7M–8M' },
        { value: '600',   pts: 20, tc: '600–700萬',       en: '¥6M–7M' },
        { value: '0',     pts: 0,  tc: '600萬未滿',       en: 'Under ¥6M' },
      ],
      '40+': [
        { value: '1000+', pts: 40, tc: '1,000萬日圓以上', en: '¥10M+' },
        { value: '900',   pts: 35, tc: '900–1,000萬',     en: '¥9M–10M' },
        { value: '800',   pts: 30, tc: '800–900萬',       en: '¥8M–9M' },
        { value: '0',     pts: 0,  tc: '800萬未滿',       en: 'Under ¥8M' },
      ],
    },

    salary_business: [
      { value: '3000+', pts: 50, tc: '3,000萬以上',          en: '¥30M+' },
      { value: '2500',  pts: 40, tc: '2,500–3,000萬',        en: '¥25M–30M' },
      { value: '2000',  pts: 30, tc: '2,000–2,500萬',        en: '¥20M–25M' },
      { value: '1500',  pts: 20, tc: '1,500–2,000萬',        en: '¥15M–20M' },
      { value: '1000',  pts: 10, tc: '1,000–1,500萬',        en: '¥10M–15M' },
      { value: '0',     pts: 0,  tc: '1,000萬未滿（最低300萬）', en: 'Under ¥10M (min ¥3M)' },
    ],

    bonus: [
      { key: 'innovation_co',  pts: 10, tc: '任職創新支援指定企業',                en: 'Working at a designated innovation-support company' },
      { key: 'innovation_sme', pts: 10, tc: '上述企業且屬中小企業（需同時選上項）', en: 'Above company is an SME (select above item too)' },
      { key: 'local_gov',      pts: 10, tc: '任職地方政府特定機構',               en: 'Working at a designated local government institution' },
      { key: 'sme_rnd',        pts: 5,  tc: '中小企業研發費比率 >3%',             en: 'SME with R&D expense ratio >3%' },
      { key: 'foreign_qual',   pts: 5,  tc: '外國業務相關資格／表彰',              en: 'Foreign business qualification or commendation' },
      { key: 'jp_uni',         pts: 10, tc: '畢業於日本大學或研究所',             en: 'Graduated from a Japanese university or graduate school' },
      { key: 'jlpt_n1',        pts: 15, tc: '日語 N1 或日語專業學位',             en: 'JLPT N1 or Japanese language major' },
      { key: 'jlpt_n2',        pts: 10, tc: '日語 N2（不可與N1重複）',           en: 'JLPT N2 (cannot combine with N1)' },
      { key: 'growth_field',   pts: 10, tc: '成長領域先端項目',                   en: 'Leading project in growth sector' },
      { key: 'top_uni',        pts: 10, tc: '世界排名前300大學（QS/THE/上交大任2項）或Top Global校', en: 'Top 300 world university (2 of QS/THE/SJTU) or Top Global' },
      { key: 'jica',           pts: 5,  tc: 'JICA Innovative Asia 培訓1年以上',  en: 'JICA Innovative Asia training (1+ year)' },
    ],

    research_academic: [
      { key: 'patent', tc: '至少1項專利發明',              en: 'At least 1 patent invention' },
      { key: 'grant',  tc: '外國政府競爭性補助3次以上',      en: '3+ competitive grants from foreign governments' },
      { key: 'paper',  tc: '學術期刊論文3篇以上（通訊作者）', en: '3+ academic papers (corresponding author)' },
      { key: 'other',  tc: '其他法務大臣認定業績',           en: 'Other achievements recognized by Minister of Justice' },
    ],

    research_technical: [
      { key: 'patent', pts: 15, tc: '專利發明',              en: 'Patent invention' },
      { key: 'grant',  pts: 15, tc: '外國政府競爭性補助3次以上', en: '3+ competitive grants from foreign governments' },
      { key: 'paper',  pts: 15, tc: '學術期刊論文3篇以上',    en: '3+ academic papers' },
      { key: 'other',  pts: 15, tc: '其他法務大臣認定業績',   en: 'Other achievements recognized by Minister of Justice' },
    ],

    tech_qual: [
      { value: '2+', pts: 10, tc: '2個以上日本國家資格', en: '2+ Japanese national qualifications' },
      { value: '1',  pts: 5,  tc: '1個日本國家資格',    en: '1 Japanese national qualification' },
      { value: '0',  pts: 0,  tc: '無',               en: 'None' },
    ],
    tech_invest: { pts: 10, tc: '從事投資運用相關業務', en: 'Engaged in investment management operations' },

    biz_position: [
      { value: 'rep',  pts: 10, tc: '代表取締役／代表執行役員',  en: 'Representative Director / Representative Executive Officer' },
      { value: 'dir',  pts: 5,  tc: '取締役／執行役員／執行社員', en: 'Director / Executive Officer / Executive Member' },
      { value: 'none', pts: 0,  tc: '上述職位以外',             en: 'None of the above' },
    ],
    biz_invest: { pts: 5, tc: '對日本投資1億日圓以上', en: 'Invested ¥100M+ in Japan' },
  };

  /* ── 語言輔助 ── */
  function t(obj) {
    var lang = (window.IsshoCore && window.IsshoCore.getLang()) || 'tc';
    return lang === 'tc' ? obj.tc : obj.en;
  }

  /* ── 計分函數 ── */
  function calcScore(state) {
    var breakdown = {};
    var total = 0;

    function add(key, pts) {
      breakdown[key] = pts;
      total += pts;
    }

    var path = state.path;
    var S = SCORES;

    var eduList = path === 'academic' ? S.edu_academic
                : path === 'technical' ? S.edu_technical
                : S.edu_business;
    var eduItem = eduList.filter(function(e) { return e.value === state.edu; })[0];
    add('edu', eduItem ? eduItem.pts : 0);

    add('dual', state.dual ? S.dual_degree.pts : 0);

    var expList = path === 'academic' ? S.exp_academic
                : path === 'technical' ? S.exp_technical
                : S.exp_business;
    var expItem = expList.filter(function(e) { return e.value === state.exp; })[0];
    add('exp', expItem ? expItem.pts : 0);

    if (path !== 'business') {
      var ageItem = S.age.filter(function(e) { return e.value === state.age; })[0];
      add('age', ageItem ? ageItem.pts : 0);
    } else {
      add('age', 0);
    }

    if (path === 'business') {
      var salItem = S.salary_business.filter(function(e) { return e.value === state.salary; })[0];
      add('salary', salItem ? salItem.pts : 0);
    } else {
      var ageBand = state.age || 'u30';
      var salList = S.salary_academic[ageBand] || S.salary_academic['u30'];
      var salItem2 = salList.filter(function(e) { return e.value === state.salary; })[0];
      add('salary', salItem2 ? salItem2.pts : 0);
    }

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

    var bonusKeys = state.bonus || [];
    var bonusPts = 0;
    S.bonus.forEach(function(b) {
      if (bonusKeys.indexOf(b.key) !== -1) bonusPts += b.pts;
    });
    add('bonus', bonusPts);

    if (path === 'technical') {
      var tqItem = S.tech_qual.filter(function(e) { return e.value === state.tech_qual; })[0];
      add('tech_qual', tqItem ? tqItem.pts : 0);
      add('tech_invest', state.tech_invest ? S.tech_invest.pts : 0);
    }

    if (path === 'business') {
      var posItem = S.biz_position.filter(function(e) { return e.value === state.biz_position; })[0];
      add('biz_position', posItem ? posItem.pts : 0);
      add('biz_invest', state.biz_invest ? S.biz_invest.pts : 0);
    }

    return { total: total, breakdown: breakdown };
  }

  /* ── 建議邏輯 ── */
  function getSuggestions(state, result) {
    if (result.total >= 70) return [];
    var suggestions = [];
    var bonusKeys = state.bonus || [];

    if (bonusKeys.indexOf('jlpt_n1') === -1 && bonusKeys.indexOf('jlpt_n2') === -1) {
      suggestions.push({ pts: 15, tc: '取得日語 N1 資格可加 +15 分', en: 'Passing JLPT N1 adds +15 points' });
    } else if (bonusKeys.indexOf('jlpt_n1') === -1) {
      suggestions.push({ pts: 5, tc: '將日語從 N2 提升至 N1 可再加 +5 分', en: 'Upgrading from JLPT N2 to N1 adds +5 more points' });
    }
    if (bonusKeys.indexOf('jp_uni') === -1) {
      suggestions.push({ pts: 10, tc: '若畢業於日本大學或研究所可加 +10 分', en: 'Graduating from a Japanese university adds +10 points' });
    }
    if (bonusKeys.indexOf('top_uni') === -1) {
      suggestions.push({ pts: 10, tc: '若畢業於世界前300大學可加 +10 分', en: 'Top 300 world university adds +10 points' });
    }
    if (bonusKeys.indexOf('growth_field') === -1) {
      suggestions.push({ pts: 10, tc: '從事成長領域先端項目可加 +10 分', en: 'Working on a leading project in a growth sector adds +10 points' });
    }
    if (bonusKeys.indexOf('innovation_co') === -1) {
      suggestions.push({ pts: 10, tc: '任職創新支援指定企業可加 +10 分', en: 'Working at a designated innovation-support company adds +10 points' });
    }

    suggestions.sort(function(a, b) { return b.pts - a.pts; });
    return suggestions.slice(0, 3);
  }

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

    function salaryOptions() {
      if (path === 'business') return radio('salary', S.salary_business, state.salary);
      var band = state.age || 'u30';
      var list = S.salary_academic[band] || S.salary_academic['u30'];
      return radio('salary', list, state.salary);
    }

    var paths = [
      { value: 'academic',  tc: '高度學術研究活動',    en: 'Academic Research' },
      { value: 'technical', tc: '高度專門・技術活動',  en: 'Advanced Technical' },
      { value: 'business',  tc: '高度經營・管理活動',  en: 'Business Management' },
    ];
    var pathHTML = paths.map(function(p) {
      return '<button class="hsp-path-btn' + (p.value === path ? ' active' : '') + '" data-path="' + p.value + '">' +
        (L ? p.tc : p.en) + '</button>';
    }).join('');

    var eduList = path === 'academic' ? S.edu_academic
                : path === 'technical' ? S.edu_technical
                : S.edu_business;

    var resHTML = '';
    if (path === 'academic') {
      resHTML = '<div class="hsp-section"><div class="hsp-section-label">' +
        (L ? '研究業績（符合2項以上得25分，1項得20分）' : 'Research Achievements (2+ items = 25 pts, 1 item = 20 pts)') +
        '</div>' + checkbox('research', S.research_academic, state.research) + '</div>';
    } else if (path === 'technical') {
      resHTML = '<div class="hsp-section"><div class="hsp-section-label">' +
        (L ? '研究業績（各項各 +15 分）' : 'Research Achievements (+15 pts each)') +
        '</div>' + checkbox('research', S.research_technical, state.research) + '</div>';
    }

    var techHTML = '';
    if (path === 'technical') {
      techHTML = '<div class="hsp-section"><div class="hsp-section-label">' +
        (L ? '日本國家資格' : 'Japanese National Qualifications') + '</div>' +
        radio('tech_qual', S.tech_qual, state.tech_qual) +
        '<label class="hsp-check-label" style="margin-top:8px">' +
        '<input type="checkbox" name="tech_invest" value="1"' + (state.tech_invest ? ' checked' : '') + '> ' +
        (L ? S.tech_invest.tc : S.tech_invest.en) + ' <span class="hsp-pts">+10</span>' +
        '</label></div>';
    }

    var bizHTML = '';
    if (path === 'business') {
      bizHTML = '<div class="hsp-section"><div class="hsp-section-label">' +
        (L ? '職位' : 'Position') + '</div>' +
        radio('biz_position', S.biz_position, state.biz_position) + '</div>' +
        '<div class="hsp-section"><label class="hsp-check-label">' +
        '<input type="checkbox" name="biz_invest" value="1"' + (state.biz_invest ? ' checked' : '') + '> ' +
        (L ? S.biz_invest.tc : S.biz_invest.en) + ' <span class="hsp-pts">+5</span>' +
        '</label></div>';
    }

    var ageHTML = '';
    if (path !== 'business') {
      ageHTML = '<div class="hsp-section"><div class="hsp-section-label">' +
        (L ? '年齡' : 'Age') + '</div>' +
        radio('age', S.age, state.age) + '</div>';
    }

    var expList = path === 'academic' ? S.exp_academic
                : path === 'technical' ? S.exp_technical
                : S.exp_business;

    return '<div class="hsp-path-selector">' + pathHTML + '</div>' +
      '<div class="hsp-body">' +
        '<div class="hsp-questions">' +
          '<div class="hsp-section"><div class="hsp-section-label">' + (L ? '學歷' : 'Education') + '</div>' +
            radio('edu', eduList, state.edu) +
            '<label class="hsp-check-label hsp-dual">' +
              '<input type="checkbox" name="dual" value="1"' + (state.dual ? ' checked' : '') + '> ' +
              (L ? S.dual_degree.tc : S.dual_degree.en) +
            '</label>' +
          '</div>' +
          '<div class="hsp-section"><div class="hsp-section-label">' + (L ? '職歷（相關實務經驗）' : 'Work Experience') + '</div>' +
            radio('exp', expList, state.exp) +
          '</div>' +
          ageHTML +
          '<div class="hsp-section"><div class="hsp-section-label">' + (L ? '年收入（日圓）' : 'Annual Income (JPY)') + '</div>' +
            salaryOptions() +
          '</div>' +
          resHTML + techHTML + bizHTML +
          '<div class="hsp-section"><div class="hsp-section-label">' + (L ? '特別加算（可多選）' : 'Special Bonuses (multi-select)') + '</div>' +
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

  /* ── 結果區渲染 ── */
  function renderResult(result, state) {
    var lang = (window.IsshoCore && window.IsshoCore.getLang()) || 'tc';
    var L = lang === 'tc';
    var total = result.total;
    var gap = 70 - total;
    var suggestions = getSuggestions(state, result);

    var statusHTML = total >= 70
      ? '<div class="hsp-result-status pass">' + (L ? '✓ 預計達標（70 分以上）' : '✓ Likely Eligible (70+ points)') + '</div>'
      : '<div class="hsp-result-status fail">' + (L ? '✗ 尚未達標，距 70 分還差 ' + gap + ' 分' : '✗ Not yet eligible — ' + gap + ' more points needed') + '</div>';

    var labels = {
      edu:          { tc: '學歷',       en: 'Education' },
      dual:         { tc: '雙學位加分', en: 'Dual Degree Bonus' },
      exp:          { tc: '職業經歷',   en: 'Work Experience' },
      age:          { tc: '年齡',       en: 'Age' },
      salary:       { tc: '年收入',     en: 'Annual Income' },
      research:     { tc: '研究業績',   en: 'Research Achievements' },
      bonus:        { tc: '特別加算',   en: 'Special Bonuses' },
      tech_qual:    { tc: '國家資格',   en: 'National Qualifications' },
      tech_invest:  { tc: '投資運用業務', en: 'Investment Operations' },
      biz_position: { tc: '職位',       en: 'Position' },
      biz_invest:   { tc: '對日投資',   en: 'Japan Investment' },
    };

    var zeroSkip = { dual: 1, research: 1, tech_qual: 1, tech_invest: 1, biz_position: 1, biz_invest: 1 };
    var breakdownHTML = Object.keys(result.breakdown).map(function(key) {
      var pts = result.breakdown[key];
      if (pts === 0 && zeroSkip[key]) return '';
      var label = labels[key] ? (L ? labels[key].tc : labels[key].en) : key;
      return '<div class="hsp-breakdown-row"><span>' + label + '</span>' +
        '<span class="hsp-breakdown-pts' + (pts > 0 ? ' pos' : '') + '">' + (pts > 0 ? '+' : '') + pts + '</span></div>';
    }).filter(Boolean).join('') +
    '<div class="hsp-breakdown-total"><span>' + (L ? '合計' : 'Total') + '</span>' +
      '<span>' + total + ' ' + (L ? '分' : 'pts') + '</span></div>';

    var sugHTML = '';
    if (suggestions.length && total < 70) {
      sugHTML = '<div class="hsp-suggestions"><div class="hsp-sug-title">' +
        (L ? '可提升分數的方向：' : 'Ways to increase your score:') + '</div>' +
        suggestions.map(function(s) {
          return '<div class="hsp-sug-item"><span class="hsp-sug-pts">+' + s.pts + '</span>' + (L ? s.tc : s.en) + '</div>';
        }).join('') + '</div>';
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
      el.querySelectorAll('.hsp-path-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          state.path = btn.dataset.path;
          state.salary = '0'; state.research = [];
          state.tech_qual = '0'; state.tech_invest = false;
          state.biz_position = 'none'; state.biz_invest = false;
          render();
        });
      });

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

      var resultBtn = document.getElementById('hspResultBtn');
      var resultEl  = document.getElementById('hspResult');
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

    if (window.IsshoCore && window.IsshoCore.onLangChange) {
      window.IsshoCore.onLangChange(function() { render(); });
    }
  }

  global.IsshoHSP = { SCORES: SCORES, t: t, calcScore: calcScore, getSuggestions: getSuggestions, buildHTML: buildHTML, renderResult: renderResult, init: init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
