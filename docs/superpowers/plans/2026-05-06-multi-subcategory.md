# 多副分類收錄功能 實作計劃

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推薦）或 superpowers:executing-plans 逐任務實作此計劃。步驟使用復選框（`- [ ]`）語法來追蹤進度。

**目標：** 讓每篇文章可同時收錄到多個副分類（同一或跨主分類），Admin 編輯器 UI 改成多選 checkbox，分類頁篩選邏輯支援新欄位。

**架構：** Supabase 已新增 `sub_category_keys text[]` 欄位（已執行 ALTER TABLE）。Admin 編輯器將副分類 dropdown 改為 checkbox 群組，按主分類分組顯示。分類頁的 `filterArticles()` 和 `renderSubcatNav()` 同時檢查舊欄位（backward compatible）。

**技術棧：** 純 JavaScript（無框架）、Supabase JS v2、`data.js` ISSHO_DATA.nav 作副分類資料來源

---

## 現有程式碼關鍵位置

- `assets/js/article-editor.js`
  - `loadSubCategories(categoryKey, selectedKey)` — 現有單選 dropdown，第 10-28 行
  - `renderExtraCatCheckboxes(primaryKey, checkedKeys)` — 跨主分類 checkbox，第 237-255 行
  - `buildEditorHTML()` — 副分類欄位 HTML，第 376-382 行（`editorSubCategory` select）
  - `saveArticle(status)` — 第 573 行讀 `editorSubCategory` 值存入 `sub_category_key`
  - `openEditor(articleData)` — 第 647 行呼叫 `loadSubCategories` 帶舊資料
  - `wireEditor()` — 第 505-507 行 category change 事件

- `assets/js/category-page.js`
  - `renderSubcatNav(articles)` — 第 126 行計算副分類 tab 數量
  - `filterArticles(articles)` — 第 184 行篩選文章

---

## 任務 1：article-editor.js — 新副分類多選 UI

**文件：**
- 修改：`assets/js/article-editor.js`

### 背景

現有 `loadSubCategories()` 渲染一個 `<select id="editorSubCategory">`，只能選一個副分類。要改成 checkbox 群組，支援多選，並在主分類或跨收錄主分類改變時動態更新。

新函式 `renderSubCatCheckboxes(selectedKeys)` 取代 `loadSubCategories()`：
- 讀取目前已選的所有主分類（primary + 跨收錄）
- 對每個有 `sub` 的主分類，顯示一組 checkbox
- 勾選狀態由 `selectedKeys`（string[]）決定

### 步驟

- [ ] **步驟 1：新增 `renderSubCatCheckboxes` 函式**

在 `loadSubCategories` 函式（第 10 行）之後，插入以下函式：

```javascript
/* ── Render multi-select sub-category checkboxes ── */
function renderSubCatCheckboxes(selectedKeys) {
  const container = document.getElementById('editorSubCatChecks');
  const field = document.getElementById('editorSubCatField');
  if (!container) return;

  selectedKeys = selectedKeys || [];

  /* Collect all selected main category keys */
  const primaryKey = (document.getElementById('editorCategory') || {}).value || '';
  const extraChecked = Array.from(
    document.querySelectorAll('#editorExtraCats input[name="extraCat"]:checked:not(:disabled)')
  ).map(el => el.value);
  const allCatKeys = [...new Set([primaryKey, ...extraChecked].filter(Boolean))];

  /* Build groups: only categories that have sub entries */
  const nav = (window.ISSHO_DATA && window.ISSHO_DATA.nav) || [];
  const groups = allCatKeys.map(catKey => {
    const navEntry = nav.find(n => n.key === catKey);
    if (!navEntry || !navEntry.sub || !navEntry.sub.length) return null;
    const subs = navEntry.sub.map(s => ({
      key: (s.url || '').split('#')[1] || '',
      name_tc: s.tc,
      name_en: s.en,
    })).filter(s => s.key);
    return { catKey, catName: navEntry.tc, subs };
  }).filter(Boolean);

  if (!groups.length) {
    if (field) field.style.display = 'none';
    return;
  }

  container.innerHTML = groups.map(g => `
    <div class="editor-subcat-group">
      <div class="editor-subcat-group-label">${g.catName}</div>
      ${g.subs.map(s => `
        <label class="editor-cat-check">
          <input type="checkbox" name="subCatKey" value="${s.key}"
            ${selectedKeys.includes(s.key) ? 'checked' : ''}>
          ${s.name_tc} / ${s.name_en}
        </label>
      `).join('')}
    </div>
  `).join('');

  if (field) field.style.display = '';
}
```

- [ ] **步驟 2：修改 `buildEditorHTML()` 中的副分類欄位**

找到第 376-382 行（Sub-category 區塊）：
```html
            <!-- Sub-category -->
            <div class="editor-field">
              <label>子分類 Sub-category</label>
              <select id="editorSubCategory">
                <option value="">請先選擇分類</option>
              </select>
            </div>
```

替換成：
```html
            <!-- Sub-category (multi-select checkboxes) -->
            <div class="editor-field" id="editorSubCatField" style="display:none">
              <label>副分類 Sub-category（可多選）</label>
              <div class="editor-cat-checks" id="editorSubCatChecks"></div>
            </div>
```

- [ ] **步驟 3：更新 `wireEditor()` 的 category change 事件**

找到第 504-508 行：
```javascript
    // When category changes, load sub-categories and re-render checkboxes
    document.getElementById('editorCategory').addEventListener('change', e => {
      loadSubCategories(e.target.value);
      renderExtraCatCheckboxes(e.target.value);
    });
```

