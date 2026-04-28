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
    if (map.ticker) {
      document.getElementById('ss_ticker_tc').value = map.ticker.value_tc || '';
      document.getElementById('ss_ticker_en').value = map.ticker.value_en || '';
    }
    if (map.rate_hkd) document.getElementById('ss_rate_hkd').value = map.rate_hkd.value_tc || '';
    if (map.rate_twd) document.getElementById('ss_rate_twd').value = map.rate_twd.value_tc || '';
    if (map.rate_usd) document.getElementById('ss_rate_usd').value = map.rate_usd.value_tc || '';
    if (map.rate_eur) document.getElementById('ss_rate_eur').value = map.rate_eur.value_tc || '';
  }

  /* ── Save all settings ── */
  async function saveAll() {
    const btn = document.getElementById('ssSaveAll');
    const statusEl = document.getElementById('ssStatus');
    btn.disabled = true;

    const settings = [
      { key: 'ticker',   tc: document.getElementById('ss_ticker_tc').value.trim(), en: document.getElementById('ss_ticker_en').value.trim() },
      { key: 'rate_hkd', tc: document.getElementById('ss_rate_hkd').value.trim(), en: document.getElementById('ss_rate_hkd').value.trim() },
      { key: 'rate_twd', tc: document.getElementById('ss_rate_twd').value.trim(), en: document.getElementById('ss_rate_twd').value.trim() },
      { key: 'rate_usd', tc: document.getElementById('ss_rate_usd').value.trim(), en: document.getElementById('ss_rate_usd').value.trim() },
      { key: 'rate_eur', tc: document.getElementById('ss_rate_eur').value.trim(), en: document.getElementById('ss_rate_eur').value.trim() },
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
  }

  /* ── Wire admin button ── */
  function init() {
    const btn = document.getElementById('adminSiteSettings');
    if (btn) btn.addEventListener('click', open);
  }

  global.IsshoSettings = { init, open, close };

})(window);
