# IsshoHub — 多副分類收錄功能設計

**日期：** 2026-05-06  
**狀態：** 已批准，待實作

---

## 背景

現有系統每篇文章只能屬於一個副分類（`sub_category_key`，單一字串）。用戶需要同時將文章收錄到多個副分類，例如：

- 一篇簽證文章同時出現在「在留政策」和「經營管理簽證」
- 一篇文章跨主分類收錄，且指定收錄到目標主分類的某個副分類

---

## 目標

1. 文章可以同時屬於多個副分類（同一或不同主分類）
2. 現有文章資料完全不動（向下相容）
3. Admin 編輯器 UI 改成副分類多選
4. 分類頁面篩選邏輯更新，支援新欄位

---

## 資料結構

### 現有欄位（不動）
- `category_key`: string — 主分類（如 `"visa"`）
- `sub_category_key`: string | null — 副分類（如 `"business-manager"`）
- `category_keys`: string[] — 所有主分類（含跨收錄）

### 新增欄位
- `sub_category_keys`: text[] | null — 所有副分類 key 的陣列（如 `["policy", "business-manager"]`）

副分類 key 來自 `data.js` nav 的 `url` hash（例如 `/visa/#business-manager` → key 為 `business-manager`）。

### 向下相容邏輯
- `sub_category_keys` 有值 → 使用 `sub_category_keys`
- `sub_category_keys` 為 null → fallback 到 `sub_category_key`（舊文章）

---

## Admin 編輯器 UI 改動

### 現有
```
子分類: [經營管理簽證 ▼]  （單選 dropdown）
```

### 改後
```
副分類（可多選）:
  ── 簽證・在留資格 ──
  ☑ 在留政策
  ☑ 經營・管理簽證
  ☐ 技術・人文知識・國際業務
  ☐ 高度專門職
  ...
  ── 商業（跨收錄時才顯示）──
  ☐ （商業的副分類，但商業目前無 sub）
```

**規則：**
- 只顯示已選主分類（primary + 跨收錄）底下有 `sub` 的副分類
- 沒有副分類的主分類（如 `biz`、`tax`）不顯示副分類區塊
- 至少選一個副分類時才儲存到 `sub_category_keys`；否則為 null

---

## 分類頁篩選邏輯（category-page.js）

### 副分類 tab 計數（現有）
```js
articles.filter(a => a.sub_category_key === s.key).length
```

### 改後
```js
articles.filter(a =>
  a.sub_category_key === s.key ||
  (a.sub_category_keys && a.sub_category_keys.includes(s.key))
).length
```

### 文章篩選（現有）
```js
articles.filter(a => a.sub_category_key === activeSub)
```

### 改後
```js
articles.filter(a =>
  a.sub_category_key === activeSub ||
  (a.sub_category_keys && a.sub_category_keys.includes(activeSub))
)
```

---

## Supabase 資料庫改動

在 `articles` 表新增欄位：
```sql
ALTER TABLE articles ADD COLUMN sub_category_keys text[] DEFAULT NULL;
```

---

## 不改動範圍

- 現有文章資料
- `sub_category_key` 欄位
- `category_keys` 邏輯
- Build script（靜態頁不依賴副分類）
- 主頁、書籤頁

---

## 實作範圍

| 檔案 | 改動 |
|------|------|
| Supabase Dashboard | 新增 `sub_category_keys` 欄位 |
| `assets/js/article-editor.js` | 副分類改成 checkbox 多選，存入 `sub_category_keys` |
| `assets/js/category-page.js` | 篩選邏輯支援 `sub_category_keys` |