替換成：
```javascript
    // When category changes, re-render extra cat checkboxes and sub-cat checkboxes
    document.getElementById('editorCategory').addEventListener('change', e => {
      renderExtraCatCheckboxes(e.target.value);
      renderSubCatCheckboxes();
    });
```

- [ ] **步驟 4：更新 `renderExtraCatCheckboxes()` 末尾，加入副分類重新渲染**

找到第 253-255 行：
```javascript
    if (field) field.style.display = '';
  }
```

替換成：
```javascript
    if (field) field.style.display = '';
    /* Re-render sub-cat checkboxes whenever extra cats change */
    container.querySelectorAll('input[name="extraCat"]').forEach(function(cb) {
      cb.addEventListener('change', function() { renderSubCatCheckboxes(); });
    });
    renderSubCatCheckboxes();
  }
```

- [ ] **步驟 5：更新 `saveArticle()` 收集 sub_category_keys**

找到第 573 行：
```javascript
      sub_category_key: document.getElementById('editorSubCategory').value.trim() || null,
```

替換成：
```javascript
      sub_category_key: (function() {
        const checked = Array.from(document.querySelectorAll('#editorSubCatChecks input[name="subCatKey"]:checked'));
        return checked.length ? checked[0].value : null;
      })(),
      sub_category_keys: (function() {
        const checked = Array.from(document.querySelectorAll('#editorSubCatChecks input[name="subCatKey"]:checked')).map(el => el.value);
        return checked.length ? checked : null;
      })(),
```

- [ ] **步驟 6：更新 `openEditor()` 帶入已存副分類**

找到第 647 行：
```javascript
      loadSubCategories(articleData.category_key, articleData.sub_category_key);
```

替換成：
```javascript
      /* Populate sub-cat checkboxes after categories are loaded */
      const existingSubKeys = articleData.sub_category_keys ||
        (articleData.sub_category_key ? [articleData.sub_category_key] : []);
      /* Delay to ensure category + extra cats are rendered first */
      setTimeout(() => renderSubCatCheckboxes(existingSubKeys), 50);
```

- [ ] **步驟 7：commit**

```bash
git add assets/js/article-editor.js
git commit -m "feat: 副分類改為多選 checkbox，儲存至 sub_category_keys"
git push
```

---

## 任務 2：category-page.js — 篩選邏輯支援 sub_category_keys

**文件：**
- 修改：`assets/js/category-page.js`

### 背景

目前 `renderSubcatNav()` 計算 tab 數量時只看 `a.sub_category_key`（第 126 行），`filterArticles()` 篩選時也只看 `a.sub_category_key`（第 184 行）。需要同時檢查 `sub_category_keys` 陣列（新欄位）。

向下相容規則：`sub_category_keys` 有值用新欄位，否則 fallback 到 `sub_category_key`。

### 步驟

- [ ] **步驟 1：新增 helper 函式 `articleHasSub`**

在 `filterArticles` 函式（第 182 行）之前插入：

```javascript
      /* Helper: check if article belongs to a given sub-category key (backward compatible) */
      function articleHasSub(a, subKey) {
        if (a.sub_category_keys && a.sub_category_keys.length) {
          return a.sub_category_keys.includes(subKey);
        }
        return a.sub_category_key === subKey;
      }
```

- [ ] **步驟 2：更新 `renderSubcatNav()` 的 tab 計數**

找到第 126 行：
```javascript
          var count = articles ? articles.filter(function (a) { return a.sub_category_key === s.key; }).length : 0;
```

替換成：
```javascript
          var count = articles ? articles.filter(function (a) { return articleHasSub(a, s.key); }).length : 0;
```

- [ ] **步驟 3：更新 `filterArticles()` 的篩選邏輯**

找到第 184 行：
```javascript
        return articles.filter(function (a) { return a.sub_category_key === activeSub; });
```

替換成：
```javascript
        return articles.filter(function (a) { return articleHasSub(a, activeSub); });
```

- [ ] **步驟 4：commit**

```bash
git add assets/js/category-page.js
git commit -m "feat: 分類頁篩選支援 sub_category_keys 多副分類"
git push
```

---

## 任務 3：CSS — 副分類 checkbox 群組樣式

**文件：**
- 修改：`assets/css/styles.css`

### 背景

新增 `.editor-subcat-group` 和 `.editor-subcat-group-label` 的樣式，讓不同主分類的副分類視覺上有分組感。現有 `.editor-cat-check` 樣式繼續沿用。

### 步驟

- [ ] **步驟 1：找到現有 `.editor-cat-check` 樣式位置**

```bash
grep -n "editor-cat-check\|editor-cat-checks" assets/css/styles.css
```

- [ ] **步驟 2：在 `.editor-cat-check` 樣式之後加入群組樣式**

```css
.editor-subcat-group {
  margin-bottom: 12px;
}
.editor-subcat-group:last-child {
  margin-bottom: 0;
}
.editor-subcat-group-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: #aaa;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e8e4db;
}
```

- [ ] **步驟 3：commit**

```bash
git add assets/css/styles.css
git commit -m "style: 副分類多選群組樣式"
git push
```

---

## 自檢

**規格覆蓋度：**
- ✅ 多副分類選擇（任務 1）
- ✅ 同主分類多副分類（任務 1 — 顯示 primary category 的所有 subs）
- ✅ 跨主分類指定副分類（任務 1 — 顯示 extra categories 的 subs）
- ✅ 現有文章不動（任務 1 步驟 6 — fallback 邏輯；任務 2 步驟 1 — helper）
- ✅ 分類頁篩選更新（任務 2）
- ✅ Supabase 欄位（已手動執行 ALTER TABLE）

**占位符掃描：** 無。

**類型一致性：** `sub_category_keys` 為 `string[] | null`，三個任務一致。
