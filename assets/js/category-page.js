/* IsshoHub — Universal category page controller */
(function (global) {
  'use strict';

  /* ── Per-category SVG icon HTML (stroke-based, 28×28 viewBox 24×24) ── */
  const CAT_ICONS = {
    news:   '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 11h10M7 15h6"/>',
    visa:   '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="11" r="3.2"/><path d="M8 17h8"/>',
    biz:    '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>',
    house:  '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>',
    tax:    '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/>',
    life:   '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    places: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>',
    pets:   '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>',
    story:  '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  };

  /* ── Article card HTML (from Supabase row) ── */
  function sbCardHTML(a, lang, opts) {
    opts = opts || {};
    const hasTC   = !!(a.title_tc);
    const title   = lang === 'tc' ? (a.title_tc || a.title_en) : (a.title_en || a.title_tc);
    const excerpt = lang === 'tc' ? (a.excerpt_tc || a.excerpt_en || '') : (a.excerpt_en || a.excerpt_tc || '');
    const langBadge = (lang === 'tc' && !hasTC) ? '<span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:.05em;padding:2px 6px;border-radius:4px;background:#e8f0fb;color:#1a56a8;margin-bottom:6px;">EN ONLY</span><br>' : '';
    const img     = a.cover_image_url || 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80';
    const cat     = a.category_key || '';
    const author  = a.author || '';
    const date    = a.published_at
      ? new Date(a.published_at).toLocaleDateString(lang === 'tc' ? 'zh-Hant' : 'en', { year: 'numeric', month: 'short', day: 'numeric' })
      : '';
    const readTime = lang === 'tc' ? `${a.read_time || 5} 分鐘閱讀` : `${a.read_time || 5} min read`;
    return `
      <article class="card${opts.featured ? ' featured' : ''}${opts.overlay ? ' overlay' : ''}">
        <a class="card-media" href="/article/?slug=${a.slug}" style="background-image:url('${img}')">
          <span class="card-tag cat-${cat}">${cat}</span>
        </a>
        <div class="card-body">
          ${langBadge}<h3 class="card-title"><a href="/article/?slug=${a.slug}" style="color:inherit;text-decoration:none;">${title}</a></h3>
          <p class="card-excerpt">${excerpt}</p>
          <div class="card-meta">
            <span class="author">${author}</span>
            ${author ? '<span class="dot"></span>' : ''}
            <span>${date}</span>
            <span class="reading">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              ${readTime}
            </span>
          </div>
        </div>
      </article>`;
  }

  /* ── Empty state ── */
  function emptyHTML(lang) {
    return `<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--ink-3);">
      <div style="font-size:36px;margin-bottom:12px;">📭</div>
      <div style="font-size:15px;font-weight:500;">${lang === 'tc' ? '這個分類暫時沒有文章' : 'No articles in this sub-category yet'}</div>
    </div>`;
  }

  global.IsshoCategory = {
    init: function (categoryKey) {
      const D    = global.ISSHO_DATA;
      const C    = global.IsshoCore;
      const meta = (D.cat_meta || {})[categoryKey] || {};
      const nav  = (D.nav || []).find(n => n.key === categoryKey) || {};

      /* Sub-categories: extract key from URL fragment */
      const SUBS = (nav.sub || []).map(function (s) {
        return Object.assign({}, s, { key: (s.url || '').split('#')[1] || '' });
      });

      let activeSub = '';
      let _articles = null;

      /* Restore sub from URL hash on load */
      const hashKey = (global.location.hash || '').replace('#', '');
      if (hashKey && SUBS.some(function (s) { return s.key === hashKey; })) {
        activeSub = hashKey;
      }

      function getLang() { return C.getLang(); }

      /* ── Hero ── */
      function renderHero() {
        const lang   = getLang();
        const title  = lang === 'tc' ? nav.tc  : nav.en;
        const enSub  = lang === 'tc' ? nav.en  : nav.tc;
        const desc   = lang === 'tc' ? meta.desc_tc : meta.desc_en;
        const breadcrumb = lang === 'tc' ? nav.tc : nav.en;
        const statLabel  = lang === 'tc' ? '篇文章' : 'articles';
        const statSubs   = lang === 'tc' ? '個子分類' : 'sub-categories';

        var titleEl = document.getElementById('catHeroTitle');
        var enEl    = document.getElementById('catHeroEn');
        var descEl  = document.getElementById('catHeroDesc');
        var bcEl    = document.getElementById('heroBreadcrumbCurrent');
        var labEl   = document.getElementById('catStatLabel');
        var subEl   = document.getElementById('catStatSubs');
        var subNum  = document.getElementById('catStatSubsNum');
        var wm      = document.getElementById('catHeroWatermark');
        var bgEl    = document.getElementById('catHeroBg');

        if (titleEl) titleEl.textContent = title || '';
        if (enEl)    enEl.textContent    = enSub || '';
        if (descEl)  descEl.textContent  = desc  || '';
        if (bcEl)    bcEl.textContent    = breadcrumb || '';
        if (labEl)   labEl.textContent   = statLabel;
        if (subEl)   subEl.textContent   = statSubs;
        if (subNum)  subNum.textContent  = SUBS.length;
        if (wm)      wm.textContent      = (lang === 'tc' ? meta.watermark : (meta.watermark_en || categoryKey.toUpperCase())) || '';
        if (bgEl && meta.bg) bgEl.style.backgroundImage = "url('" + meta.bg + "')";
      }

      /* ── Sub-category nav ── */
      function renderSubcatNav(articles) {
        var lang  = getLang();
        var total = articles ? articles.length : 0;
        var tabs  = [{ key: '', tc: '全部', en: 'All', count: total }];
        SUBS.forEach(function (s) {
          var count = articles ? articles.filter(function (a) { return a.sub_category_key === s.key; }).length : 0;
          tabs.push({ key: s.key, tc: s.tc, en: s.en, count: count });
        });

        var scrollEl = document.getElementById('subcatScroll');
        if (!scrollEl) return;

        scrollEl.innerHTML = tabs.map(function (tab) {
          var label  = lang === 'tc' ? tab.tc : tab.en;
          var active = tab.key === activeSub;
          return '<a href="javascript:void(0)" class="subcat-tab' + (active ? ' active' : '') + '" data-sub="' + tab.key + '">'
            + label + '<span class="count">' + tab.count + '</span>'
            + '</a>';
        }).join('');

        /* Replace to avoid duplicate listeners */
        var newScroll = scrollEl.cloneNode(true);
        scrollEl.parentNode.replaceChild(newScroll, scrollEl);
        newScroll.addEventListener('click', function (e) {
          var tab = e.target.closest('.subcat-tab');
          if (!tab) return;
          activeSub = tab.getAttribute('data-sub');
          newScroll.querySelectorAll('.subcat-tab').forEach(function (t) { t.classList.remove('active'); });
          tab.classList.add('active');
          if (activeSub) {
            global.history.replaceState(null, '', '#' + activeSub);
          } else {
            global.history.replaceState(null, '', global.location.pathname);
          }
          filterAndRender();
        });
      }

      /* ── Load from Supabase ── */
      function loadArticles() {
        if (_articles) return Promise.resolve(_articles);
        return global.IsshoAPI.fetchArticles({ category: categoryKey, limit: 30 })
          .then(function (res) {
            _articles = res.data || [];
            return _articles;
          });
      }

      /* ── Filter by active sub ── */
      function filterArticles(articles) {
        if (!activeSub) return articles;
        return articles.filter(function (a) { return a.sub_category_key === activeSub; });
      }

      /* ── Render featured + grid ── */
      function filterAndRender() {
        loadArticles().then(function (articles) {
          var lang           = getLang();
          var filtered       = filterArticles(articles);
          var featuredSect   = document.querySelector('.cat-featured-section');
          var featuredGrid   = document.getElementById('catFeaturedGrid');
          var articlesGrid   = document.getElementById('catArticlesGrid');
          var articlesTitleEl = document.getElementById('articlesTitle');

          /* Featured: show only on "all" tab, and only if an article is explicitly marked featured */
          var featured = articles.find(function (a) { return a.featured; }) || null;
          if (!activeSub && featured) {
            if (featuredSect) featuredSect.style.display = '';
            if (featuredGrid) featuredGrid.innerHTML = sbCardHTML(featured, lang, { featured: true, overlay: true });
          } else {
            if (featuredSect) featuredSect.style.display = 'none';
          }

          /* Articles section title */
          if (articlesTitleEl) {
            if (!activeSub) {
              articlesTitleEl.textContent = lang === 'tc' ? '全部文章' : 'All articles';
            } else {
              var sub = SUBS.find(function (x) { return x.key === activeSub; });
              articlesTitleEl.textContent = sub ? (lang === 'tc' ? sub.tc : sub.en) : '';
            }
          }

          /* Articles grid: exclude the featured article to avoid duplication */
          var _featuredId = featured && featured.id;
          if (articlesGrid) {
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
          }

          /* Update hero article count */
          var numEl = document.getElementById('catStatNum');
          if (numEl && articles.length) numEl.textContent = articles.length;
        });
      }

      /* ── Full initial render ── */
      function renderAll() {
        renderHero();
        loadArticles().then(function (articles) {
          renderSubcatNav(articles);
          filterAndRender();
        });
      }

      C.init(categoryKey);
      C.onLangChange(function () { activeSub = ''; renderAll(); });
      renderAll();
      if (global.IsshoEditor) global.IsshoEditor.init();
      if (global.IsshoSearch) global.IsshoSearch.init();
    },
  };
}(window));
