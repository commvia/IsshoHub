/* IsshoHub — core shared logic */
(function (global) {
  'use strict';

  /* ── Icon library ── */
  const ICONS = {
    passport: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="11" r="3.2"/><path d="M8 17h8"/></svg>`,
    briefcase: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M3 12h18"/></svg>`,
    home: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9"/></svg>`,
    yen: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l6 8 6-8"/><path d="M12 12v9"/><path d="M7 15h10"/><path d="M7 19h10"/></svg>`,
    life: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2"/></svg>`,
    torii: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6c4 1 14 1 18 0"/><path d="M3 9h18"/><path d="M6 9v12"/><path d="M18 9v12"/><path d="M8 13h8"/></svg>`,
    paw: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="10" r="2"/><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="19" cy="10" r="2"/><path d="M12 12c-3 0-6 2-6 5 0 1.5 1 3 3 3 1 0 2-.5 3-.5s2 .5 3 .5c2 0 3-1.5 3-3 0-3-3-5-6-5z"/></svg>`,
    quote: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7c-2 0-3 2-3 4v6h5v-6H5"/><path d="M17 7c-2 0-3 2-3 4v6h5v-6h-4"/></svg>`,
  };

  /* ── State ── */
  const state = {
    lang: localStorage.getItem('issho.lang') || 'tc',
  };

  function getLang() { return state.lang; }

  function setLang(lang) {
    state.lang = lang;
    localStorage.setItem('issho.lang', lang);
    applyLang();
    if (typeof window.onLangChange === 'function') window.onLangChange(lang);
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
    'ticker1':       { tc: '新政策：2026 年 4 月起，香港、台灣駕照可免筆試直接切換。', en: 'New policy: From Apr 2026, HK & TW licences convert without a written test.' },
    'ticker2':       { tc: '本週 IsshoHub Meetup：4月25日・東京澀谷，名額將滿。', en: "This week's Meetup: Apr 25, Shibuya — nearly full." },
    'ticker-weather':{ tc: '東京 · 17° · 晴れ', en: 'Tokyo · 17° · Clear' },
    'ticker-rate':   { tc: 'HKD <b>¥19.42</b>&nbsp; TWD <b>¥4.71</b>', en: 'HKD <b>¥19.42</b>&nbsp; TWD <b>¥4.71</b>' },
    'hot_search':    { tc: '熱門搜尋', en: 'Hot searches' },
    'browse_cat':    { tc: '瀏覽分類', en: 'Browse categories' },
    'browse_cat_sub':{ tc: '從簽證到寵物、從稅務到好去處，一站式覆蓋在日生活所有面向。', en: 'From visas to pets, tax to travel — every corner of life in Japan.' },
    'editor_picks':  { tc: '編輯精選', en: "Editor's picks" },
    'editor_picks_sub': { tc: '本月最多人閱讀、最實用的在日指南。', en: 'The most-read, most-useful guides this month.' },
    'view_all':      { tc: '查看全部', en: 'View all' },
    'latest':        { tc: '最新文章', en: 'Latest articles' },
    'latest_sub':    { tc: '本週更新。來自編輯團隊與在地撰稿人。', en: 'Fresh this week — from the editors and our local contributors.' },
    'stories_title': { tc: '人物故事', en: 'Stories' },
    'stories_sub':   { tc: '他們為什麼選擇日本？在這裡如何生活、工作、扎根？', en: 'Why did they choose Japan? How do they live, work, and belong here?' },
    'checklist_title':{ tc: '抵日首 30 天：必辦清單', en: 'Your first 30 days in Japan' },
    'checklist_sub': { tc: '從在留卡到電話號碼，我們把所有關鍵步驟整理成清單。', en: 'From residence card to phone number — we mapped out every essential step.' },
    'checklist_cta': { tc: '開啟完整清單', en: 'Open full checklist' },
    'newsletter_title': { tc: '每週一封，剛剛好。', en: 'One email a week. That\'s it.' },
    'newsletter_sub': { tc: '在日新政策、最新文章、社群活動——整理好，送到你的信箱。', en: 'New policies, fresh articles, community events — curated for your inbox.' },
    'newsletter_cta': { tc: '訂閱電子報', en: 'Subscribe' },
    'footer_about':  { tc: 'IsshoHub 是一個繁中與英文雙語資訊平台，為移居日本的香港、台灣朋友與希望在日創業的團隊整理最實用的資源。外國人與日本人，一起生活、共同成長。', en: 'IsshoHub is a bilingual (Traditional Chinese + English) resource hub for foreigners living in or moving to Japan — and for startups making Japan home.' },
    'footer_col1':   { tc: '瀏覽分類', en: 'Explore' },
    'footer_col2':   { tc: '資源', en: 'Resources' },
    'footer_col3':   { tc: '關於', en: 'About' },
    'footer_r1':     { tc: '新手必讀', en: 'Start here' },
    'footer_r2':     { tc: '實用連結', en: 'Useful links' },
    'footer_r3':     { tc: '社群活動', en: 'Community events' },
    'footer_r4':     { tc: '匯率換算', en: 'Currency calculator' },
    'footer_r5':     { tc: '電子報', en: 'Newsletter' },
    'footer_a1':     { tc: '關於我們', en: 'About us' },
    'footer_a2':     { tc: '編輯團隊', en: 'Editorial team' },
    'footer_a3':     { tc: '投稿合作', en: 'Contribute' },
    'footer_a4':     { tc: '聯絡我們', en: 'Contact' },
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

    /* footer explore */
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
          <span class="card-tag cat-${a.cat}">${tag}</span>
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

  /* ── FX Calculator ── */
  function wireFX() {
    const fx = document.getElementById('fx');
    const trigger = document.getElementById('fxTrigger');
    const close = document.getElementById('fxClose');
    const input = document.getElementById('fxInput');
    const from = document.getElementById('fxFrom');
    const output = document.getElementById('fxOutput');
    if (!fx || !trigger) return;

    const D = window.ISSHO_DATA;
    function update() {
      const ccy = from.value;
      const amt = parseFloat(input.value) || 0;
      const rate = D.rates[ccy] || 1;
      output.value = '¥' + Math.round(amt * rate).toLocaleString('en-US');
      const fl = document.getElementById('fxFromFlag');
      if (fl) fl.className = 'flag flag-' + ccy.slice(0, 2).toLowerCase();
      const lbl = document.getElementById('fxFromLabel');
      if (lbl) lbl.textContent = ccy;
    }

    trigger.addEventListener('click', () => fx.classList.toggle('open'));
    if (close) close.addEventListener('click', () => fx.classList.remove('open'));
    if (input) input.addEventListener('input', update);
    if (from) from.addEventListener('change', update);
    update();

    /* close on outside click */
    document.addEventListener('click', e => {
      if (!fx.contains(e.target)) fx.classList.remove('open');
    });
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
      setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 280);
    }
    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    openBtns.forEach(b => b.addEventListener('click', openModal));
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    /* demo submit */
    const form = document.getElementById('loginForm');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const btn = form.querySelector('.btn-submit');
        btn.textContent = state.lang === 'tc' ? '✓ 登入成功' : '✓ Signed in';
        setTimeout(closeModal, 1200);
      });
    }
  }

  /* ── Lang toggle ── */
  function wireLang(activeKey) {
    const toggle = document.getElementById('langToggle');
    if (!toggle) return;
    toggle.addEventListener('click', e => {
      const b = e.target.closest('[data-lang-set]');
      if (!b) return;
      setLang(b.getAttribute('data-lang-set'));
      renderNav(activeKey);
      renderMobileMenu(activeKey);
      updateI18n();
    });
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
    wireNewsletter();

    /* re-render nav on lang change from page-specific code */
    window.onLangChange = function (lang) {
      renderNav(activeKey);
      renderMobileMenu(activeKey);
      updateI18n();
    };
  }

  /* ── Exports ── */
  global.IsshoCore = {
    init,
    getLang,
    setLang,
    t,
    cardHTML,
    ICONS,
  };

})(window);
