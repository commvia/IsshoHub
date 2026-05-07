/* IsshoHub — Inline Editor (article detail page) */
(function (global) {
  'use strict';

  let _article = null;
  let _editing  = false;

  /* ── Upload image to Supabase Storage ── */
  async function uploadImage(file) {
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const client = window.IsshoAuth.getClient();
    const { data, error } = await client.storage
      .from('article-images')
      .upload(filename, file, { contentType: file.type, upsert: false });
    if (error) return { url: null, error };
    const { data: urlData } = client.storage.from('article-images').getPublicUrl(filename);
    return { url: urlData.publicUrl, error: null };
  }

  /* ══════════════════════════════════════════
     Markdown toolbar helpers
  ══════════════════════════════════════════ */

  function mdToolbarHTML() {
    return `<div class="md-toolbar" id="inlineMdToolbar">
      <button type="button" class="md-toolbar-btn" data-md="bold" title="粗體 Cmd+B"><b>B</b></button>
      <button type="button" class="md-toolbar-btn" data-md="italic" title="斜體 Cmd+I"><i>I</i></button>
      <div class="md-toolbar-sep"></div>
      <button type="button" class="md-toolbar-btn" data-md="h2" title="大標題">H2</button>
      <button type="button" class="md-toolbar-btn" data-md="h3" title="小標題">H3</button>
      <div class="md-toolbar-sep"></div>
      <button type="button" class="md-toolbar-btn" data-md="ul" title="項目清單">• 清單</button>
      <button type="button" class="md-toolbar-btn" data-md="blockquote" title="引言">" 引言</button>
      <button type="button" class="md-toolbar-btn" data-md="hr" title="分隔線">— —</button>
      <div class="md-toolbar-sep"></div>
      <button type="button" class="md-toolbar-btn" data-md="image" title="插入圖片">🖼 圖片</button>
      <div class="md-toolbar-hint" id="inlineMdHint">📋 貼上 Word 內容可自動轉換格式</div>
    </div>
    <div class="md-img-form" id="inlineMdImgForm" style="display:none">
      <button type="button" class="md-img-upload-btn" id="inlineMdImgUploadBtn">⬆ 從電腦上傳</button>
      <input type="file" id="inlineMdImgFileInput" accept="image/*" style="display:none" />
      <span class="md-img-form-or">或</span>
      <input type="url" id="inlineMdImgUrl" placeholder="貼上圖片 URL" />
      <input type="text" id="inlineMdImgAlt" placeholder="說明文字（可留空）" />
      <button type="button" class="md-img-form-insert" id="inlineMdImgInsert">插入</button>
      <button type="button" class="md-img-form-cancel" id="inlineMdImgCancel">✕</button>
    </div>`;
  }

  function applyMdFormat(ta, format) {
    const start  = ta.selectionStart;
    const end    = ta.selectionEnd;
    const sel    = ta.value.substring(start, end);
    const before = ta.value.substring(0, start);
    const after  = ta.value.substring(end);
    let replacement = sel;
    let cursorOffset = 0;

    if (format === 'bold') {
      replacement  = sel ? `**${sel}**` : '**粗體文字**';
      cursorOffset = 2;
    } else if (format === 'italic') {
      replacement  = sel ? `*${sel}*` : '*斜體文字*';
      cursorOffset = 1;
    } else if (format === 'h2') {
      const ls   = before.lastIndexOf('\n') + 1;
      const line = ta.value.substring(ls, end || ta.value.length);
      const clean = line.replace(/^#{1,6}\s*/, '');
      ta.value = ta.value.substring(0, ls) + '## ' + clean;
      ta.selectionStart = ta.selectionEnd = ls + 3 + clean.length;
      ta.focus(); autoResize(ta); return;
    } else if (format === 'h3') {
      const ls   = before.lastIndexOf('\n') + 1;
      const line = ta.value.substring(ls, end || ta.value.length);
      const clean = line.replace(/^#{1,6}\s*/, '');
      ta.value = ta.value.substring(0, ls) + '### ' + clean;
      ta.selectionStart = ta.selectionEnd = ls + 4 + clean.length;
      ta.focus(); autoResize(ta); return;
    } else if (format === 'ul') {
      replacement  = sel ? sel.split('\n').map(l => l.trim() ? '- ' + l : l).join('\n') : '- 清單項目';
      cursorOffset = sel ? 0 : 2;
    } else if (format === 'blockquote') {
      replacement  = sel ? sel.split('\n').map(l => '> ' + l).join('\n') : '> 引言文字';
      cursorOffset = sel ? 0 : 2;
    } else if (format === 'hr') {
      replacement = '\n\n---\n\n';
    } else if (format === 'image') {
      const form = document.getElementById('inlineMdImgForm');
      if (form) {
        form.style.display = 'flex';
        form._ta     = ta;
        form._cursor = start;
        document.getElementById('inlineMdImgUrl').focus();
      }
      return;
    }

    ta.value = before + replacement + after;
    ta.selectionStart = start + cursorOffset;
    ta.selectionEnd   = start + replacement.length - cursorOffset;
    ta.focus();
    autoResize(ta);
  }

  /* HTML → Markdown (Word clipboard conversion) */
  function htmlToMarkdown(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('style,script,meta,link').forEach(el => el.remove());
    return walkMd(div).replace(/\n{3,}/g, '\n\n').trim();
  }

  function walkMd(node) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return '';
    const tag  = node.tagName.toLowerCase();
    if (['style','script','head'].includes(tag)) return '';
    const sty  = node.getAttribute('style') || '';
    const bold = /font-weight\s*:\s*(bold|[6-9]\d\d)/i.test(sty);
    const ital = /font-style\s*:\s*italic/i.test(sty);
    const inner = () => Array.from(node.childNodes).map(walkMd).join('');
    switch (tag) {
      case 'h1': return `\n\n# ${inner().trim()}\n\n`;
      case 'h2': return `\n\n## ${inner().trim()}\n\n`;
      case 'h3': return `\n\n### ${inner().trim()}\n\n`;
      case 'h4': return `\n\n#### ${inner().trim()}\n\n`;
      case 'p':  { const t = inner().trim(); return t ? `\n\n${t}\n\n` : ''; }
      case 'br': return '\n';
      case 'hr': return '\n\n---\n\n';
      case 'b': case 'strong': { const t = inner().trim(); return t ? `**${t}**` : ''; }
      case 'i': case 'em':     { const t = inner().trim(); return t ? `*${t}*`  : ''; }
      case 'u': return inner();
      case 'li': return `\n- ${inner().trim()}`;
      case 'ul': case 'ol': return `\n${inner()}\n`;
      case 'blockquote': return `\n\n> ${inner().trim()}\n\n`;
      case 'a': {
        const href = node.getAttribute('href') || '';
        const t    = inner().trim();
        if (!href || href.startsWith('mso-') || href === t) return t;
        return `[${t}](${href})`;
      }
      case 'code': return `\`${inner()}\``;
      case 'pre':  return `\n\`\`\`\n${inner()}\n\`\`\`\n`;
      case 'span': case 'div': {
        let t = inner();
        if (bold && t.trim()) t = `**${t.trim()}**`;
        if (ital && t.trim()) t = `*${t.trim()}*`;
        if (tag === 'div')    t = `\n\n${t.trim()}\n\n`;
        return t;
      }
      default: return inner();
    }
  }

  function wireMdToolbar(ta) {
    const toolbar = document.getElementById('inlineMdToolbar');
    if (!toolbar) return;
    toolbar.querySelectorAll('[data-md]').forEach(btn => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        applyMdFormat(ta, btn.getAttribute('data-md'));
      });
    });
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); applyMdFormat(ta, 'bold'); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); applyMdFormat(ta, 'italic'); }
    });
    /* Image form wiring */
    const imgForm = document.getElementById('inlineMdImgForm');
    if (imgForm) {
      const doInsert = () => {
        const url = document.getElementById('inlineMdImgUrl').value.trim();
        if (!url) { document.getElementById('inlineMdImgUrl').focus(); return; }
        const alt = document.getElementById('inlineMdImgAlt').value.trim();
        const ins = `\n\n![${alt}](${url})\n\n`;
        const pos = imgForm._cursor != null ? imgForm._cursor : (imgForm._ta ? imgForm._ta.value.length : 0);
        if (imgForm._ta) {
          imgForm._ta.value = imgForm._ta.value.substring(0, pos) + ins + imgForm._ta.value.substring(pos);
          imgForm._ta.selectionStart = imgForm._ta.selectionEnd = pos + ins.length;
          autoResize(imgForm._ta);
          imgForm._ta.focus();
        }
        imgForm.style.display = 'none';
        document.getElementById('inlineMdImgUrl').value = '';
        document.getElementById('inlineMdImgAlt').value = '';
      };
      document.getElementById('inlineMdImgInsert').addEventListener('click', doInsert);
      document.getElementById('inlineMdImgUrl').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doInsert(); } });
      document.getElementById('inlineMdImgCancel').addEventListener('click', () => {
        imgForm.style.display = 'none';
        ta.focus();
      });

      /* Upload from computer */
      const uploadBtn   = document.getElementById('inlineMdImgUploadBtn');
      const fileInput   = document.getElementById('inlineMdImgFileInput');
      if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async e => {
          const file = e.target.files[0];
          if (!file) return;
          const savedLabel = uploadBtn.textContent;
          uploadBtn.textContent = '上傳中…';
          uploadBtn.disabled = true;
          const { url, error } = await uploadImage(file);
          uploadBtn.textContent = savedLabel;
          uploadBtn.disabled = false;
          fileInput.value = '';
          if (error || !url) { alert('圖片上傳失敗，請重試'); return; }
          /* directly insert without filling form */
          const ins = `\n![](${url})\n`;
          const pos = imgForm._cursor != null ? imgForm._cursor : (imgForm._ta ? imgForm._ta.value.length : 0);
          if (imgForm._ta) {
            imgForm._ta.value = imgForm._ta.value.substring(0, pos) + ins + imgForm._ta.value.substring(pos);
            imgForm._ta.selectionStart = imgForm._ta.selectionEnd = pos + ins.length;
            autoResize(imgForm._ta);
            imgForm._ta.focus();
          }
          imgForm.style.display = 'none';
        });
      }
    }

    ta.addEventListener('paste', e => {
      const html = e.clipboardData && e.clipboardData.getData('text/html');
      if (!html || !/<(h[1-6]|b|strong|ul|ol|li|blockquote)/i.test(html)) return;
      e.preventDefault();
      const md    = htmlToMarkdown(html);
      const s     = ta.selectionStart;
      ta.value    = ta.value.substring(0, s) + md + ta.value.substring(ta.selectionEnd);
      ta.selectionStart = ta.selectionEnd = s + md.length;
      autoResize(ta);
      const hint = document.getElementById('inlineMdHint');
      if (hint) {
        const orig = hint.textContent;
        hint.textContent = '✓ 已自動轉換 Word 格式';
        hint.style.color = '#38a169';
        setTimeout(() => { hint.textContent = orig; hint.style.color = ''; }, 2500);
      }
    });
  }

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
    const titleEl = document.querySelector('.article-hero-title');
    if (titleEl) {
      titleEl.contentEditable = 'true';
      titleEl.classList.add('inline-editable');
      titleEl.focus();
    }

    /* Body → toolbar + textarea */
    const bodyEl = document.querySelector('.article-prose');
    if (bodyEl) {
      const bodyContent = lang === 'tc'
        ? (_article.body_tc || _article.body_en || '')
        : (_article.body_en || _article.body_tc || '');

      /* Wrap: toolbar above textarea */
      const wrap = document.createElement('div');
      wrap.className = 'inline-body-wrap';
      wrap.innerHTML = mdToolbarHTML();

      const ta = document.createElement('textarea');
      ta.id = 'inlineBodyTA';
      ta.className = 'inline-body-textarea';
      ta.value = bodyContent;
      wrap.appendChild(ta);

      bodyEl.replaceWith(wrap);
      autoResize(ta);
      ta.addEventListener('input', () => autoResize(ta));
      wireMdToolbar(ta);
    }

    /* Cover image — click-to-upload overlay */
    const coverEl = document.querySelector('.article-cover-img');
    if (coverEl) {
      const wrap = document.createElement('div');
      wrap.className = 'inline-cover-wrap';
      wrap.innerHTML = `
        <div class="inline-cover-img-wrap">
          ${coverEl.outerHTML}
          <div class="inline-cover-click-zone" id="inlineCoverZone">
            <input type="file" id="inlineCoverFile" accept="image/*" style="display:none">
            <div class="inline-cover-click-inner" id="inlineCoverClickInner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span id="inlineCoverZoneLabel">點擊更換封面圖片</span>
            </div>
          </div>
        </div>
        <div class="inline-cover-url-row">
          <input type="text" id="inlineCoverUrl" value="${_article.cover_image_url || ''}" placeholder="或貼上圖片 URL…" />
        </div>`;
      coverEl.replaceWith(wrap);

      const coverImg  = wrap.querySelector('.article-cover-img');
      const fileInput = document.getElementById('inlineCoverFile');
      const urlInput  = document.getElementById('inlineCoverUrl');
      const zone      = document.getElementById('inlineCoverZone');
      const label     = document.getElementById('inlineCoverZoneLabel');

      zone.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        label.textContent = '上傳中…';
        zone.style.pointerEvents = 'none';
        const ext = file.name.split('.').pop();
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const client = window.IsshoAuth.getClient();
        const { error: upErr } = await client.storage
          .from('article-images')
          .upload(filename, file, { contentType: file.type, upsert: false });
        if (upErr) {
          label.textContent = '❌ 上傳失敗，請貼上 URL';
          zone.style.pointerEvents = '';
          return;
        }
        const { data: urlData } = client.storage.from('article-images').getPublicUrl(filename);
        const url = urlData.publicUrl;
        urlInput.value = url;
        if (coverImg) coverImg.style.backgroundImage = `url('${url}')`;
        label.textContent = '✓ 已更換，點擊再換';
        zone.style.pointerEvents = '';
      });

      urlInput.addEventListener('input', e => {
        if (coverImg) coverImg.style.backgroundImage = `url('${e.target.value}')`;
      });
    }

    /* Hide FAB */
    const fab = document.getElementById('inlineEditBtn');
    if (fab) fab.style.display = 'none';

    /* Inject save bar (includes category panel) */
    injectSaveBar();
  }

  /* ── Build category row HTML ── */
  function buildCatRowHTML() {
    const D = window.ISSHO_DATA;
    const navItems = (D && D.nav) || [];
    if (!navItems.length) return '';
    const curPrimary  = _article.category_key || '';
    const curKeys     = _article.category_keys || [];
    const opts = navItems.map(n =>
      `<option value="${n.key}" ${n.key === curPrimary ? 'selected' : ''}>${n.tc}／${n.en}</option>`
    ).join('');
    const checks = navItems.map(n => {
      const isPrimary = n.key === curPrimary;
      const checked   = isPrimary || curKeys.includes(n.key);
      return `<label class="inline-cat-check ${isPrimary ? 'primary' : ''}">
        <input type="checkbox" name="inlineExtraCat" value="${n.key}"
          ${checked ? 'checked' : ''} ${isPrimary ? 'disabled' : ''}>
        ${n.tc}
      </label>`;
    }).join('');
    return `<div class="inline-cat-row">
      <div class="inline-cat-field">
        <span class="inline-cat-label">主分類</span>
        <select id="inlinePrimaryCat" class="inline-cat-select">${opts}</select>
      </div>
      <div class="inline-cat-field">
        <span class="inline-cat-label">副分類</span>
        <select id="inlineSubCat" class="inline-cat-select"><option value="">載入中…</option></select>
      </div>
      <div class="inline-cat-field">
        <span class="inline-cat-label">同時收錄</span>
        <div class="inline-extra-cats" id="inlineExtraCats">${checks}</div>
      </div>
    </div>`;
  }

  /* ── Populate subcategory select from data.js nav ── */
  function loadInlineSubCategories(categoryKey, selectedKey) {
    const sel = document.getElementById('inlineSubCat');
    if (!sel) return;
    const D = window.ISSHO_DATA;
    const navItem = (D && D.nav || []).find(n => n.key === categoryKey);
    const subs = (navItem && navItem.sub) || [];
    if (!subs.length) {
      sel.innerHTML = '<option value="">（此分類無副分類）</option>';
      return;
    }
    sel.innerHTML = '<option value="">（選填）選擇副分類</option>'
      + subs.map(s => {
          const key = (s.url || '').split('#')[1] || '';
          return `<option value="${key}" ${key === selectedKey ? 'selected' : ''}>${s.tc} / ${s.en}</option>`;
        }).join('');
  }

  /* ── Save bar ── */
  function injectSaveBar() {
    if (document.getElementById('inlineSaveBar')) return;
    const bar = document.createElement('div');
    bar.id = 'inlineSaveBar';
    bar.className = 'inline-save-bar';
    bar.innerHTML = `
      ${buildCatRowHTML()}
      <div class="inline-meta-row">
        <div class="inline-cat-field">
          <span class="inline-cat-label">狀態</span>
          <select id="inlineStatus" class="inline-cat-select">
            <option value="published" ${(_article.status||'draft')==='published'?'selected':''}>● 已發佈</option>
            <option value="draft"     ${(_article.status||'draft')==='draft'    ?'selected':''}>◐ 草稿</option>
            <option value="archived"  ${(_article.status||'draft')==='archived' ?'selected':''}>○ 封存</option>
          </select>
        </div>
        <label class="inline-featured-toggle">
          <input type="checkbox" id="inlineFeatured" ${_article.featured ? 'checked' : ''}>
          <span>⭐ 設為精選</span>
        </label>
      </div>
      <div class="inline-save-bottom">
        <span class="inline-save-status" id="inlineSaveStatus"></span>
        <div class="inline-save-actions">
          <button class="editor-btn editor-btn-danger" id="inlineDeleteBtn">🗑 刪除</button>
          <button class="editor-btn" id="inlineCancelBtn">取消</button>
          <button class="editor-btn editor-btn-primary" id="inlineSaveBtn">儲存</button>
        </div>
      </div>`;
    document.body.appendChild(bar);

    /* Populate subcategories from data.js */
    loadInlineSubCategories(_article.category_key || '', _article.sub_category_key || '');

    /* Update checkboxes + subcategories when primary category changes */
    const primarySel = document.getElementById('inlinePrimaryCat');
    if (primarySel) {
      primarySel.addEventListener('change', function () {
        const newPrimary = this.value;
        bar.querySelectorAll('.inline-cat-check').forEach(label => {
          const cb = label.querySelector('input');
          const isP = cb.value === newPrimary;
          label.classList.toggle('primary', isP);
          cb.disabled = isP;
          if (isP) cb.checked = true;
        });
        loadInlineSubCategories(newPrimary, '');
      });
    }
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
    const titleEl    = document.querySelector('.article-hero-title');
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

    /* Category */
    const primaryCatEl = document.getElementById('inlinePrimaryCat');
    if (primaryCatEl) {
      updates.category_key  = primaryCatEl.value;
      const extra = Array.from(
        document.querySelectorAll('input[name="inlineExtraCat"]:checked:not(:disabled)')
      ).map(el => el.value);
      updates.category_keys = [...new Set([primaryCatEl.value, ...extra])];
    }
    const subCatEl = document.getElementById('inlineSubCat');
    if (subCatEl) updates.sub_category_key = subCatEl.value || null;

    const statusEl2 = document.getElementById('inlineStatus');
    if (statusEl2) updates.status = statusEl2.value;
    const featuredEl = document.getElementById('inlineFeatured');
    if (featuredEl) updates.featured = featuredEl.checked;

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
