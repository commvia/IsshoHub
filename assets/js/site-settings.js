/* IsshoHub — Site Settings Manager */
(function (global) {
  'use strict';

  const SETTING_KEYS = [
    { key: 'ticker',    label: '跑馬燈文字', labelEn: 'Ticker text', type: 'textarea' },
    { key: 'rate_hkd',  label: 'HKD → JPY 匯率', labelEn: 'HKD rate', type: 'number' },
    { key: 'rate_twd',  label: 'TWD → JPY 匯率', labelEn: 'TWD rate', type: 'number' },
    { key: 'rate_usd',  label: 'USD → JPY 匯率', labelEn: 'USD rate', type: 'number' },
    { key: 'rate_eur',  label: 'EUR → JPY 匯率', labelEn: 'EUR rate', type: 'number' },
  ];

  /* ── Build panel HTML ── */
  function buildHTML() {
    return `
    <div class="ss-overlay" id="ssManager">
      <div class="ss-panel">
        <div class="editor-header">
          <div class="editor-header-left">
            <h2 class="editor-title">網站設定</h2>
            <span class="editor-status" id="ssStatus"></span>
          </div>
          <div class="editor-header-actions">
            <button class="editor-btn editor-btn-primary" id="ssSaveAll">儲存全部</button>
            <button class="editor-close" id="ssClose">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
        </div>
        <div class="ss-body">
          <div class="ss-section">
            <div class="ss-section-title">🖼 Hero 主視覺</div>
            <div class="ss-row">
              <label>封面照片 URL</label>
              <input type="text" id="ss_hero_img" placeholder="https://images.unsplash.com/..." style="width:100%" />
            </div>
            <div class="ss-row" style="margin-top:6px">
              <label style="font-size:11px;color:var(--ink-3)">預覽</label>
              <div id="ss_hero_preview" style="width:100%;height:120px;background-size:cover;background-position:center;border-radius:8px;border:1px solid var(--line);margin-top:6px;"></div>
            </div>
          </div>

          <div class="ss-section">
            <div class="ss-section-title">📰 首頁文章設定</div>
            <div class="ss-row">
              <label>Hero Kicker 標籤（繁中）</label>
              <input type="text" id="ss_hero_kicker_tc" placeholder="例：2026 最新政策解讀" style="width:100%" />
            </div>
            <div class="ss-row">
              <label>Hero Kicker 標籤（English）</label>
              <input type="text" id="ss_hero_kicker_en" placeholder="e.g. 2026 policy deep-dive" style="width:100%" />
              <div style="font-size:11px;color:var(--ink-3);margin-top:4px">顯示在 Hero 大圖標題上方的小標籤。留空則自動顯示文章分類名稱。</div>
            </div>
            <div class="ss-row">
              <label>Hero 大圖文章 Slug</label>
              <textarea id="ss_hero_article_slug" rows="1" placeholder="article-slug"></textarea>
              <div style="font-size:11px;color:var(--ink-3);margin-top:4px">Hero 大圖連結的文章。Slug 可在文章編輯器找到。</div>
            </div>
            <div class="ss-row">
              <label>右側三篇文章 Slug（逗號分隔，最多 3 篇）</label>
              <textarea id="ss_homepage_side_slugs" rows="2" placeholder="slug-1, slug-2, slug-3"></textarea>
              <div style="font-size:11px;color:var(--ink-3);margin-top:4px">Hero 右側三張卡片的文章。</div>
            </div>
            <div class="ss-row">
              <label>Editor Picks 文章（Slug，逗號分隔，最多 3 篇）</label>
              <textarea id="ss_homepage_picks_slugs" rows="2" placeholder="my-article-slug, another-slug, third-slug"></textarea>
              <div style="font-size:11px;color:var(--ink-3);margin-top:4px">留空則自動顯示最新精選文章。Slug 可在文章編輯器找到。</div>
            </div>
            <div class="ss-row">
              <label>精選文章排序（Slug，逗號分隔）</label>
              <textarea id="ss_featured_order" rows="3" placeholder="slug-1, slug-2, slug-3"></textarea>
              <div style="font-size:11px;color:var(--ink-3);margin-top:4px">控制各分類頁「精選大圖」的優先順序。排最前的 slug 優先顯示。Editor Picks 留空時也依此排序。</div>
            </div>
          </div>

          <div class="ss-section">
            <div class="ss-section-title">👥 人物故事 Stories</div>
            <div class="ss-row">
              <label>第 1 張故事卡 Slug</label>
              <input type="text" id="ss_story_slug_1" placeholder="article-slug" style="width:100%" />
            </div>
            <div class="ss-row">
              <label>第 2 張故事卡 Slug</label>
              <input type="text" id="ss_story_slug_2" placeholder="article-slug" style="width:100%" />
            </div>
            <div class="ss-row">
              <label>第 3 張故事卡 Slug</label>
              <input type="text" id="ss_story_slug_3" placeholder="article-slug" style="width:100%" />
              <div style="font-size:11px;color:var(--ink-3);margin-top:4px">文章需在「編輯文章」中填寫「人物故事引言」才會顯示。留空則顯示預設靜態卡片。</div>
            </div>
          </div>

          <div class="ss-section">
            <div class="ss-section-title">📢 跑馬燈 Ticker</div>
            <div class="ss-row">
              <label>繁中文字</label>
              <textarea id="ss_ticker_tc" rows="2" placeholder="最新：日圓匯率更新 · 簽證新政策公告"></textarea>
            </div>
            <div class="ss-row">
              <label>English text</label>
              <textarea id="ss_ticker_en" rows="2" placeholder="Latest: JPY rate update · New visa policy"></textarea>
            </div>
          </div>

          <div class="ss-section">
            <div class="ss-section-title">💴 即時匯率 Exchange Rates（對 JPY）</div>
            <div class="ss-rates">
              <div class="ss-rate-item">
                <label>HKD</label>
                <div class="ss-rate-input">
                  <span class="ss-rate-pre">HKD 1 =</span>
                  <input type="number" id="ss_rate_hkd" step="0.01" placeholder="19.42" />
                  <span class="ss-rate-suf">¥</span>
                </div>
              </div>
              <div class="ss-rate-item">
                <label>TWD</label>
                <div class="ss-rate-input">
                  <span class="ss-rate-pre">TWD 1 =</span>
                  <input type="number" id="ss_rate_twd" step="0.01" placeholder="4.71" />
                  <span class="ss-rate-suf">¥</span>
                </div>
              </div>
              <div class="ss-rate-item">
                <label>USD</label>
                <div class="ss-rate-input">
                  <span class="ss-rate-pre">USD 1 =</span>
                  <input type="number" id="ss_rate_usd" step="0.01" placeholder="151.83" />
                  <span class="ss-rate-suf">¥</span>
                </div>
              </div>
              <div class="ss-rate-item">
                <label>EUR</label>
                <div class="ss-rate-input">
                  <span class="ss-rate-pre">EUR 1 =</span>
                  <input type="number" id="ss_rate_eur" step="0.01" placeholder="164.22" />
                  <span class="ss-rate-suf">¥</span>
                </div>
              </div>
              <div class="ss-rate-item">
                <label>GBP</label>
                <div class="ss-rate-input">
                  <span class="ss-rate-pre">GBP 1 =</span>
                  <input type="number" id="ss_rate_gbp" step="0.01" placeholder="191.50" />
                  <span class="ss-rate-suf">¥</span>
                </div>
              </div>
<div class="ss-rate-item">
                <label>CAD</label>
                <div class="ss-rate-input">
                  <span class="ss-rate-pre">CAD 1 =</span>
                  <input type="number" id="ss_rate_cad" step="0.01" placeholder="111.20" />
                  <span class="ss-rate-suf">¥</span>
                </div>
              </div>
              <div class="ss-rate-item">
                <label>AUD</label>
                <div class="ss-rate-input">
                  <span class="ss-rate-pre">AUD 1 =</span>
                  <input type="number" id="ss_rate_aud" step="0.01" placeholder="96.80" />
                  <span class="ss-rate-suf">¥</span>
                </div>
              </div>
              <div class="ss-rate-item">
                <label>SGD</label>
                <div class="ss-rate-input">
                  <span class="ss-rate-pre">SGD 1 =</span>
                  <input type="number" id="ss_rate_sgd" step="0.01" placeholder="113.40" />
                  <span class="ss-rate-suf">¥</span>
                </div>
              </div>
            </div>
          </div>

          <div class="ss-section">
            <div class="ss-section-title">🔍 熱門搜尋 Hot Search</div>
            <div class="ss-row">
              <div style="font-size:12px;color:var(--ink-3);margin-bottom:10px">管理首頁熱門搜尋關鍵字、排序及顯示狀態。</div>
              <button class="editor-btn editor-btn-primary" id="ssOpenHotSearch" style="width:100%;justify-content:center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                管理熱門搜尋
              </button>
            </div>
          </div>

          <div id="ssError" class="editor-error" style="display:none"></div>
        </div>
      </div>
    </div>`;
  }

  /* ── Load settings into form ── */
  async function loadSettings() {
    const { data } = await window.IsshoAPI.fetchSiteSettings();
    if (!data) return;
    const map = Object.fromEntries(data.map(s => [s.key, s]));

    /* Hero */
    if (map.hero_img) {
      const imgEl = document.getElementById('ss_hero_img');
      if (imgEl) {
        imgEl.value = map.hero_img.value_tc || '';
        updateHeroPreview(map.hero_img.value_tc || '');
      }
    }
    /* Homepage article slugs */
    const heroKickerTcEl = document.getElementById('ss_hero_kicker_tc');
    if (heroKickerTcEl && map.hero_kicker) heroKickerTcEl.value = map.hero_kicker.value_tc || '';
    const heroKickerEnEl = document.getElementById('ss_hero_kicker_en');
    if (heroKickerEnEl && map.hero_kicker) heroKickerEnEl.value = map.hero_kicker.value_en || '';
    const heroSlugEl = document.getElementById('ss_hero_article_slug');
    if (heroSlugEl && map.hero_article_slug) heroSlugEl.value = map.hero_article_slug.value_tc || '';
    const sideSlugEl = document.getElementById('ss_homepage_side_slugs');
    if (sideSlugEl && map.homepage_side_slugs) sideSlugEl.value = map.homepage_side_slugs.value_tc || '';
    const picksEl = document.getElementById('ss_homepage_picks_slugs');
    if (picksEl && map.homepage_picks_slugs) picksEl.value = map.homepage_picks_slugs.value_tc || '';
    const featOrderEl = document.getElementById('ss_featured_order');
    if (featOrderEl && map.featured_order) featOrderEl.value = map.featured_order.value_tc || '';

    /* Story slugs */
    if (map.homepage_story_slugs) {
      const slugs = (map.homepage_story_slugs.value_tc || '').split(',').map(s => s.trim());
      const el1 = document.getElementById('ss_story_slug_1');
      const el2 = document.getElementById('ss_story_slug_2');
      const el3 = document.getElementById('ss_story_slug_3');
      if (el1) el1.value = slugs[0] || '';
      if (el2) el2.value = slugs[1] || '';
      if (el3) el3.value = slugs[2] || '';
    }

    /* Ticker */
    if (map.ticker) {
      document.getElementById('ss_ticker_tc').value = map.ticker.value_tc || '';
      document.getElementById('ss_ticker_en').value = map.ticker.value_en || '';
    }

    /* Rates */
    ['hkd','twd','usd','eur','gbp','cad','aud','sgd'].forEach(c => {
      const el = document.getElementById(`ss_rate_${c}`);
      if (el && map[`rate_${c}`]) el.value = map[`rate_${c}`].value_tc || '';
    });
  }

  function updateHeroPreview(url) {
    const preview = document.getElementById('ss_hero_preview');
    if (preview) preview.style.backgroundImage = url ? `url('${url}')` : '';
  }

  /* ── Save all settings ── */
  async function saveAll() {
    const btn = document.getElementById('ssSaveAll');
    const statusEl = document.getElementById('ssStatus');
    btn.disabled = true;

    const heroImg = document.getElementById('ss_hero_img')?.value.trim() || '';
    const heroArticleSlug = document.getElementById('ss_hero_article_slug')?.value.trim() || '';
    const sideSlugs = document.getElementById('ss_homepage_side_slugs')?.value.trim() || '';
    const picksSlugs = document.getElementById('ss_homepage_picks_slugs')?.value.trim() || '';
    const storySlugs = [
      document.getElementById('ss_story_slug_1')?.value.trim() || '',
      document.getElementById('ss_story_slug_2')?.value.trim() || '',
      document.getElementById('ss_story_slug_3')?.value.trim() || '',
    ].filter(Boolean).join(', ');
    const settings = [
      { key: 'homepage_story_slugs', tc: storySlugs, en: storySlugs },
      { key: 'hero_kicker', tc: document.getElementById('ss_hero_kicker_tc')?.value.trim() || '', en: document.getElementById('ss_hero_kicker_en')?.value.trim() || '' },
      { key: 'hero_article_slug',    tc: heroArticleSlug, en: heroArticleSlug },
      { key: 'homepage_side_slugs',  tc: sideSlugs,       en: sideSlugs },
      { key: 'homepage_picks_slugs', tc: picksSlugs,      en: picksSlugs },
      { key: 'featured_order', tc: document.getElementById('ss_featured_order')?.value.trim() || '', en: '' },
      { key: 'hero_img',    tc: heroImg, en: heroImg },
      { key: 'ticker', tc: document.getElementById('ss_ticker_tc').value.trim(), en: document.getElementById('ss_ticker_en').value.trim() },
      ...['hkd','twd','usd','eur','gbp','cad','aud','sgd'].map(c => {
        const v = document.getElementById(`ss_rate_${c}`)?.value.trim() || '';
        return { key: `rate_${c}`, tc: v, en: v };
      }),
    ];

    let hasError = false;
    for (const s of settings) {
      const { error } = await window.IsshoAPI.updateSiteSettings(s.key, s.tc, s.en);
      if (error) { hasError = true; showError(error.message); break; }
    }

    btn.disabled = false;
    if (!hasError) {
      statusEl.textContent = '✓ 已儲存';
      setTimeout(() => { statusEl.textContent = ''; }, 2000);
      clearError();
    }
  }

  function showError(msg) {
    const el = document.getElementById('ssError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function clearError() {
    const el = document.getElementById('ssError');
    if (el) el.style.display = 'none';
  }

  /* ── Open / Close ── */
  function open() {
    if (!document.getElementById('ssManager')) {
      document.body.insertAdjacentHTML('beforeend', buildHTML());
      wire();
    }
    loadSettings();
    document.getElementById('ssManager').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    const el = document.getElementById('ssManager');
    if (el) el.classList.remove('open');
    document.body.style.overflow = '';
  }

  function wire() {
    const overlay = document.getElementById('ssManager');
    document.getElementById('ssClose').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('ssSaveAll').addEventListener('click', saveAll);
    const imgInput = document.getElementById('ss_hero_img');
    if (imgInput) imgInput.addEventListener('input', e => updateHeroPreview(e.target.value));
    /* Hot search shortcut — close this panel and open hot search manager */
    const hsBtn = document.getElementById('ssOpenHotSearch');
    if (hsBtn) {
      hsBtn.addEventListener('click', function () {
        close();
        if (window.IsshoHotSearch) window.IsshoHotSearch.open();
      });
    }
  }

  /* ── Wire admin button ── */
  let _wired = false;
  function wire() {
    if (_wired) return;
    const btn = document.getElementById('adminSiteSettings');
    if (btn) { btn.addEventListener('click', open); _wired = true; }
  }
  function init() {
    wire();
    /* Admin bar is JS-injected after login, so re-wire on the ready event. */
    document.addEventListener('issho:admin-bar-ready', wire);
  }

  global.IsshoSettings = { init, open, close };

})(window);
