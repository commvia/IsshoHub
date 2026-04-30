/* IsshoHub — Article Editor */
(function (global) {
  'use strict';

  let currentArticleId = null;
  let categoriesCache = [];
  let subCategoriesCache = {};

  /* ── Load sub-categories into select ── */
  async function loadSubCategories(categoryKey, selectedKey) {
    const selectEl = document.getElementById('editorSubCategory');
    if (!selectEl) return;
    if (!categoryKey) {
      selectEl.innerHTML = '<option value="">請先選擇分類</option>';
      return;
    }
    if (!subCategoriesCache[categoryKey]) {
      const client = window.IsshoAuth.getClient();
      const { data } = await client.from('sub_categories')
        .select('*').eq('category_key', categoryKey).order('sort_order');
      subCategoriesCache[categoryKey] = data || [];
    }
    const subs = subCategoriesCache[categoryKey];
    selectEl.innerHTML = '<option value="">（選填）選擇子分類</option>' +
      subs.map(s =>
        `<option value="${s.key}" ${s.key === selectedKey ? 'selected' : ''}>${s.name_tc} / ${s.name_en}</option>`
      ).join('');
  }

  /* ── Markdown toolbar HTML ── */
  function mdToolbarHTML(taId) {
    return `
      <div class="md-toolbar" data-for="${taId}">
        <button type="button" class="md-toolbar-btn" data-md="bold" title="粗體 Ctrl+B"><b>B</b></button>
        <button type="button" class="md-toolbar-btn" data-md="italic" title="斜體 Ctrl+I"><i>I</i></button>
        <div class="md-toolbar-sep"></div>
        <button type="button" class="md-toolbar-btn" data-md="h2" title="大標題">H2</button>
        <button type="button" class="md-toolbar-btn" data-md="h3" title="小標題">H3</button>
        <div class="md-toolbar-sep"></div>
        <button type="button" class="md-toolbar-btn" data-md="ul" title="項目清單">• 清單</button>
        <button type="button" class="md-toolbar-btn" data-md="blockquote" title="引言">" 引言</button>
        <button type="button" class="md-toolbar-btn" data-md="hr" title="分隔線">— —</button>
        <div class="md-toolbar-hint">📋 貼上 Word 內容可自動轉換格式</div>
      </div>`;
  }

  /* ── Apply Markdown format to textarea ── */
  function applyMdFormat(ta, format) {
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = ta.value.substring(start, end);
    const before = ta.value.substring(0, start);
    const after  = ta.value.substring(end);

    let replacement = sel;
    let cursorOffset = 0;

    if (format === 'bold') {
      if (sel) {
        replacement = `**${sel}**`;
        cursorOffset = 2;
      } else {
        replacement = '**粗體文字**';
        cursorOffset = 2;
      }
    } else if (format === 'italic') {
      if (sel) {
        replacement = `*${sel}*`;
        cursorOffset = 1;
      } else {
        replacement = '*斜體文字*';
        cursorOffset = 1;
      }
    } else if (format === 'h2') {
      const lineStart = before.lastIndexOf('\n') + 1;
      const lineContent = ta.value.substring(lineStart, end || ta.value.length);
      const clean = lineContent.replace(/^#{1,6}\s*/, '');
      ta.value = ta.value.substring(0, lineStart) + '## ' + clean;
      ta.selectionStart = ta.selectionEnd = lineStart + 3 + clean.length;
      ta.focus(); return;
    } else if (format === 'h3') {
      const lineStart = before.lastIndexOf('\n') + 1;
      const lineContent = ta.value.substring(lineStart, end || ta.value.length);
      const clean = lineContent.replace(/^#{1,6}\s*/, '');
      ta.value = ta.value.substring(0, lineStart) + '### ' + clean;
      ta.selectionStart = ta.selectionEnd = lineStart + 4 + clean.length;
      ta.focus(); return;
    } else if (format === 'ul') {
      if (sel) {
        replacement = sel.split('\n').map(l => l.trim() ? '- ' + l : l).join('\n');
      } else {
        replacement = '- 清單項目';
        cursorOffset = 2;
      }
    } else if (format === 'blockquote') {
      if (sel) {
        replacement = sel.split('\n').map(l => '> ' + l).join('\n');
      } else {
        replacement = '> 引言文字';
        cursorOffset = 2;
      }
    } else if (format === 'hr') {
      replacement = '\n\n---\n\n';
    }

    ta.value = before + replacement + after;
    ta.selectionStart = start + cursorOffset;
    ta.selectionEnd   = start + replacement.length - cursorOffset;
    ta.focus();
    autoResizeTA(ta);
  }

  /* ── HTML → Markdown (for paste-from-Word) ── */
  function htmlToMarkdown(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    // Remove non-content elements
    div.querySelectorAll('style,script,meta,link,o\\:p').forEach(el => el.remove());
    const md = walkNode(div);
    return md.replace(/\n{3,}/g, '\n\n').trim();
  }

  function walkNode(node) {
    if (node.nodeType === 3) { /* TEXT_NODE */
      return node.textContent;
    }
    if (node.nodeType !== 1) return ''; /* not ELEMENT_NODE */

    const tag  = node.tagName.toLowerCase();
    if (['style','script','head'].includes(tag)) return '';

    const styleAttr = node.getAttribute('style') || '';
    const isBoldEl  = /font-weight\s*:\s*(bold|[6-9]\d\d)/i.test(styleAttr);
    const isItalEl  = /font-style\s*:\s*italic/i.test(styleAttr);

    const innerFn = () => Array.from(node.childNodes).map(walkNode).join('');

    switch (tag) {
      case 'h1': return `\n\n# ${innerFn().trim()}\n\n`;
      case 'h2': return `\n\n## ${innerFn().trim()}\n\n`;
      case 'h3': return `\n\n### ${innerFn().trim()}\n\n`;
      case 'h4': return `\n\n#### ${innerFn().trim()}\n\n`;
      case 'p': {
        const t = innerFn().trim();
        return t ? `\n\n${t}\n\n` : '';
      }
      case 'br': return '\n';
      case 'hr': return '\n\n---\n\n';
      case 'b': case 'strong': {
        const t = innerFn().trim();
        return t ? `**${t}**` : '';
      }
      case 'i': case 'em': {
        const t = innerFn().trim();
        return t ? `*${t}*` : '';
      }
      case 'u': return innerFn(); /* ignore underline */
      case 'li': return `\n- ${innerFn().trim()}`;
      case 'ul': case 'ol': return `\n${innerFn()}\n`;
      case 'blockquote': return `\n\n> ${innerFn().trim()}\n\n`;
      case 'a': {
        const href = node.getAttribute('href') || '';
        const t    = innerFn().trim();
        if (!href || href.startsWith('mso-') || href === t) return t;
        return `[${t}](${href})`;
      }
      case 'code': return `\`${innerFn()}\``;
      case 'pre':  return `\n\`\`\`\n${innerFn()}\n\`\`\`\n`;
      case 'table': return innerFn(); /* keep text content of tables */
      case 'tr': return innerFn() + '\n';
      case 'td': case 'th': return innerFn() + '\t';
      case 'span': case 'div': {
        let t = innerFn();
        if (isBoldEl && t.trim()) t = `**${t.trim()}**`;
        if (isItalEl && t.trim()) t = `*${t.trim()}*`;
        if (tag === 'div') t = `\n\n${t.trim()}\n\n`;
        return t;
      }
      default: return innerFn();
    }
  }

  function autoResizeTA(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }

  /* ── Wire Markdown toolbar & paste for a textarea ── */
  function wireMdToolbar(toolbarEl, ta) {
    /* Toolbar buttons */
    toolbarEl.querySelectorAll('[data-md]').forEach(btn => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault(); /* don't lose textarea focus */
        applyMdFormat(ta, btn.getAttribute('data-md'));
      });
    });

    /* Keyboard shortcuts */
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); applyMdFormat(ta, 'bold'); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); applyMdFormat(ta, 'italic'); }
    });

    /* Smart paste: convert Word/HTML clipboard to Markdown */
    ta.addEventListener('paste', e => {
      const html = e.clipboardData && e.clipboardData.getData('text/html');
      if (!html || !html.trim()) return; /* no HTML → let browser paste plain text */
      /* Only convert if it looks like rich text (has tags beyond basic spans) */
      if (!/<(h[1-6]|b|strong|ul|ol|li|blockquote|table)/i.test(html)) return;
      e.preventDefault();
      const md = htmlToMarkdown(html);
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      ta.value = ta.value.substring(0, start) + md + ta.value.substring(end);
      ta.selectionStart = ta.selectionEnd = start + md.length;
      autoResizeTA(ta);
      /* Brief visual confirmation */
      const hint = toolbarEl.querySelector('.md-toolbar-hint');
      if (hint) {
        const orig = hint.textContent;
        hint.textContent = '✓ 已自動轉換 Word 格式為 Markdown';
        hint.style.color = '#38a169';
        setTimeout(() => { hint.textContent = orig; hint.style.color = ''; }, 2500);
      }
    });
  }

  /* ── Slugify ── */
  function slugify(text) {
    return text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /* ── Load categories into select ── */
  async function loadCategories(selectEl, selectedKey) {
    if (!categoriesCache.length) {
      const { data, error } = await window.IsshoAPI.fetchCategories();
      console.log('[Editor] fetchCategories result:', data, error);
      if (error) console.error('fetchCategories error:', error);
      categoriesCache = data || [];
    }
    selectEl.innerHTML = '<option value="">選擇分類 / Select category</option>' +
      categoriesCache.map(c =>
        `<option value="${c.key}" ${c.key === selectedKey ? 'selected' : ''}>${c.name_tc} / ${c.name_en}</option>`
      ).join('');
  }

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

  /* ── Build editor HTML ── */
  function buildEditorHTML() {
    return `
    <div class="editor-overlay" id="articleEditor">
      <div class="editor-panel">
        <div class="editor-header">
          <div class="editor-header-left">
            <h2 class="editor-title" id="editorTitle">新增文章</h2>
            <span class="editor-status" id="editorStatus"></span>
          </div>
          <div class="editor-header-actions">
            <button class="editor-btn editor-btn-danger" id="editorDelete" style="display:none">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
              刪除文章
            </button>
            <button class="editor-btn editor-btn-secondary" id="editorSaveDraft">儲存草稿</button>
            <button class="editor-btn editor-btn-primary" id="editorPublish">發佈文章</button>
            <button class="editor-close" id="editorClose">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
        </div>

        <div class="editor-body">
          <!-- Left: Main content -->
          <div class="editor-main">
            <div class="editor-tabs">
              <button class="editor-tab active" data-editor-tab="tc">繁體中文</button>
              <button class="editor-tab" data-editor-tab="en">English</button>
            </div>

            <!-- TC Content -->
            <div class="editor-tab-panel" id="editorPanelTc">
              <div class="editor-field">
                <label>標題（繁中）*</label>
                <input type="text" id="titleTc" placeholder="文章標題" />
              </div>
              <div class="editor-field">
                <label>摘要（繁中）</label>
                <textarea id="excerptTc" rows="3" placeholder="文章摘要，約 80-120 字"></textarea>
              </div>
              <div class="editor-field">
                <label>內文（繁中）</label>
                ${mdToolbarHTML('bodyTc')}
                <textarea id="bodyTc" rows="16" placeholder="文章內文（支援 Markdown 格式）\n\n## 大標題\n**粗體** 一般文字\n- 清單項目\n\n可直接從 Word 貼上，格式會自動轉換。"></textarea>
              </div>
            </div>

            <!-- EN Content -->
            <div class="editor-tab-panel" id="editorPanelEn" style="display:none">
              <div class="editor-field">
                <label>Title (English) *</label>
                <input type="text" id="titleEn" placeholder="Article title" />
              </div>
              <div class="editor-field">
                <label>Excerpt (English)</label>
                <textarea id="excerptEn" rows="3" placeholder="Article excerpt, ~80-120 words"></textarea>
              </div>
              <div class="editor-field">
                <label>Body (English)</label>
                ${mdToolbarHTML('bodyEn')}
                <textarea id="bodyEn" rows="16" placeholder="Article body (Markdown supported)&#10;&#10;## Heading&#10;**Bold** normal text&#10;- List item&#10;&#10;Paste from Word — formatting auto-converts."></textarea>
              </div>
            </div>
          </div>

          <!-- Right: Metadata -->
          <div class="editor-sidebar">
            <!-- Cover image -->
            <div class="editor-field">
              <label>封面圖片 Cover Image</label>
              <div class="editor-image-upload" id="coverImageArea">
                <div class="editor-image-placeholder" id="coverImagePlaceholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <span>點擊上傳圖片</span>
                  <span style="font-size:11px;color:#aaa">JPG, PNG, WebP · 最大 5MB</span>
                </div>
                <img id="coverImagePreview" style="display:none;width:100%;border-radius:8px;object-fit:cover;max-height:180px;" />
                <input type="file" id="coverImageInput" accept="image/*" style="display:none" />
              </div>
              <input type="text" id="coverImageUrl" placeholder="或貼上圖片網址" style="margin-top:8px" />
            </div>

            <!-- Category -->
            <div class="editor-field">
              <label>分類 Category *</label>
              <select id="editorCategory"></select>
            </div>

            <!-- Sub-category -->
            <div class="editor-field">
              <label>子分類 Sub-category</label>
              <select id="editorSubCategory">
                <option value="">請先選擇分類</option>
              </select>
            </div>

            <!-- Slug -->
            <div class="editor-field">
              <label>網址 Slug *</label>
              <input type="text" id="editorSlug" placeholder="article-url-slug" />
            </div>

            <!-- Author -->
            <div class="editor-field">
              <label>作者 Author</label>
              <input type="text" id="editorAuthor" placeholder="作者姓名" />
            </div>

            <!-- Read time -->
            <div class="editor-field">
              <label>閱讀時間（分鐘）</label>
              <input type="number" id="editorReadTime" value="5" min="1" max="60" />
            </div>

            <!-- Tags -->
            <div class="editor-field">
              <label>標籤 Tags</label>
              <input type="text" id="editorTags" placeholder="用逗號分隔，例：簽證,在留資格" />
            </div>

            <!-- Featured -->
            <div class="editor-field editor-field-toggle">
              <label>精選文章 Featured</label>
              <label class="toggle-switch">
                <input type="checkbox" id="editorFeatured" />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <!-- Error -->
            <div id="editorError" class="editor-error" style="display:none"></div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ── Inject editor into page ── */
  function injectEditor() {
    if (document.getElementById('articleEditor')) return;
    document.body.insertAdjacentHTML('beforeend', buildEditorHTML());
    wireEditor();
  }

  /* ── Wire editor events ── */
  function wireEditor() {
    const editor = document.getElementById('articleEditor');
    if (!editor) return;

    // Close
    document.getElementById('editorClose').addEventListener('click', closeEditor);
    editor.addEventListener('click', e => { if (e.target === editor) closeEditor(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && editor.classList.contains('open')) closeEditor();
    });

    // Tabs
    editor.querySelectorAll('[data-editor-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-editor-tab');
        editor.querySelectorAll('[data-editor-tab]').forEach(b => b.classList.toggle('active', b.getAttribute('data-editor-tab') === tab));
        document.getElementById('editorPanelTc').style.display = tab === 'tc' ? '' : 'none';
        document.getElementById('editorPanelEn').style.display = tab === 'en' ? '' : 'none';
      });
    });

    // Auto-slug from EN title
    document.getElementById('titleEn').addEventListener('input', e => {
      const slugEl = document.getElementById('editorSlug');
      if (!slugEl.dataset.manual) slugEl.value = slugify(e.target.value);
    });
    document.getElementById('editorSlug').addEventListener('input', e => {
      e.target.dataset.manual = e.target.value ? 'true' : '';
    });

    // Cover image upload
    const imageArea = document.getElementById('coverImageArea');
    const imageInput = document.getElementById('coverImageInput');
    const imagePreview = document.getElementById('coverImagePreview');
    const imagePlaceholder = document.getElementById('coverImagePlaceholder');
    const imageUrlInput = document.getElementById('coverImageUrl');

    imageArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      imagePlaceholder.innerHTML = '<span>上傳中…</span>';
      const { url, error } = await uploadImage(file);
      if (error) {
        imagePlaceholder.innerHTML = '<span style="color:red">上傳失敗，請使用網址</span>';
      } else {
        imageUrlInput.value = url;
        imagePreview.src = url;
        imagePreview.style.display = 'block';
        imagePlaceholder.style.display = 'none';
      }
    });

    imageUrlInput.addEventListener('input', e => {
      if (e.target.value) {
        imagePreview.src = e.target.value;
        imagePreview.style.display = 'block';
        imagePlaceholder.style.display = 'none';
      }
    });

    // Wire Markdown toolbars
    ['bodyTc', 'bodyEn'].forEach(id => {
      const ta      = document.getElementById(id);
      const toolbar = document.querySelector(`.md-toolbar[data-for="${id}"]`);
      if (ta && toolbar) wireMdToolbar(toolbar, ta);
    });

    // Load categories
    loadCategories(document.getElementById('editorCategory'));

    // When category changes, load sub-categories
    document.getElementById('editorCategory').addEventListener('change', e => {
      loadSubCategories(e.target.value);
    });

    // Save draft
    document.getElementById('editorSaveDraft').addEventListener('click', () => saveArticle('draft'));

    // Publish
    document.getElementById('editorPublish').addEventListener('click', () => saveArticle('published'));

    // Delete
    document.getElementById('editorDelete').addEventListener('click', async () => {
      if (!currentArticleId) return;
      const confirmed = window.confirm('確定要刪除這篇文章嗎？此操作無法還原。\n\nAre you sure you want to delete this article? This cannot be undone.');
      if (!confirmed) return;
      const btn = document.getElementById('editorDelete');
      btn.disabled = true;
      btn.textContent = '刪除中…';
      const { error } = await window.IsshoAPI.deleteArticle(currentArticleId);
      if (error) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg> 刪除文章';
        showEditorError('刪除失敗：' + error.message);
      } else {
        closeEditor();
        window.location.reload();
      }
    });
  }

  /* ── Save article ── */
  async function saveArticle(status) {
    const titleTc = document.getElementById('titleTc').value.trim();
    const titleEn = document.getElementById('titleEn').value.trim();
    const slug = document.getElementById('editorSlug').value.trim();
    const category = document.getElementById('editorCategory').value;
    const errorEl = document.getElementById('editorError');

    // Validate
    if (!titleTc || !titleEn) {
      showEditorError('請填寫繁中和英文標題 / Please fill in both titles');
      return;
    }
    if (!slug) {
      showEditorError('請填寫網址 Slug');
      return;
    }
    if (!category) {
      showEditorError('請選擇分類 / Please select a category');
      return;
    }

    const tagsRaw = document.getElementById('editorTags').value;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const article = {
      title_tc: titleTc,
      title_en: titleEn,
      slug,
      category_key: category,
      sub_category_key: document.getElementById('editorSubCategory').value.trim() || null,
      cover_image_url: document.getElementById('coverImageUrl').value.trim() || null,
      excerpt_tc: document.getElementById('excerptTc').value.trim() || null,
      excerpt_en: document.getElementById('excerptEn').value.trim() || null,
      body_tc: document.getElementById('bodyTc').value.trim() || null,
      body_en: document.getElementById('bodyEn').value.trim() || null,
      author: document.getElementById('editorAuthor').value.trim() || null,
      read_time: parseInt(document.getElementById('editorReadTime').value) || 5,
      tags,
      featured: document.getElementById('editorFeatured').checked,
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    };

    if (currentArticleId) article.id = currentArticleId;

    const saveDraftBtn = document.getElementById('editorSaveDraft');
    const publishBtn = document.getElementById('editorPublish');
    saveDraftBtn.disabled = true;
    publishBtn.disabled = true;
    publishBtn.textContent = '儲存中…';

    const { data, error } = await window.IsshoAPI.upsertArticle(article);

    if (error) {
      showEditorError(error.message);
      saveDraftBtn.disabled = false;
      publishBtn.disabled = false;
      publishBtn.textContent = '發佈文章';
      return;
    }

    currentArticleId = data.id;
    document.getElementById('editorStatus').textContent = status === 'published' ? '✓ 已發佈' : '✓ 已儲存草稿';
    saveDraftBtn.disabled = false;
    publishBtn.disabled = false;
    publishBtn.textContent = '發佈文章';
    clearEditorError();

    if (status === 'published') {
      setTimeout(closeEditor, 1200);
    }
  }

  function showEditorError(msg) {
    const el = document.getElementById('editorError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function clearEditorError() {
    const el = document.getElementById('editorError');
    if (el) { el.style.display = 'none'; }
  }

  /* ── Open / Close ── */
  function openEditor(articleData) {
    injectEditor();
    currentArticleId = articleData?.id || null;

    /* Show delete button only when editing existing article */
    const deleteBtn = document.getElementById('editorDelete');
    if (deleteBtn) deleteBtn.style.display = articleData ? '' : 'none';

    if (articleData) {
      document.getElementById('editorTitle').textContent = '編輯文章';
      document.getElementById('titleTc').value = articleData.title_tc || '';
      document.getElementById('titleEn').value = articleData.title_en || '';
      document.getElementById('editorSlug').value = articleData.slug || '';
      document.getElementById('editorSlug').dataset.manual = 'true';
      document.getElementById('excerptTc').value = articleData.excerpt_tc || '';
      document.getElementById('excerptEn').value = articleData.excerpt_en || '';
      document.getElementById('bodyTc').value = articleData.body_tc || '';
      document.getElementById('bodyEn').value = articleData.body_en || '';
      document.getElementById('coverImageUrl').value = articleData.cover_image_url || '';
      loadSubCategories(articleData.category_key, articleData.sub_category_key);
      document.getElementById('editorAuthor').value = articleData.author || '';
      document.getElementById('editorReadTime').value = articleData.read_time || 5;
      document.getElementById('editorTags').value = (articleData.tags || []).join(', ');
      document.getElementById('editorFeatured').checked = articleData.featured || false;
      loadCategories(document.getElementById('editorCategory'), articleData.category_key);
      if (articleData.cover_image_url) {
        document.getElementById('coverImagePreview').src = articleData.cover_image_url;
        document.getElementById('coverImagePreview').style.display = 'block';
        document.getElementById('coverImagePlaceholder').style.display = 'none';
      }
    } else {
      document.getElementById('editorTitle').textContent = '新增文章';
      loadCategories(document.getElementById('editorCategory'));
    }

    document.getElementById('editorStatus').textContent = '';
    clearEditorError();
    document.getElementById('articleEditor').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeEditor() {
    const editor = document.getElementById('articleEditor');
    if (editor) editor.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── Wire admin bar buttons ── */
  function wireAdminButtons() {
    const newBtn = document.getElementById('adminNewArticle');
    if (newBtn) newBtn.addEventListener('click', () => openEditor(null));
  }

  /* ── Init ── */
  function init() {
    wireAdminButtons();
  }

  global.IsshoEditor = { init, openEditor, closeEditor };

})(window);
