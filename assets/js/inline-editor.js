/* IsshoHub — Inline Editor (article detail page) */
(function (global) {
  'use strict';

  let _article = null;
  let _editing  = false;

  /* ── Called from article/index.html after article is loaded ── */
  function init(article) {
    _article = article;

    /* core.js sets .is-admin on body after its own async auth check.
       We watch for that class instead of making a separate isAdmin() call
       (which only checks the profiles table and misses user_metadata role). */
    if (document.body.classList.contains('is-admin')) {
      activate();
      return;
    }

    /* Watch for is-admin to be added asynchronously by core.js */
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('is-admin')) {
        observer.disconnect();
        activate();
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    /* Fallback: also try isAdmin() directly (covers edge cases) */
    window.IsshoAuth.isAdmin().then(admin => {
      if (!admin) return;
      observer.disconnect();
      activate();
    }).catch(() => {});
  }

  function activate() {
    if (document.getElementById('inlineEditBtn')) return; /* already done */
    injectEditButton();
    if (new URLSearchParams(window.location.search).get('edit') === '1') enterEdit();
  }

  /* ── Inject floating edit button ── */
  function injectEditButton() {
    const btn = document.createElement('button');
    btn.id = 'inlineEditBtn';
    btn.className = 'inline-edit-fab';
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      編輯文章`;
    btn.addEventListener('click', enterEdit);
    document.body.appendChild(btn);
  }

  /* ── Enter edit mode ── */
  function enterEdit() {
    if (_editing) return;
    _editing = true;

    const lang = document.body.getAttribute('data-lang') || 'tc';

    /* Title → contenteditable */
    const titleEl = document.querySelector('.article-title');
    if (titleEl) {
      titleEl.contentEditable = 'true';
      titleEl.classList.add('inline-editable');
      titleEl.focus();
    }

    /* Body → textarea */
    const bodyEl = document.querySelector('.article-body');
    if (bodyEl) {
      const bodyContent = lang === 'tc'
        ? (_article.body_tc || _article.body_en || '')
        : (_article.body_en || _article.body_tc || '');
      const ta = document.createElement('textarea');
      ta.id = 'inlineBodyTA';
      ta.className = 'inline-body-textarea';
      ta.value = bodyContent;
      bodyEl.replaceWith(ta);
      autoResize(ta);
      ta.addEventListener('input', () => autoResize(ta));
    }

    /* Cover image URL input overlay */
    const coverEl = document.querySelector('.article-cover');
    if (coverEl) {
      const wrap = document.createElement('div');
      wrap.className = 'inline-cover-wrap';
      wrap.innerHTML = `
        <div style="position:relative;">
          ${coverEl.outerHTML}
          <div class="inline-cover-overlay">
            <label>封面圖片 URL</label>
            <input type="text" id="inlineCoverUrl" value="${_article.cover_image_url || ''}" placeholder="https://..." />
          </div>
        </div>`;
      coverEl.replaceWith(wrap);
      document.getElementById('inlineCoverUrl').addEventListener('input', e => {
        const img = wrap.querySelector('.article-cover');
        if (img) img.style.backgroundImage = `url('${e.target.value}')`;
      });
    }

    /* Hide FAB */
    const fab = document.getElementById('inlineEditBtn');
    if (fab) fab.style.display = 'none';

    /* Inject save bar */
    injectSaveBar();
  }

  /* ── Save bar ── */
  function injectSaveBar() {
    if (document.getElementById('inlineSaveBar')) return;
    const bar = document.createElement('div');
    bar.id = 'inlineSaveBar';
    bar.className = 'inline-save-bar';
    bar.innerHTML = `
      <span class="inline-save-status" id="inlineSaveStatus"></span>
      <div class="inline-save-actions">
        <button class="editor-btn editor-btn-danger" id="inlineDeleteBtn">🗑 刪除</button>
        <button class="editor-btn" id="inlineCancelBtn">取消</button>
        <button class="editor-btn editor-btn-primary" id="inlineSaveBtn">儲存</button>
      </div>`;
    document.body.appendChild(bar);
    document.getElementById('inlineSaveBtn').addEventListener('click', saveEdits);
    document.getElementById('inlineCancelBtn').addEventListener('click', () => location.reload());
    document.getElementById('inlineDeleteBtn').addEventListener('click', async () => {
      const confirmed = window.confirm('確定要刪除這篇文章嗎？此操作無法還原。');
      if (!confirmed) return;
      const btn = document.getElementById('inlineDeleteBtn');
      btn.disabled = true;
      btn.textContent = '刪除中…';
      const { error } = await window.IsshoAPI.deleteArticle(_article.id);
      if (error) {
        btn.disabled = false;
        btn.textContent = '🗑 刪除';
        document.getElementById('inlineSaveStatus').textContent = '❌ ' + error.message;
      } else {
        window.location.href = _article.category_key ? `/${_article.category_key}/` : '/';
      }
    });
  }

  /* ── Save to Supabase ── */
  async function saveEdits() {
    const saveBtn  = document.getElementById('inlineSaveBtn');
    const statusEl = document.getElementById('inlineSaveStatus');
    saveBtn.disabled = true;
    statusEl.textContent = '儲存中…';
    statusEl.style.color = '';

    const lang       = document.body.getAttribute('data-lang') || 'tc';
    const titleEl    = document.querySelector('.article-title');
    const bodyTA     = document.getElementById('inlineBodyTA');
    const coverInput = document.getElementById('inlineCoverUrl');

    const updates = { id: _article.id };
    if (titleEl) {
      if (lang === 'tc') updates.title_tc = titleEl.textContent.trim();
      else               updates.title_en = titleEl.textContent.trim();
    }
    if (bodyTA) {
      if (lang === 'tc') updates.body_tc = bodyTA.value;
      else               updates.body_en = bodyTA.value;
    }
    if (coverInput) updates.cover_image_url = coverInput.value.trim();

    const { error } = await window.IsshoAPI.upsertArticle({ ..._article, ...updates });

    if (error) {
      statusEl.textContent = '❌ ' + error.message;
      statusEl.style.color = '#e53e3e';
      saveBtn.disabled = false;
    } else {
      Object.assign(_article, updates);
      statusEl.textContent = '✓ 已儲存';
      statusEl.style.color = '#38a169';
      saveBtn.disabled = false;
      setTimeout(() => { statusEl.textContent = ''; }, 2500);
    }
  }

  function autoResize(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }

  global.IsshoInlineEditor = { init };

})(window);
