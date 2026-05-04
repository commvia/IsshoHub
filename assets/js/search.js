/* IsshoHub — Search overlay */
(function (global) {
  'use strict';

  let debounceTimer = null;
  let lastQuery = '';

  /* ── Build overlay HTML ── */
  function buildHTML() {
    return `
    <div class="search-overlay" id="searchOverlay" role="dialog" aria-modal="true" aria-label="搜尋">
      <div class="search-box">
        <div class="search-input-wrap">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input
            type="text"
            id="searchInput"
            class="search-input"
            placeholder="搜尋文章 / Search articles…"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
          />
          <button class="search-clear" id="searchClear" style="display:none" aria-label="清除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <button class="search-close" id="searchClose" aria-label="關閉">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          <span>ESC</span>
        </button>
      </div>
      <div class="search-body" id="searchBody">
        <div class="search-empty" id="searchEmpty">
          <div class="search-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          </div>
          <div class="search-empty-text" id="searchEmptyText">輸入關鍵字搜尋文章</div>
        </div>
        <div class="search-spinner" id="searchSpinner" style="display:none">
          <div class="spinner"></div>
        </div>
        <div class="search-results" id="searchResults" style="display:none"></div>
      </div>
    </div>`;
  }

  /* ── Article card for results ── */
  function resultCard(a, lang) {
    const title   = lang === 'tc' ? (a.title_tc || a.title_en) : (a.title_en || a.title_tc);
    const excerpt = lang === 'tc' ? (a.excerpt_tc || '') : (a.excerpt_en || '');
    const img     = a.cover_image_url || 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=70';
    const cat     = a.category_key || '';
    const date    = a.published_at ? new Date(a.published_at).toLocaleDateString(lang === 'tc' ? 'zh-Hant' : 'en', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    return `
      <a class="sr-card" href="/article/?slug=${a.slug}">
        <div class="sr-thumb" style="background-image:url('${img}')">
          <span class="sr-tag cat-${cat}">${cat}</span>
        </div>
        <div class="sr-body">
          <div class="sr-title">${title}</div>
          <div class="sr-excerpt">${excerpt}</div>
          <div class="sr-meta">${date}</div>
        </div>
      </a>`;
  }

  /* ── Run search ── */
  async function runSearch(query) {
    const input     = document.getElementById('searchInput');
    const spinner   = document.getElementById('searchSpinner');
    const results   = document.getElementById('searchResults');
    const empty     = document.getElementById('searchEmpty');
    const emptyText = document.getElementById('searchEmptyText');
    const clearBtn  = document.getElementById('searchClear');

    const q = (query || '').trim();
    lastQuery = q;

    clearBtn.style.display = q ? 'flex' : 'none';

    if (!q) {
      spinner.style.display  = 'none';
      results.style.display  = 'none';
      empty.style.display    = 'flex';
      emptyText.textContent  = getLang() === 'tc' ? '輸入關鍵字搜尋文章' : 'Type to search articles';
      return;
    }

    spinner.style.display  = 'flex';
    results.style.display  = 'none';
    empty.style.display    = 'none';

    const { data, error } = await window.IsshoAPI.searchArticles(q);

    /* Guard stale results if user typed something else while waiting */
    if (lastQuery !== q) return;

    spinner.style.display = 'none';

    if (error || !data || data.length === 0) {
      results.style.display = 'none';
      empty.style.display   = 'flex';
      emptyText.textContent = getLang() === 'tc'
        ? `找不到「${q}」的相關文章`
        : `No results for "${q}"`;
      return;
    }

    const lang = getLang();
    results.innerHTML = data.map(a => resultCard(a, lang)).join('');
    results.style.display = 'grid';
    empty.style.display   = 'none';

    /* Close overlay when a result is clicked */
    results.querySelectorAll('.sr-card').forEach(card => {
      card.addEventListener('click', close);
    });
  }

  function getLang() {
    return (window.IsshoCore && window.IsshoCore.getLang) ? window.IsshoCore.getLang() : 'tc';
  }

  /* ── Open / Close ── */
  function open(prefill) {
    if (!document.getElementById('searchOverlay')) {
      document.body.insertAdjacentHTML('beforeend', buildHTML());
      wire();
    }

    const overlay = document.getElementById('searchOverlay');
    const input   = document.getElementById('searchInput');

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    /* Small delay so transition fires after display:block */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        input.focus();
        if (prefill) {
          input.value = prefill;
          runSearch(prefill);
        } else {
          input.value = '';
          runSearch('');
        }
      });
    });
  }

  function close() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── Wire events ── */
  function wire() {
    const overlay  = document.getElementById('searchOverlay');
    const input    = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClear');

    document.getElementById('searchClose').addEventListener('click', close);

    /* Close when clicking the dark backdrop (but not the white box) */
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    /* Keyboard: ESC to close */
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', onKey);
      }
    });

    /* Debounced input */
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => runSearch(input.value), 280);
    });

    /* Clear button */
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      runSearch('');
    });
  }

  /* ── Wire search button + hot pills ── */
  function init() {
    /* Nav search button */
    document.querySelectorAll('.search-btn').forEach(btn => {
      btn.addEventListener('click', () => open());
    });

    /* Hot search pills — clicking a pill opens search pre-filled */
    document.addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      const keyword = pill.querySelector('.rank') ? pill.textContent.replace(pill.querySelector('.rank').textContent, '').trim() : pill.textContent.trim();
      open(keyword);
    });
  }

  global.IsshoSearch = { init, open, close };

})(window);
