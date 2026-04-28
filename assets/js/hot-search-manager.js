/* IsshoHub — Hot Search Manager */
(function (global) {
  'use strict';

  /* ── Fetch all hot searches (admin) ── */
  async function fetchAll() {
    const client = window.IsshoAuth.getClient();
    const { data, error } = await client
      .from('hot_searches')
      .select('*')
      .order('sort_order');
    return { data: data || [], error };
  }

  /* ── Build panel HTML ── */
  function buildHTML() {
    return `
    <div class="hs-overlay" id="hsManager">
      <div class="hs-panel">
        <div class="editor-header">
          <div class="editor-header-left">
            <h2 class="editor-title">熱門搜尋管理</h2>
            <span class="editor-status" id="hsStatus"></span>
          </div>
          <div class="editor-header-actions">
            <button class="editor-btn editor-btn-primary" id="hsSaveAll">儲存全部</button>
            <button class="editor-close" id="hsClose">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
        </div>
        <div class="hs-body">
          <p class="hs-hint">拖動 ☰ 可調整順序；關閉「顯示」則不顯示在前台。</p>
          <div id="hsList" class="hs-list"></div>
          <div class="hs-add-row">
            <input type="text" id="hsNewTc" placeholder="繁中關鍵字" class="hs-input" />
            <input type="text" id="hsNewEn" placeholder="English keyword" class="hs-input" />
            <button class="editor-btn editor-btn-primary" id="hsAddBtn">＋ 新增</button>
          </div>
          <div id="hsError" class="editor-error" style="display:none"></div>
        </div>
      </div>
    </div>`;
  }

  /* ── Render list ── */
  function renderList(items) {
    const list = document.getElementById('hsList');
    if (!items.length) {
      list.innerHTML = '<p style="color:#aaa;padding:12px 0">尚未有熱門搜尋</p>';
      return;
    }
    list.innerHTML = items.map((item, i) => `
      <div class="hs-row" draggable="true" data-id="${item.id}" data-idx="${i}">
        <span class="hs-drag">☰</span>
        <span class="hs-rank">${String(i + 1).padStart(2, '0')}</span>
        <input type="text" class="hs-input hs-tc" value="${item.keyword_tc || ''}" placeholder="繁中" />
        <input type="text" class="hs-input hs-en" value="${item.keyword_en || ''}" placeholder="English" />
        <label class="toggle-switch" title="顯示中">
          <input type="checkbox" class="hs-active" ${item.active ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
        <button class="hs-del" data-id="${item.id}" title="刪除">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>`).join('');

    /* Delete buttons */
    list.querySelectorAll('.hs-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (!confirm('確定刪除？')) return;
        const { error } = await window.IsshoAPI.deleteHotSearch(id);
        if (error) return showError(error.message);
        await reload();
      });
    });

    /* Drag-and-drop reorder */
    wireDrag(list);
  }

  function wireDrag(list) {
    let dragEl = null;

    list.querySelectorAll('.hs-row').forEach(row => {
      row.addEventListener('dragstart', e => {
        dragEl = row;
        row.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', () => {
        dragEl = null;
        row.style.opacity = '';
        list.querySelectorAll('.hs-row').forEach(r => r.classList.remove('drag-over'));
        /* Update rank numbers */
        list.querySelectorAll('.hs-row').forEach((r, i) => {
          r.querySelector('.hs-rank').textContent = String(i + 1).padStart(2, '0');
        });
      });
      row.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (row !== dragEl) {
          list.querySelectorAll('.hs-row').forEach(r => r.classList.remove('drag-over'));
          row.classList.add('drag-over');
        }
      });
      row.addEventListener('drop', e => {
        e.preventDefault();
        if (dragEl && row !== dragEl) {
          const rows = [...list.querySelectorAll('.hs-row')];
          const fromIdx = rows.indexOf(dragEl);
          const toIdx = rows.indexOf(row);
          if (fromIdx < toIdx) row.after(dragEl);
          else row.before(dragEl);
        }
      });
    });
  }

  async function reload() {
    const { data } = await fetchAll();
    renderList(data);
  }

  /* ── Save all ── */
  async function saveAll() {
    const rows = document.querySelectorAll('#hsList .hs-row');
    const statusEl = document.getElementById('hsStatus');
    document.getElementById('hsSaveAll').disabled = true;

    let hasError = false;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const id = parseInt(row.getAttribute('data-id'));
      const keyword_tc = row.querySelector('.hs-tc').value.trim();
      const keyword_en = row.querySelector('.hs-en').value.trim();
      const active = row.querySelector('.hs-active').checked;
      const sort_order = i + 1;

      const { error } = await window.IsshoAPI.upsertHotSearch({ id, keyword_tc, keyword_en, active, sort_order });
      if (error) { hasError = true; showError(error.message); break; }
      row.querySelector('.hs-rank').textContent = String(sort_order).padStart(2, '0');
    }

    document.getElementById('hsSaveAll').disabled = false;
    if (!hasError) {
      statusEl.textContent = '✓ 已儲存';
      setTimeout(() => { statusEl.textContent = ''; }, 2000);
    }
  }

  /* ── Add new ── */
  async function addNew() {
    const tc = document.getElementById('hsNewTc').value.trim();
    const en = document.getElementById('hsNewEn').value.trim();
    if (!tc && !en) return showError('請填寫關鍵字');
    clearError();

    const rows = document.querySelectorAll('#hsList .hs-row');
    const sort_order = rows.length + 1;
    const { error } = await window.IsshoAPI.upsertHotSearch({ keyword_tc: tc, keyword_en: en, active: true, sort_order });
    if (error) return showError(error.message);
    document.getElementById('hsNewTc').value = '';
    document.getElementById('hsNewEn').value = '';
    await reload();
  }

  function showError(msg) {
    const el = document.getElementById('hsError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function clearError() {
    const el = document.getElementById('hsError');
    if (el) el.style.display = 'none';
  }

  /* ── Open / Close ── */
  function open() {
    if (!document.getElementById('hsManager')) {
      document.body.insertAdjacentHTML('beforeend', buildHTML());
      wire();
    }
    reload();
    document.getElementById('hsManager').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    const el = document.getElementById('hsManager');
    if (el) el.classList.remove('open');
    document.body.style.overflow = '';
  }

  function wire() {
    const overlay = document.getElementById('hsManager');
    document.getElementById('hsClose').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('hsSaveAll').addEventListener('click', saveAll);
    document.getElementById('hsAddBtn').addEventListener('click', addNew);
    document.getElementById('hsNewEn').addEventListener('keydown', e => { if (e.key === 'Enter') addNew(); });
  }

  /* ── Wire admin button ── */
  function init() {
    const btn = document.getElementById('adminManageHotSearch');
    if (btn) btn.addEventListener('click', open);
  }

  global.IsshoHotSearch = { init, open, close };

})(window);
