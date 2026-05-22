/* IsshoHub — core shared logic */
(function (global) {
  'use strict';

  /* ── Icon library ── */
  const ICONS = {
    passport: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="11" r="3.2"/><path d="M8 17h8"/></svg>`,
    briefcase: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M3 12h18"/></svg>`,
    home: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9"/></svg>`,
    yen: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l6 8 6-8"/><path d="M12 12v9"/><path d="M7 15h10"/><path d="M7 19h10"/></svg>`,
    life: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2"/></svg>`,
    torii: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4 20L8.5 11h7L20 20"/><path d="M9.5 11L12 14 14.5 11"/><path d="M3 20Q12 17.5 21 20"/></svg>`,
    paw: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="10" r="2"/><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="19" cy="10" r="2"/><path d="M12 12c-3 0-6 2-6 5 0 1.5 1 3 3 3 1 0 2-.5 3-.5s2 .5 3 .5c2 0 3-1.5 3-3 0-3-3-5-6-5z"/></svg>`,
    quote: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7c-2 0-3 2-3 4v6h5v-6H5"/><path d="M17 7c-2 0-3 2-3 4v6h5v-6h-4"/></svg>`,
    news:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M4 9h16"/><path d="M8 4v5"/><path d="M8 14h8"/><path d="M8 17h5"/></svg>`,
    culture:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9Q12 6 22 9"/><path d="M5 13h14"/><path d="M7 9v13"/><path d="M17 9v13"/></svg>`,
    invest:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>`,
  };

  /* ── State ── */
  function _detectLang() {
    var saved = localStorage.getItem('issho.lang');
    if (saved) return saved;
    var bl = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    bl = bl.toLowerCase();
    if (bl.startsWith('zh')) return 'tc';
    if (bl.startsWith('en')) return 'en';
    return 'tc'; // site default
  }
  const state = {
    lang: _detectLang(),
  };

  /* Registered lang-change handlers (replaces fragile window.onLangChange) */
  const _langListeners = [];

  function getLang() { return state.lang; }

  function setLang(lang) {
    state.lang = lang;
    localStorage.setItem('issho.lang', lang);
    applyLang();
    /* fire all registered listeners */
    _langListeners.forEach(fn => fn(lang));
    /* also call legacy window.onLangChange if set */
    if (typeof window.onLangChange === 'function') window.onLangChange(lang);
  }

  function onLangChange(fn) {
    _langListeners.push(fn);
  }

  function applyLang() {
    document.body.setAttribute('data-lang', state.lang);
    document.documentElement.setAttribute('lang', state.lang === 'tc' ? 'zh-Hant' : 'en');
    document.querySelectorAll('[data-lang-set]').forEach(b => {
      b.classList.toggle('on', b.getAttribute('data-lang-set') === state.lang);
    });
  }

  function t(obj) {
    if (!obj) return '';
    return obj[state.lang] || obj.tc || obj.en || '';
  }

  /* ── Static i18n ── */
  const I18N = {
    'tagline-nav':   { tc: '在日生活，一緒開始', en: 'Everything you need in Japan' },
    'ticker1':       { tc: '', en: '' },
    'ticker2':       { tc: '', en: '' },
    'ticker-weather':{ tc: '東京 · 17° · 晴れ', en: 'Tokyo · 17° · Clear' },
    'ticker-rate':   { tc: 'HKD <b>¥19.42</b>&nbsp; TWD <b>¥4.71</b>', en: 'HKD <b>¥19.42</b>&nbsp; TWD <b>¥4.71</b>' },
    'hot_search':    { tc: '熱門搜尋', en: 'Hot searches' },
    'browse_cat':    { tc: '瀏覽分類', en: 'Browse categories' },
    'browse_cat_sub':{ tc: '從簽證到寵物、從稅務到好去處，一站式覆蓋在日生活所有面向。', en: 'From visas to pets, tax to travel — every corner of life in Japan.' },
    'editor_picks':  { tc: '編輯精選', en: "Editor's picks" },
    'editor_picks_sub': { tc: '本月最多人閱讀、最實用的在日指南。', en: 'The most-read, most-useful guides this month.' },
    'view_all':      { tc: '查看全部', en: 'View all' },
    'news_title':    { tc: '新聞資訊', en: 'News' },
    'news_sub':      { tc: '最新日本時事、政策與生活相關新聞。', en: 'Latest news on Japan policy, society and daily life.' },
    'news_more':     { tc: '查看全部新聞', en: 'All news' },
    'latest':        { tc: '最新文章', en: 'Latest articles' },
    'latest_sub':    { tc: '集合所有類別的文章更新。', en: 'The latest from every category, all in one place.' },
    'stories_title': { tc: '人物故事', en: 'Stories' },
    'stories_sub':   { tc: '他們為什麼選擇日本？在這裡如何生活、工作、扎根？', en: 'Why did they choose Japan? How do they live, work, and belong here?' },
    'checklist_title':{ tc: '抵日首 30 天：必辦清單', en: 'Your first 30 days in Japan' },
    'checklist_sub': { tc: '從在留卡到電話號碼，我們把所有關鍵步驟整理成清單。', en: 'From residence card to phone number — we mapped out every essential step.' },
    'checklist_cta': { tc: '開啟完整清單', en: 'Open full checklist' },
    'newsletter_title': { tc: '每月一封，送到你的信箱。', en: 'One newsletter a month. Curated for you.' },
    'newsletter_sub': { tc: '在日新政策、最新文章、社群活動——整理好，每月送到你的信箱。', en: 'New policies, fresh articles, community events — curated and delivered monthly.' },
    'newsletter_cta': { tc: '訂閱電子報', en: 'Subscribe' },
    'footer_about':  { tc: 'IsshoHub 是面向國際讀者的繁體中文與英文雙語平台，專注於日本生活、文化資訊、簽證、投資與創業。編輯團隊來自傳媒、文化與學術領域，結合在地觀察與國際視野，為移居日本的外國人、關心日本的讀者，提供深入且實用的內容。', en: 'IsshoHub is a bilingual Traditional Chinese and English platform for international readers, focusing on life in Japan, culture, visas, investment and entrepreneurship. Our editorial team brings together expertise in media, culture and academia — combining on-the-ground insight with a global perspective to deliver in-depth, practical content for foreigners in Japan.' },
    'footer_col1':   { tc: '瀏覽分類', en: 'Explore' },
    'footer_col2':   { tc: '資源', en: 'Resources' },
    'footer_col3':   { tc: '關於', en: 'About' },
    'footer_r1':     { tc: '新手必讀', en: 'Start here' },
    'footer_r2':     { tc: '外免切替應試教材', en: 'Japan Driving Licence Guide' },
    'footer_r3':     { tc: '高度專門職積分計算機', en: 'HSP Points Calculator' },
    'footer_r4':     { tc: '電子報', en: 'Newsletter' },
    'footer_a1':     { tc: '關於我們', en: 'About us' },
    'footer_a2':     { tc: '編輯團隊', en: 'Editorial team' },
    'footer_a3':     { tc: '投稿合作', en: 'Contribute' },
    'footer_a4':     { tc: '聯絡我們', en: 'Contact' },
    'contact_title':             { tc: '聯絡我們', en: 'Contact Us' },
    'contact_sub':               { tc: '有任何問題或意見？留下訊息，我們會盡快回覆。', en: 'Have a question or feedback? Leave us a message and we\'ll get back to you.' },
    'contact_name_label':        { tc: '您的姓名', en: 'Your name' },
    'contact_name_placeholder':  { tc: '請輸入姓名', en: 'Your name' },
    'contact_email_label':       { tc: '電郵地址', en: 'Email address' },
    'contact_email_placeholder': { tc: 'your@email.com', en: 'your@email.com' },
    'contact_line_label':        { tc: 'LINE ID（選填）', en: 'LINE ID (optional)' },
    'contact_line_placeholder':  { tc: '例：@yourlineid', en: 'e.g. @yourlineid' },
    'contact_msg_label':         { tc: '訊息內容', en: 'Message' },
    'contact_msg_placeholder':   { tc: '請輸入您的訊息…', en: 'Your message…' },
    'contact_submit':            { tc: '發送訊息', en: 'Send message' },
    'contrib_title':             { tc: '投稿合作', en: 'Contribute' },
    'contrib_sub':               { tc: '歡迎投稿、翻譯合作或商業洽談，留下資料，我們會盡快聯絡。', en: 'We welcome article submissions, translation partnerships and business enquiries. Leave your details and we\'ll be in touch.' },
    'contrib_name_label':        { tc: '您的姓名', en: 'Your name' },
    'contrib_name_placeholder':  { tc: '請輸入姓名', en: 'Your name' },
    'contrib_email_label':       { tc: '電郵地址', en: 'Email address' },
    'contrib_email_placeholder': { tc: 'your@email.com', en: 'your@email.com' },
    'contrib_type_label':        { tc: '合作類型', en: 'Type' },
    'contrib_type_article':      { tc: '投稿文章', en: 'Article submission' },
    'contrib_type_translate':    { tc: '翻譯合作', en: 'Translation partnership' },
    'contrib_type_sponsor':      { tc: '商業合作 / 贊助', en: 'Business / Sponsorship' },
    'contrib_type_other':        { tc: '其他', en: 'Other' },
    'contrib_msg_label':         { tc: '簡短說明', en: 'Brief description' },
    'contrib_msg_placeholder':   { tc: '請簡單說明合作內容或投稿主題…', en: 'Please briefly describe your proposal or article topic…' },
    'contrib_submit':            { tc: '發送', en: 'Send' },
    'footer_a5':     { tc: '隱私政策', en: 'Privacy' },
    'footer_lang':   { tc: '繁體中文', en: 'Traditional Chinese' },
    'fx_title':      { tc: '匯率換算', en: 'Currency Calculator' },
    'fx_live':       { tc: '即時', en: 'Live' },
    'fx_trigger':    { tc: '匯率', en: 'FX' },
    'fx_asof':       { tc: '更新於 4月21日 14:32 JST · 參考匯率', en: 'Updated Apr 21, 14:32 JST · Reference rates' },
    'login_btn':     { tc: '登入', en: 'Login' },
    'login_title':   { tc: '歡迎回來', en: 'Welcome back' },
    'login_sub':     { tc: '登入以存取個人化內容與書籤功能', en: 'Sign in to access personalised content and bookmarks' },
    'login_email':   { tc: '電郵地址', en: 'Email address' },
    'login_password':{ tc: '密碼', en: 'Password' },
    'login_submit':  { tc: '登入', en: 'Sign in' },
    'login_forgot':  { tc: '忘記密碼？', en: 'Forgot password?' },
    'login_register':{ tc: '立即注冊', en: 'Create account' },
    'login_or':      { tc: '或', en: 'or' },
    'login_google':  { tc: '以 Google 帳號登入', en: 'Continue with Google' },
    'all_articles':  { tc: '全部', en: 'All' },
    'home_breadcrumb': { tc: '首頁', en: 'Home' },
    'register_name': { tc: '姓名', en: 'Name' },
    'forgot_sub':    { tc: '輸入你的電郵，我們會發送重設密碼連結。', en: 'Enter your email and we\'ll send you a reset link.' },
    'forgot_submit': { tc: '發送重設連結', en: 'Send reset link' },
    'back_to_login': { tc: '← 返回登入', en: '← Back to login' },
  };

  function updateI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (I18N[k]) el.innerHTML = I18N[k][state.lang] || I18N[k].tc || '';
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const k = el.getAttribute('data-i18n-placeholder');
      if (I18N[k]) el.setAttribute('placeholder', (I18N[k][state.lang] || I18N[k].tc || '').replace(/<[^>]*>/g, ''));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const k = el.getAttribute('data-i18n-aria');
      if (I18N[k]) el.setAttribute('aria-label', (I18N[k][state.lang] || I18N[k].tc || '').replace(/<[^>]*>/g, ''));
    });
  }

  /* ── Nav ── */
  function renderNav(activeKey) {
    const D = window.ISSHO_DATA;

    /* footer resource + about links — run on every page regardless of nav */
    const FOOTER_HREFS = {
      footer_r1: '/life/',
      footer_r2: '/life/driving-guide/',
      footer_r3: '/visa/#hsp',
      footer_r4: '/#newsletter',
      footer_a1: '/about/',
      footer_a2: '/#about',
      footer_a3: 'javascript:void(0)',
      footer_a4: 'javascript:void(0)',
      footer_a5: '/#privacy',
    };
    Object.keys(FOOTER_HREFS).forEach(key => {
      document.querySelectorAll(`a[data-i18n="${key}"]`).forEach(el => {
        el.href = FOOTER_HREFS[key];
      });
    });

    const el = document.getElementById('navLinks');
    if (!el) return;
    el.innerHTML = D.nav.map(c => {
      const label = state.lang === 'tc' ? c.short_tc : c.short_en;
      const hasSub = c.sub && c.sub.length;
      const isActive = c.key === activeKey;
      const subHTML = hasSub ? `
        <div class="nav-dropdown">
          <div class="nav-dropdown-head">
            <div class="nav-dropdown-title">${state.lang === 'tc' ? c.tc : c.en}</div>
            <a href="${c.url}" class="nav-dropdown-all">${state.lang === 'tc' ? '查看全部' : 'View all'} →</a>
          </div>
          <div class="nav-dropdown-list">
            ${c.sub.map(s => `<a href="${s.url || c.url}">${state.lang === 'tc' ? s.tc : s.en}</a>`).join('')}
          </div>
        </div>` : '';
      return `<div class="nav-item${hasSub ? ' has-sub' : ''}">
        <a href="${c.url}" class="${isActive ? 'active' : ''}">${label}${hasSub ? ' <svg class="nav-caret" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>' : ''}</a>
        ${subHTML}
      </div>`;
    }).join('');

    /* mobile catstrip */
    const strip = document.getElementById('catstrip');
    if (strip) {
      strip.innerHTML = D.nav.map(c => {
        const label = state.lang === 'tc' ? c.short_tc : c.short_en;
        return `<a href="${c.url}" class="${c.key === activeKey ? 'active' : ''}">${label}</a>`;
      }).join('');
    }

    /* footer explore — category links */
    const fe = document.getElementById('footerExplore');
    if (fe) {
      fe.innerHTML = D.nav.map(c => {
        const label = state.lang === 'tc' ? c.tc : c.en;
        return `<a href="${c.url}">${label}</a>`;
      }).join('');
    }

  }

  /* ── Mobile menu ── */
  function renderMobileMenu(activeKey) {
    const D = window.ISSHO_DATA;
    const list = document.getElementById('mobileNavList');
    if (!list) return;
    list.innerHTML = D.nav.map(c => {
      const hasSub = c.sub && c.sub.length;
      const label = state.lang === 'tc' ? c.tc : c.en;
      const enLabel = state.lang === 'tc' ? c.en : c.tc;
      const subHTML = hasSub ? `
        <div class="mobile-subnav">
          ${c.sub.map(s => `<a href="${s.url || c.url}">${state.lang === 'tc' ? s.tc : s.en}</a>`).join('')}
        </div>` : '';
      return `<div class="mobile-nav-item${hasSub ? ' has-sub' : ''}${c.key === activeKey ? ' active' : ''}">
        <a href="${hasSub ? 'javascript:void(0)' : c.url}" class="mobile-nav-link" data-key="${c.key}">
          <span>${label}<span class="cat-en"> / ${enLabel}</span></span>
          ${hasSub ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>' : ''}
        </a>
        ${subHTML}
      </div>`;
    }).join('');
  }

  /* ── Article card ── */
  function cardHTML(a, opts) {
    opts = opts || {};
    const tag = state.lang === 'tc' ? a.tc_tag : a.en_tag;
    const title = state.lang === 'tc' ? a.tc : a.en;
    const excerpt = state.lang === 'tc' ? a.tc_excerpt : a.en_excerpt;
    const author = t(a.author);
    const meta = t(a.meta);
    const date = t(a.date);
    const url = a.url || '#';
    return `
      <article class="card ${opts.featured ? 'featured' : ''}">
        <a class="card-media" href="${url}" style="background-image: url('${a.img}')">
        </a>
        <div class="card-body">
          <h3 class="card-title">${title}</h3>
          <p class="card-excerpt">${excerpt || ''}</p>
          <div class="card-meta">
            <span class="author">${author}</span>
            <span class="dot"></span>
            <span>${date}</span>
            <span class="reading">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              ${meta}
            </span>
          </div>
        </div>
      </article>`;
  }

  /* ── FX Calculator ── handled by initFX() in index.html ── */
  function wireFX() { /* no-op: logic moved to initFX IIFE */ }

  /* ── Auth state UI ── */
  function updateAuthUI(user, profile) {
    const loginBtns = document.querySelectorAll('[data-open-login]');
    const userMenus = document.querySelectorAll('[data-user-menu]');
    const adminBars = document.querySelectorAll('[data-admin-bar]');

    if (user) {
      // Hide login buttons, show user menu
      loginBtns.forEach(b => { b.style.display = 'none'; });
      userMenus.forEach(m => {
        m.style.display = 'flex';
        const nameEl = m.querySelector('[data-user-name]');
        if (nameEl) nameEl.textContent = profile?.name || user.email.split('@')[0];
      });
      // Show admin bar if admin
      if (profile?.role === 'admin') {
        adminBars.forEach(b => b.style.display = 'flex');
        document.body.classList.add('is-admin');
      }
    } else {
      loginBtns.forEach(b => { b.style.display = ''; });
      userMenus.forEach(m => { m.style.display = 'none'; });
      adminBars.forEach(b => { b.style.display = 'none'; });
      document.body.classList.remove('is-admin');
    }
  }

  /* ── Login modal ── */
  function wireLoginModal() {
    const modal = document.getElementById('loginModal');
    const openBtns = document.querySelectorAll('[data-open-login]');
    const closeBtn = document.getElementById('modalClose');
    if (!modal) return;

    function openModal() {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      // Reset to login tab
      showTab('login');
      setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 280);
    }
    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      clearModalError();
    }

    function showTab(tab) {
      modal.querySelectorAll('[data-tab]').forEach(el => {
        el.style.display = el.getAttribute('data-tab') === tab ? '' : 'none';
      });
      modal.querySelectorAll('[data-tab-btn]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab-btn') === tab);
      });
    }

    function setModalError(msg) {
      const errEl = document.getElementById('loginError');
      if (errEl) { errEl.textContent = msg; errEl.style.display = msg ? 'block' : 'none'; }
    }
    function clearModalError() { setModalError(''); }

    openBtns.forEach(b => b.addEventListener('click', openModal));
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    // Tab switching
    modal.querySelectorAll('[data-tab-btn]').forEach(btn => {
      btn.addEventListener('click', () => showTab(btn.getAttribute('data-tab-btn')));
    });

    // Forgot password link
    const forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
      forgotLink.addEventListener('click', e => {
        e.preventDefault();
        showTab('forgot');
      });
    }

    /* Login form */
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = loginForm.querySelector('.btn-submit');
        const email = loginForm.querySelector('[name="email"]').value;
        const password = loginForm.querySelector('[name="password"]').value;
        clearModalError();
        btn.textContent = state.lang === 'tc' ? '登入中…' : 'Signing in…';
        btn.disabled = true;

        if (!window.IsshoAuth) {
          // Fallback if Supabase not loaded
          btn.textContent = state.lang === 'tc' ? '✓ 登入成功' : '✓ Signed in';
          setTimeout(closeModal, 1200);
          return;
        }

        const { data, error } = await window.IsshoAuth.signInWithEmail(email, password);
        if (error) {
          setModalError(state.lang === 'tc' ? '電郵或密碼錯誤，請重試。' : 'Incorrect email or password.');
          btn.textContent = state.lang === 'tc' ? '登入' : 'Sign in';
          btn.disabled = false;
        } else {
          btn.textContent = state.lang === 'tc' ? '✓ 登入成功' : '✓ Signed in';
          setTimeout(closeModal, 800);
        }
      });
    }

    /* Register form */
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = registerForm.querySelector('.btn-submit');
        const name = registerForm.querySelector('[name="name"]').value;
        const email = registerForm.querySelector('[name="email"]').value;
        const password = registerForm.querySelector('[name="password"]').value;
        clearModalError();
        btn.textContent = state.lang === 'tc' ? '建立中…' : 'Creating…';
        btn.disabled = true;

        const { data, error } = await window.IsshoAuth.signUpWithEmail(email, password, name);
        if (error) {
          setModalError(error.message);
          btn.textContent = state.lang === 'tc' ? '立即注冊' : 'Create account';
          btn.disabled = false;
        } else {
          btn.textContent = state.lang === 'tc' ? '✓ 請查看電郵確認' : '✓ Check your email';
          btn.disabled = false;
        }
      });
    }

    /* Forgot password form */
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
      forgotForm.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = forgotForm.querySelector('.btn-submit');
        const email = forgotForm.querySelector('[name="email"]').value;
        btn.textContent = state.lang === 'tc' ? '發送中…' : 'Sending…';
        btn.disabled = true;

        const { error } = await window.IsshoAuth.resetPassword(email);
        if (error) {
          setModalError(error.message);
          btn.textContent = state.lang === 'tc' ? '發送重設連結' : 'Send reset link';
          btn.disabled = false;
        } else {
          btn.textContent = state.lang === 'tc' ? '✓ 已發送，請查看電郵' : '✓ Sent — check your email';
          btn.disabled = false;
        }
      });
    }

    /* Google sign-in */
    const googleBtn = document.getElementById('googleSignIn');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        if (window.IsshoAuth) await window.IsshoAuth.signInWithGoogle();
      });
    }

    /* User dropdown toggle */
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', e => {
        e.stopPropagation();
        userDropdown.classList.toggle('open');
      });
      document.addEventListener('click', () => userDropdown.classList.remove('open'));
    }

    /* Sign out */
    document.querySelectorAll('[data-sign-out]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (window.IsshoAuth) {
          await window.IsshoAuth.signOut();
          window.location.reload();
        }
      });
    });

    /* Listen to auth state changes */
    if (window.IsshoAuth) {
      window.IsshoAuth.onAuthChange(async (event, session) => {
        // Only treat as logged in if email is confirmed
        const user = session?.user;
        const confirmed = user?.email_confirmed_at || user?.confirmed_at;
        if (user && confirmed) {
          // Small delay to ensure RLS session is ready
          setTimeout(async () => {
            const { data: profile } = await window.IsshoAuth.getProfile(user.id);
            updateAuthUI(user, profile);
          }, 300);
        } else {
          updateAuthUI(null, null);
        }
      });

      // Also check on page load if already logged in
      window.IsshoAuth.getUser().then(async user => {
        if (user && (user.email_confirmed_at || user.confirmed_at)) {
          // Check role from user metadata first (faster), then fallback to profiles table
          const metaRole = user.user_metadata?.role;
          const profile = metaRole
            ? { role: metaRole, name: user.user_metadata?.full_name || user.email.split('@')[0] }
            : (await window.IsshoAuth.getProfile(user.id)).data;
          updateAuthUI(user, profile);
        }
      });
    }
  }

  /* ── Lang toggle ── */
  function wireLang(activeKey) {
    function handleLangClick(e) {
      const b = e.target.closest('[data-lang-set]');
      if (!b) return;
      setLang(b.getAttribute('data-lang-set'));
      renderNav(activeKey);
      renderMobileMenu(activeKey);
      updateI18n();
    }
    const toggle = document.getElementById('langToggle');
    if (toggle) toggle.addEventListener('click', handleLangClick);
    const toggleMobile = document.getElementById('langToggleMobile');
    if (toggleMobile) toggleMobile.addEventListener('click', handleLangClick);
  }

  /* ── Mobile menu toggle ── */
  function wireMobileMenu(activeKey) {
    const menuBtn = document.getElementById('menuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    const closeBtn = document.getElementById('mobileMenuClose');
    if (!menuBtn || !mobileMenu) return;

    function openMenu() { mobileMenu.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeMenu() { mobileMenu.classList.remove('open'); document.body.style.overflow = ''; }

    menuBtn.addEventListener('click', openMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);

    /* toggle sub-items */
    const list = document.getElementById('mobileNavList');
    if (list) {
      list.addEventListener('click', e => {
        const link = e.target.closest('.mobile-nav-link');
        if (!link) return;
        const item = link.closest('.mobile-nav-item');
        if (item && item.classList.contains('has-sub')) {
          e.preventDefault();
          item.classList.toggle('open');
        }
      });
    }

    /* mobile login */
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    if (mobileLoginBtn) {
      mobileLoginBtn.addEventListener('click', () => {
        closeMenu();
        const modal = document.getElementById('loginModal');
        if (modal) {
          modal.classList.add('open');
          document.body.style.overflow = 'hidden';
        }
      });
    }
  }

  /* ── Contact modal ── */
  /* Replace Formspree placeholder with your actual form ID from formspree.io */
  var CONTACT_FORMSPREE = 'https://formspree.io/f/xjgzvozy';

  function wireContactModal() {
    /* Inject modal HTML once */
    if (!document.getElementById('contactModal')) {
      var wrap = document.createElement('div');
      wrap.innerHTML =
        '<div id="contactModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="contactModalTitle">' +
          '<div class="modal">' +
            '<button class="modal-close" id="contactModalClose" aria-label="Close">✕</button>' +
            '<h2 id="contactModalTitle" class="modal-title" data-i18n="contact_title"></h2>' +
            '<p class="modal-sub" data-i18n="contact_sub"></p>' +
            '<div class="contact-form-fields">' +
              '<div class="form-group">' +
                '<label data-i18n="contact_name_label"></label>' +
                '<input type="text" name="name" required data-i18n-placeholder="contact_name_placeholder">' +
              '</div>' +
              '<div class="form-group">' +
                '<label data-i18n="contact_email_label"></label>' +
                '<input type="email" name="email" required data-i18n-placeholder="contact_email_placeholder">' +
              '</div>' +
              '<div class="form-group">' +
                '<label data-i18n="contact_line_label"></label>' +
                '<input type="text" name="line_id" data-i18n-placeholder="contact_line_placeholder">' +
              '</div>' +
              '<div class="form-group">' +
                '<label data-i18n="contact_msg_label"></label>' +
                '<textarea class="contact-textarea" name="message" rows="5" required data-i18n-placeholder="contact_msg_placeholder"></textarea>' +
              '</div>' +
              '<button type="button" id="contactSubmitBtn" class="btn-submit" data-i18n="contact_submit"></button>' +
              '<div id="contactResult" style="display:none;margin-top:14px;padding:12px 16px;border-radius:8px;font-size:14px;line-height:1.5;"></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(wrap.firstChild);
      updateI18n();
    }

    var modal     = document.getElementById('contactModal');
    var nameEl    = modal.querySelector('[name="name"]');
    var emailEl   = modal.querySelector('[name="email"]');
    var lineEl    = modal.querySelector('[name="line_id"]');
    var msgEl     = modal.querySelector('[name="message"]');
    var submitBtn = document.getElementById('contactSubmitBtn');
    var result    = document.getElementById('contactResult');

    function openModal() {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (nameEl)  { nameEl.value  = ''; nameEl.disabled  = false; }
      if (emailEl) { emailEl.value = ''; emailEl.disabled = false; }
      if (lineEl)  { lineEl.value  = ''; lineEl.disabled  = false; }
      if (msgEl)  { msgEl.value  = ''; msgEl.disabled  = false; }
      if (submitBtn) { submitBtn.style.display = ''; submitBtn.disabled = false; updateI18n(); }
      if (result) result.style.display = 'none';
      setTimeout(function () { if (nameEl) nameEl.focus(); }, 280);
    }
    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    /* Footer "Contact" links open the modal */
    document.querySelectorAll('a[data-i18n="footer_a4"]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); openModal(); });
    });

    document.getElementById('contactModalClose').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    submitBtn.addEventListener('click', function () {
      var lang    = getLang();
      var name    = nameEl  ? nameEl.value.trim()  : '';
      var email   = emailEl ? emailEl.value.trim() : '';
      var lineId  = lineEl  ? lineEl.value.trim()  : '';
      var message = msgEl   ? msgEl.value.trim()   : '';
      if (!name || !email || !message) return;

      submitBtn.disabled = true;
      submitBtn.textContent = lang === 'tc' ? '發送中…' : 'Sending…';
      result.style.display = 'none';

      fetch(CONTACT_FORMSPREE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: name, email: email, line_id: lineId, message: message }),
      })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (res.ok) {
          result.style.display = 'block';
          result.style.background = '#f0faf2';
          result.style.color = '#1a6b2a';
          result.textContent = lang === 'tc'
            ? '✓ 訊息已發送！我們會盡快回覆。'
            : '✓ Message sent! We\'ll get back to you soon.';
          submitBtn.style.display = 'none';
          if (nameEl)  nameEl.disabled  = true;
          if (emailEl) emailEl.disabled = true;
          if (lineEl)  lineEl.disabled  = true;
          if (msgEl)   msgEl.disabled   = true;
        } else {
          throw new Error((res.data && res.data.error) || 'error');
        }
      })
      .catch(function () {
        result.style.display = 'block';
        result.style.background = '#fff0f0';
        result.style.color = '#c0392b';
        result.textContent = lang === 'tc'
          ? '發送失敗，請直接電郵至 admin@isshohub.com'
          : 'Failed to send. Please email admin@isshohub.com directly.';
        submitBtn.disabled = false;
        submitBtn.textContent = lang === 'tc' ? '重試' : 'Retry';
      });
    });
  }

  /* ── Contribute modal ── */
  var CONTRIB_FORMSPREE = 'https://formspree.io/f/xjgzvozy';

  function wireContributeModal() {
    if (!document.getElementById('contributeModal')) {
      var wrap = document.createElement('div');
      wrap.innerHTML =
        '<div id="contributeModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="contributeModalTitle">' +
          '<div class="modal">' +
            '<button class="modal-close" id="contributeModalClose" aria-label="Close">✕</button>' +
            '<h2 id="contributeModalTitle" class="modal-title" data-i18n="contrib_title"></h2>' +
            '<p class="modal-sub" data-i18n="contrib_sub"></p>' +
            '<div class="contact-form-fields">' +
              '<div class="form-group">' +
                '<label data-i18n="contrib_name_label"></label>' +
                '<input type="text" name="name" required data-i18n-placeholder="contrib_name_placeholder">' +
              '</div>' +
              '<div class="form-group">' +
                '<label data-i18n="contrib_email_label"></label>' +
                '<input type="email" name="email" required data-i18n-placeholder="contrib_email_placeholder">' +
              '</div>' +
              '<div class="form-group">' +
                '<label data-i18n="contrib_type_label"></label>' +
                '<select name="type" style="width:100%;padding:11px 14px;border:1.5px solid #e0ddd6;border-radius:10px;font-size:15px;background:#fff;color:#333;outline:none;">' +
                  '<option value="article" data-i18n="contrib_type_article"></option>' +
                  '<option value="translate" data-i18n="contrib_type_translate"></option>' +
                  '<option value="sponsor" data-i18n="contrib_type_sponsor"></option>' +
                  '<option value="other" data-i18n="contrib_type_other"></option>' +
                '</select>' +
              '</div>' +
              '<div class="form-group">' +
                '<label data-i18n="contrib_msg_label"></label>' +
                '<textarea class="contact-textarea" name="message" rows="4" required data-i18n-placeholder="contrib_msg_placeholder"></textarea>' +
              '</div>' +
              '<button type="button" id="contributeSubmitBtn" class="btn-submit" data-i18n="contrib_submit"></button>' +
              '<div id="contributeResult" style="display:none;margin-top:14px;padding:12px 16px;border-radius:8px;font-size:14px;line-height:1.5;"></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(wrap.firstChild);
      updateI18n();
    }

    var modal     = document.getElementById('contributeModal');
    var nameEl    = modal.querySelector('[name="name"]');
    var emailEl   = modal.querySelector('[name="email"]');
    var typeEl    = modal.querySelector('[name="type"]');
    var msgEl     = modal.querySelector('[name="message"]');
    var submitBtn = document.getElementById('contributeSubmitBtn');
    var result    = document.getElementById('contributeResult');

    function openModal() {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (nameEl)  { nameEl.value  = ''; nameEl.disabled  = false; }
      if (emailEl) { emailEl.value = ''; emailEl.disabled = false; }
      if (typeEl)  { typeEl.value  = 'article'; typeEl.disabled = false; }
      if (msgEl)   { msgEl.value   = ''; msgEl.disabled   = false; }
      if (submitBtn) { submitBtn.style.display = ''; submitBtn.disabled = false; updateI18n(); }
      if (result) result.style.display = 'none';
      setTimeout(function () { if (nameEl) nameEl.focus(); }, 280);
    }
    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('a[data-i18n="footer_a3"]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); openModal(); });
    });

    document.getElementById('contributeModalClose').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    submitBtn.addEventListener('click', function () {
      var lang    = getLang();
      var name    = nameEl  ? nameEl.value.trim()  : '';
      var email   = emailEl ? emailEl.value.trim() : '';
      var type    = typeEl  ? typeEl.value         : '';
      var message = msgEl   ? msgEl.value.trim()   : '';
      if (!name || !email || !message) return;

      submitBtn.disabled = true;
      submitBtn.textContent = lang === 'tc' ? '發送中…' : 'Sending…';
      result.style.display = 'none';

      fetch(CONTRIB_FORMSPREE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: name, email: email, type: type, message: message, _subject: 'IsshoHub 投稿合作' }),
      })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (res.ok) {
          result.style.display = 'block';
          result.style.background = '#f0faf2';
          result.style.color = '#1a6b2a';
          result.textContent = lang === 'tc'
            ? '✓ 已收到，我們會盡快透過電郵聯絡你。'
            : '✓ Received! We\'ll be in touch via email soon.';
          submitBtn.style.display = 'none';
          if (nameEl)  nameEl.disabled  = true;
          if (emailEl) emailEl.disabled = true;
          if (typeEl)  typeEl.disabled  = true;
          if (msgEl)   msgEl.disabled   = true;
        } else {
          throw new Error((res.data && res.data.error) || 'error');
        }
      })
      .catch(function () {
        result.style.display = 'block';
        result.style.background = '#fff0f0';
        result.style.color = '#c0392b';
        result.textContent = lang === 'tc'
          ? '發送失敗，請直接電郵至 hello@isshohub.com'
          : 'Failed to send. Please email hello@isshohub.com directly.';
        submitBtn.disabled = false;
        submitBtn.textContent = lang === 'tc' ? '重試' : 'Retry';
      });
    });
  }

  /* ── Newsletter ── */
  function wireNewsletter() {
    const forms = document.querySelectorAll('.newsletter-form');
    forms.forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        if (btn) btn.textContent = '✓';
      });
    });
  }

  /* ── Ticker from Supabase site_settings ── */
  var _tickerMap = null;

  function applyTickerFromMap(map) {
    var tickerEl = document.querySelector('[data-i18n="ticker1"]');
    if (tickerEl && map && map.ticker) {
      tickerEl.innerHTML = state.lang === 'tc' ? (map.ticker.value_tc || '') : (map.ticker.value_en || '');
    }
  }

  function loadTicker() {
    if (!global.IsshoAPI || !global.IsshoAPI.fetchSiteSettings) return;
    global.IsshoAPI.fetchSiteSettings().then(function (res) {
      if (!res.data || !res.data.length) return;
      _tickerMap = {};
      res.data.forEach(function (s) { _tickerMap[s.key] = s; });
      applyTickerFromMap(_tickerMap);
    });
  }

  /* ── 複製加來源（文章頁用，測驗頁除外）── */
  function wireCopyAttribution() {
    /* 測驗頁有自己的防複製邏輯，跳過 */
    if (document.querySelector('.quiz-card')) return;

    document.addEventListener('copy', function (e) {
      if (!e.clipboardData) return;
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      var text = sel.toString();
      if (!text.trim()) return;

      var url  = window.location.href;
      var lang = getLang();
      var label = lang === 'en' ? 'Source: ' : '來源：';
      var plain = text + '\n\n' + label + url;
      var html  = text + '<br><br>' + label + '<a href="' + url + '">' + url + '</a>';

      e.clipboardData.setData('text/plain', plain);
      e.clipboardData.setData('text/html',  html);
      e.preventDefault();
    });
  }

  /* ── Init ── */
  function init(activeKey) {
    applyLang();
    updateI18n();
    renderNav(activeKey);
    renderMobileMenu(activeKey);
    wireLang(activeKey);
    wireMobileMenu(activeKey);
    wireFX();
    wireLoginModal();
    wireContactModal();
    wireContributeModal();
    wireNewsletter();
    loadTicker();
    wireCopyAttribution();

    /* register core nav/i18n re-render on lang change */
    onLangChange(function () {
      renderNav(activeKey);
      renderMobileMenu(activeKey);
      updateI18n();
      applyTickerFromMap(_tickerMap);
    });
  }

  /* ── Exports ── */
  global.IsshoCore = {
    init,
    getLang,
    setLang,
    onLangChange,
    t,
    cardHTML,
    ICONS,
  };

})(window);

/* ── Anti-bfcache flash ──────────────────────────────────────────────────
   When the browser restores a page from the back/forward cache (bfcache),
   it replays the exact DOM state — including body.js-ready — bypassing the
   opacity:0 FOUC guard. Force a reload so the page is always fresh.
──────────────────────────────────────────────────────────────────────── */
window.addEventListener('pageshow', function (e) {
  if (e.persisted) window.location.reload();
});
