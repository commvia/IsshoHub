/* IsshoHub — Article Editor */
(function (global) {
  'use strict';

  let currentArticleId = null;
  let categoriesCache = [];

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
                <textarea id="bodyTc" rows="16" placeholder="文章內文（支援 Markdown 格式）"></textarea>
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
                <textarea id="bodyEn" rows="16" placeholder="Article body (Markdown supported)"></textarea>
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
              <input type="text" id="editorSubCategory" placeholder="例：在留資格、稅務申報" />
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

    // Load categories
    loadCategories(document.getElementById('editorCategory'));

    // Save draft
    document.getElementById('editorSaveDraft').addEventListener('click', () => saveArticle('draft'));

    // Publish
    document.getElementById('editorPublish').addEventListener('click', () => saveArticle('published'));
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
      document.getElementById('editorSubCategory').value = articleData.sub_category_key || '';
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
