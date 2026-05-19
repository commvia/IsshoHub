# 日本駕照天書 實現計劃（第一階段：純呈現）

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推薦）或 superpowers:executing-plans 逐任務實現此計劃。步驟使用複選框（`- [ ]`）語法來跟踪進度。

**目標：** 將 15 章外免天書 docx 轉換為 IsshoHub 網頁，路徑 `/life/driving-guide/`，含目錄頁 + 15 個章節頁，第1、2、15章免費，其餘章節預留付費鎖頭（第二階段實作）。

**架構：** 純靜態 HTML，沿用現有 nav/footer/styles.css 模式。Python 腳本批次提取圖片並輸出 HTML 片段，人工審閱後套入頁面模板。圖片存於 `/assets/img/driving-guide/`。

**技術棧：** Vanilla HTML/JS、python-docx、現有 styles.css、Cloudflare Pages

---

## 章節對照表

| 章節 | 標題 | 免費/付費 | 圖片數 |
|------|------|-----------|--------|
| 1 | 容易混淆的標識與標線 | 免費 | ~34 |
| 2 | 道路標識速查表 | 免費 | ~135 |
| 3 | 道路標線速查表 | 付費（鎖頭） | ~44 |
| 4 | 號誌、信號機與警察手勢 | 付費 | ~有圖 |
| 5 | 交差點通行與行人保護 | 付費 | 少 |
| 6 | 車種分類及載重規則 | 付費 | 少 |
| 7 | 駕照種類與可駕駛車輛 | 付費 | 少 |
| 8 | 速度限制 | 付費 | 0 |
| 9 | 方向燈、手勢、開燈規則 | 付費 | 少 |
| 10 | 讓路與超車規則 | 付費 | 少 |
| 11 | 駐車與停車規則 | 付費 | 少 |
| 12 | 高速公路特殊規則 | 付費 | 少 |
| 13 | 駕駛情境規則 | 付費 | 少 |
| 14 | 駕駛人責任與運転禁止 | 付費 | 少 |
| 15 | 免責聲明 | 公開 | 0 |

---

## 文件結構

**新增：**
- `scripts/docx-to-html.py` — 批次轉換工具（本機執行，不部署）
- `assets/img/driving-guide/ch01/` ~ `ch15/` — 提取的圖片
- `life/driving-guide/index.html` — 目錄頁
- `life/driving-guide/chapter-1/index.html` ~ `chapter-15/index.html` — 15 個章節頁

**修改：**
- `assets/css/styles.css` — 加入 `.guide-table`、`.guide-img`、`.guide-sidebar` 樣式
- `build.js` — sitemap 加入 driving-guide 所有頁面
- `assets/js/data.js` — life nav 子選單加入「駕照天書」連結

---

## 任務 1：Python 轉換腳本

**文件：**
- 創建：`scripts/docx-to-html.py`

- [ ] **步驟 1：建立腳本骨架**

```python
#!/usr/bin/env python3
"""
docx-to-html.py
用法: python3 scripts/docx-to-html.py
輸出: 每章 HTML 片段到 scripts/output/chapter-X.html
      圖片到 assets/img/driving-guide/chXX/
"""
import os, re
from docx import Document
from docx.oxml.ns import qn
from docx.enum.text import WD_ALIGN_PARAGRAPH

DOCX_DIR = os.path.expanduser('~/Downloads/外免天書_extracted')
OUT_DIR   = 'scripts/output'
IMG_BASE  = 'assets/img/driving-guide'

CHAPTERS = [
    (1,  '1_第一章_容易混淆的標識與標線.docx'),
    (2,  '2_第二章_道路標識速查表.docx'),
    (3,  '3_第三章_道路標線速查表.docx'),
    (4,  '4_第四章_號誌、信號機與警察手勢.docx'),
    (5,  '5_第五章_交差點通行與行人保護.docx'),
    (6,  '6_第六章_車種分類及載重規則.docx'),
    (7,  '7_第七章_駕照種類與可駕駛車輛.docx'),
    (8,  '8_第八章_速度限制.docx'),
    (9,  '9_第九章_方向燈、手勢、開燈規則.docx'),
    (10, '10_第十章_讓路與超車規則.docx'),
    (11, '11_第十一章_駐車與停車規則.docx'),
    (12, '12_第十二章_高速公路特殊規則.docx'),
    (13, '13_第十三章_駕駛情境規則.docx'),
    (14, '14_第十四章_駕駛人責任與運転禁止.docx'),
    (15, '15_免責聲明.docx'),
]

os.makedirs(OUT_DIR, exist_ok=True)
```

- [ ] **步驟 2：實作圖片提取函式**

```python
def extract_images(doc, ch_num):
    """提取 docx 所有圖片，存到 assets/img/driving-guide/chXX/，回傳 {rId: 路徑} mapping"""
    img_dir = f'{IMG_BASE}/ch{ch_num:02d}'
    os.makedirs(img_dir, exist_ok=True)
    mapping = {}
    for part in doc.part.package.iter_parts():
        if 'image' in part.content_type:
            rId = part.partname.split('/')[-1].split('.')[0]
            ext = part.content_type.split('/')[-1]
            if ext == 'jpeg': ext = 'jpg'
            idx = len(mapping) + 1
            fname = f'ch{ch_num:02d}_img{idx:03d}.{ext}'
            fpath = f'{img_dir}/{fname}'
            with open(fpath, 'wb') as f:
                f.write(part.blob)
            mapping[part.partname] = f'/{img_dir}/{fname}'
    return mapping
```

- [ ] **步驟 3：實作段落轉 HTML 函式**

```python
def para_to_html(para):
    """將 docx 段落轉成 HTML，處理粗體、斜體、換行"""
    style = para.style.name
    text = ''
    for run in para.runs:
        t = run.text.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
        if run.bold and run.italic:
            t = f'<strong><em>{t}</em></strong>'
        elif run.bold:
            t = f'<strong>{t}</strong>'
        elif run.italic:
            t = f'<em>{t}</em>'
        text += t

    if not text.strip():
        return ''

    tag_map = {
        'Heading 1': 'h1', 'Heading 2': 'h2', 'Heading 3': 'h3',
        'Heading 4': 'h4',
    }
    tag = tag_map.get(style, 'p')

    if style == 'List Bullet' or style == 'List Paragraph':
        return f'<li>{text}</li>'

    return f'<{tag}>{text}</{tag}>'
```

- [ ] **步驟 4：實作表格轉 HTML 函式**

```python
def table_to_html(table, img_mapping):
    """將 docx 表格轉成 HTML table，格子內圖片插入 <img>"""
    html = '<table class="guide-table">\n'
    for row in table.rows:
        html += '  <tr>\n'
        for cell in row.cells:
            # 找出格子內圖片
            blips = cell._element.findall('.//' + qn('a:blip'))
            cell_html = ''
            if blips:
                for blip in blips:
                    embed = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                    # 從 cell 的 part 找圖片路徑
                    try:
                        part = cell._element.getroottree().getroot()
                        img_src = ''
                        for partname, path in img_mapping.items():
                            if partname.endswith(embed + '.'):
                                img_src = path
                                break
                        if not img_src:
                            # fallback: match by order
                            for partname, path in img_mapping.items():
                                img_src = path
                                break
                        cell_html += f'<img src="{img_src}" class="guide-img" alt="">\n'
                    except Exception:
                        pass
            # 格子內文字
            for para in cell.paragraphs:
                t = para.text.strip()
                if t:
                    cell_html += f'<p>{t}</p>'
            html += f'    <td>{cell_html}</td>\n'
        html += '  </tr>\n'
    html += '</table>\n'
    return html
```

- [ ] **步驟 5：實作主轉換迴圈並輸出 HTML 片段**

```python
def convert_chapter(ch_num, fname):
    path = os.path.join(DOCX_DIR, fname)
    doc  = Document(path)
    img_mapping = extract_images(doc, ch_num)

    html_parts = []
    body = doc.element.body

    for child in body:
        tag = child.tag.split('}')[-1]
        if tag == 'p':
            # 找對應的 Paragraph 物件
            for para in doc.paragraphs:
                if para._element is child:
                    h = para_to_html(para)
                    if h:
                        html_parts.append(h)
                    break
        elif tag == 'tbl':
            for table in doc.tables:
                if table._element is child:
                    html_parts.append(table_to_html(table, img_mapping))
                    break

    out_path = f'{OUT_DIR}/chapter-{ch_num}.html'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(html_parts))
    print(f'✓ Chapter {ch_num}: {len(img_mapping)} images, {len(html_parts)} blocks → {out_path}')

for ch_num, fname in CHAPTERS:
    convert_chapter(ch_num, fname)

print('完成！請到 scripts/output/ 審閱各章節 HTML。')
```

- [ ] **步驟 6：執行腳本，確認輸出**

```bash
cd /Users/kit/Desktop/Isshohub
mkdir -p scripts/output
python3 scripts/docx-to-html.py
```

預期輸出：
```
✓ Chapter 1: 34 images → scripts/output/chapter-1.html
✓ Chapter 2: 135 images → scripts/output/chapter-2.html
...
完成！請到 scripts/output/ 審閱各章節 HTML。
```

人工審閱 `scripts/output/chapter-1.html` 和 `chapter-2.html`，確認圖片路徑正確、表格結構完整。

- [ ] **步驟 7：Commit 腳本與圖片**

```bash
git add scripts/docx-to-html.py assets/img/driving-guide/
git commit -m "feat: 加入天書 docx 轉換腳本及提取圖片"
```

---

## 任務 2：styles.css 加入天書樣式

**文件：**
- 修改：`assets/css/styles.css`

- [ ] **步驟 1：在 styles.css 末尾加入以下樣式**

```css
/* ===== Driving Guide ===== */
.guide-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 40px;
  align-items: start;
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 16px 60px;
}
@media (max-width: 768px) {
  .guide-layout { grid-template-columns: 1fr; }
}

.guide-sidebar {
  position: sticky;
  top: 80px;
  background: var(--cream, #f6f3ec);
  border-radius: 12px;
  padding: 20px 16px;
  font-size: 14px;
}
.guide-sidebar h3 {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--navy, #0d2444);
  margin: 0 0 12px;
}
.guide-sidebar ul { list-style: none; margin: 0; padding: 0; }
.guide-sidebar li { margin: 4px 0; }
.guide-sidebar a {
  display: flex; align-items: center; gap: 6px;
  color: var(--navy, #0d2444); text-decoration: none;
  padding: 5px 8px; border-radius: 6px; font-size: 13px;
}
.guide-sidebar a:hover { background: rgba(13,36,68,.08); }
.guide-sidebar a.active { background: var(--navy, #0d2444); color: #fff; }
.guide-sidebar .lock-icon { opacity: .4; font-size: 11px; }

.guide-content h1 { font-size: 1.7rem; margin-bottom: 8px; }
.guide-content h2 { font-size: 1.2rem; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e0ddd6; }
.guide-content h3 { font-size: 1rem; margin: 20px 0 8px; color: var(--navy, #0d2444); }
.guide-content p  { line-height: 1.75; margin: 8px 0; }
.guide-content li { line-height: 1.75; margin: 4px 0; }
.guide-content ul, .guide-content ol { padding-left: 20px; margin: 8px 0; }

.guide-table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 14px;
}
.guide-table td, .guide-table th {
  border: 1px solid #d0cdc6;
  padding: 10px 12px;
  vertical-align: top;
  text-align: left;
}
.guide-table td p { margin: 4px 0; }

.guide-img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 6px auto;
  border-radius: 4px;
}

.guide-nav-bar {
  display: flex;
  justify-content: space-between;
  padding: 24px 0 0;
  border-top: 1px solid #e0ddd6;
  margin-top: 40px;
}
.guide-nav-bar a {
  display: flex; align-items: center; gap: 6px;
  color: var(--navy, #0d2444); text-decoration: none; font-weight: 600;
}

.guide-lock-banner {
  background: var(--cream, #f6f3ec);
  border: 1.5px dashed #c8b98a;
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  margin-top: 32px;
}
.guide-lock-banner h3 { font-size: 1.1rem; margin: 0 0 8px; }
.guide-lock-banner p  { color: #666; font-size: 14px; margin: 0 0 16px; }

@media (max-width: 768px) {
  .guide-sidebar { position: static; margin-bottom: 20px; }
  .guide-mobile-select { display: block; width: 100%; padding: 10px; font-size: 15px;
    border: 1.5px solid #e0ddd6; border-radius: 8px; background: #fff; margin-bottom: 16px; }
}
```

- [ ] **步驟 2：確認樣式變數存在**

```bash
grep -n "var(--navy\|var(--cream" /Users/kit/Desktop/Isshohub/assets/css/styles.css | head -5
```

若 `--cream` 不存在，用 `#f6f3ec` 直接替換。

- [ ] **步驟 3：Commit**

```bash
git add assets/css/styles.css
git commit -m "feat: 加入天書頁面樣式 (.guide-table, .guide-sidebar, .guide-layout)"
```

---

## 任務 3：目錄頁

**文件：**
- 創建：`life/driving-guide/index.html`

- [ ] **步驟 1：建立目錄頁**

複製 `life/driving-quiz/index.html` 的 nav/footer/GA4 結構，替換內容為：

```html
<!doctype html>
<html lang="zh-Hant">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TSE650LL7P"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-TSE650LL7P');</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>日本駕照完全攻略｜外免切替・學科試天書 — IsshoHub</title>
<meta name="description" content="在日外國人日本駕照完全攻略。無論換牌（外免切替）或重新考試（學科試），15章圖文天書助你一次過關。">
<link rel="canonical" href="https://isshohub.com/life/driving-guide/">
<!-- [複製 driving-quiz 的 font/css/icon 連結] -->
</head>
<body>
<!-- [複製 driving-quiz 的 admin-bar / topbar / nav HTML] -->

<!-- BREADCRUMB -->
<div class="container" style="padding-top:16px;padding-bottom:0;">
  <div class="cat-hero-breadcrumb">
    <a href="/">首頁</a><span class="breadcrumb-sep">/</span>
    <a href="/life/">生活</a><span class="breadcrumb-sep">/</span>
    <span class="current">日本駕照天書</span>
  </div>
</div>

<!-- HERO -->
<div class="container" style="padding-top:32px;padding-bottom:8px;">
  <h1 style="font-size:2rem;margin-bottom:8px;">日本駕照完全攻略</h1>
  <p style="color:#555;font-size:1rem;max-width:640px;line-height:1.7;">
    無論你是換牌（外免切替）還是重新考試（學科試），這本天書把日本駕照考試所有重點整理成 15 章圖文並茂的學習指南。
  </p>
</div>

<!-- CHAPTER LIST -->
<div class="container" style="padding-bottom:60px;">
  <div style="max-width:760px;">

    <!-- 免費章節 -->
    <h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;color:#888;margin:32px 0 16px;">免費閱覽</h2>
    <a href="/life/driving-guide/chapter-1/" class="guide-chapter-row">
      <span class="ch-num">第一章</span>
      <span class="ch-title">容易混淆的標識與標線</span>
      <span class="ch-arrow">→</span>
    </a>
    <a href="/life/driving-guide/chapter-2/" class="guide-chapter-row">
      <span class="ch-num">第二章</span>
      <span class="ch-title">道路標識速查表</span>
      <span class="ch-arrow">→</span>
    </a>

    <!-- 付費章節 -->
    <h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;color:#888;margin:32px 0 16px;">完整版（即將開放）</h2>
    <!-- 第3-14章，顯示鎖頭 -->
    <!-- 用 JS 迴圈或手動列出 -->
    <div class="guide-chapter-row locked">
      <span class="ch-num">第三章</span>
      <span class="ch-title">道路標線速查表</span>
      <span class="lock-icon">🔒</span>
    </div>
    <!-- ... 第4-14章同樣格式 ... -->

    <!-- 免責聲明 -->
    <h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;color:#888;margin:32px 0 16px;">其他</h2>
    <a href="/life/driving-guide/chapter-15/" class="guide-chapter-row">
      <span class="ch-num">第十五章</span>
      <span class="ch-title">免責聲明</span>
      <span class="ch-arrow">→</span>
    </a>

  </div>
</div>

<!-- [複製 driving-quiz 的 footer / auth modal / JS scripts] -->
</body>
</html>
```

- [ ] **步驟 2：在 styles.css 加入目錄頁行樣式**

```css
.guide-chapter-row {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 10px;
  text-decoration: none; color: var(--navy, #0d2444);
  border: 1px solid #e8e4dc; margin-bottom: 8px;
  transition: background .15s;
}
.guide-chapter-row:hover { background: #f6f3ec; }
.guide-chapter-row.locked { opacity: .5; cursor: default; pointer-events: none; }
.ch-num  { font-size: 12px; font-weight: 700; color: #888; min-width: 60px; }
.ch-title { flex: 1; font-weight: 600; }
.ch-arrow { color: #aaa; }
```

- [ ] **步驟 3：Commit**

```bash
git add life/driving-guide/index.html assets/css/styles.css
git commit -m "feat: 新增天書目錄頁 /life/driving-guide/"
```

---

## 任務 4：章節頁模板 + 第1、2章

**文件：**
- 創建：`life/driving-guide/chapter-1/index.html`
- 創建：`life/driving-guide/chapter-2/index.html`

章節頁模板結構（以第1章為例）：

- [ ] **步驟 1：建立第1章頁面**

```html
<!doctype html>
<html lang="zh-Hant">
<head>
<!-- GA4、charset、viewport、fonts、styles.css — 同 driving-quiz -->
<title>第一章 容易混淆的標識與標線｜日本駕照天書 — IsshoHub</title>
<meta name="description" content="外免切替筆試中最容易失分的成對標誌對照表，附辨識訣竅。日本駕照學科試必讀。">
<link rel="canonical" href="https://isshohub.com/life/driving-guide/chapter-1/">
</head>
<body>
<!-- admin-bar / topbar / nav — 同 driving-quiz -->

<!-- BREADCRUMB -->
<div class="container" style="padding-top:16px;">
  <div class="cat-hero-breadcrumb">
    <a href="/">首頁</a><span class="breadcrumb-sep">/</span>
    <a href="/life/">生活</a><span class="breadcrumb-sep">/</span>
    <a href="/life/driving-guide/">駕照天書</a><span class="breadcrumb-sep">/</span>
    <span class="current">第一章</span>
  </div>
</div>

<div class="guide-layout">

  <!-- 側邊目錄（桌面） -->
  <aside class="guide-sidebar">
    <h3>目錄</h3>
    <!-- 手機版下拉 -->
    <select class="guide-mobile-select" onchange="location=this.value">
      <option value="/life/driving-guide/chapter-1/" selected>第一章 容易混淆的標識</option>
      <option value="/life/driving-guide/chapter-2/">第二章 道路標識速查表</option>
      <option value="/life/driving-guide/chapter-3/" disabled>🔒 第三章 道路標線速查表</option>
      <!-- ... -->
    </select>
    <!-- 桌面清單 -->
    <ul>
      <li><a href="/life/driving-guide/chapter-1/" class="active">第一章 容易混淆的標識與標線</a></li>
      <li><a href="/life/driving-guide/chapter-2/">第二章 道路標識速查表</a></li>
      <li><a href="#" style="pointer-events:none;opacity:.5;">🔒 第三章 道路標線速查表</a></li>
      <!-- 第4-14章同樣鎖頭 -->
      <li><a href="/life/driving-guide/chapter-15/">第十五章 免責聲明</a></li>
    </ul>
  </aside>

  <!-- 正文 -->
  <div class="guide-content">
    <!-- 從 scripts/output/chapter-1.html 貼入 -->
    [CHAPTER_1_HTML_CONTENT]

    <!-- 章節導航 -->
    <div class="guide-nav-bar">
      <span></span>
      <a href="/life/driving-guide/chapter-2/">第二章 →</a>
    </div>
  </div>

</div>

<!-- footer / auth modal / JS — 同 driving-quiz -->
</body>
</html>
```

- [ ] **步驟 2：將 scripts/output/chapter-1.html 內容貼入頁面**

審閱 `scripts/output/chapter-1.html`，確認圖片路徑 `/assets/img/driving-guide/ch01/ch01_img001.jpg` 等正確存在後，貼入 `[CHAPTER_1_HTML_CONTENT]` 位置。

- [ ] **步驟 3：建立第2章頁面**

同上流程，建立 `life/driving-guide/chapter-2/index.html`：
- title: `第二章 道路標識速查表｜日本駕照天書 — IsshoHub`
- description: `日本全部道路標識圖解速查表，含禁止、指示、警戒等各類標識說明。外免切替・學科試備考必備。`
- canonical: `https://isshohub.com/life/driving-guide/chapter-2/`
- 側邊目錄 active 改為 chapter-2
- 章節導航：`← 第一章` / `第三章（鎖） →`

- [ ] **步驟 4：Commit**

```bash
git add life/driving-guide/chapter-1/ life/driving-guide/chapter-2/ assets/img/driving-guide/ch01/ assets/img/driving-guide/ch02/
git commit -m "feat: 新增天書第1、2章頁面（免費）"
```

---

## 任務 5：第3-14章（付費預留）+ 第15章（免責聲明）

**文件：**
- 創建：`life/driving-guide/chapter-3/` ~ `chapter-15/`

- [ ] **步驟 1：建立第3-14章頁面**

每章結構同任務4，但正文區加鎖頭 banner 取代完整內容：

```html
<div class="guide-content">
  <h1>第三章　道路標線速查表</h1>
  <p>日本道路上各類標線的圖解說明，包含禁止變換、停止線、行人穿越道等。</p>

  <!-- 付費鎖頭 banner（第二階段替換為真實內容） -->
  <div class="guide-lock-banner">
    <h3>🔒 此章節為付費內容</h3>
    <p>購買天書完整版（¥500，有效期 90 天）即可解鎖第 3-14 章全部內容。</p>
    <button class="btn btn-primary" disabled>即將開放付費解鎖</button>
  </div>
</div>
```

- [ ] **步驟 2：建立第15章免責聲明（公開）**

從 `scripts/output/chapter-15.html` 貼入完整內容，無鎖頭。

- [ ] **步驟 3：Commit**

```bash
git add life/driving-guide/chapter-3/ life/driving-guide/chapter-4/ life/driving-guide/chapter-5/ life/driving-guide/chapter-6/ life/driving-guide/chapter-7/ life/driving-guide/chapter-8/ life/driving-guide/chapter-9/ life/driving-guide/chapter-10/ life/driving-guide/chapter-11/ life/driving-guide/chapter-12/ life/driving-guide/chapter-13/ life/driving-guide/chapter-14/ life/driving-guide/chapter-15/
git commit -m "feat: 新增天書第3-15章頁面（付費章節預留鎖頭）"
```

---

## 任務 6：更新 data.js nav + build.js sitemap

**文件：**
- 修改：`assets/js/data.js`
- 修改：`build.js`

- [ ] **步驟 1：在 data.js 的 life nav 加入子選單項目**

找到 `data.js` 中 `key: "life"` 的 nav 項目，加入 sub：

```js
{ key: "life", url: "/life/", tc: "生活", en: "Life in Japan", short_tc: "生活", short_en: "Life",
  sub: [
    { tc: "外免切替模擬試題", en: "Driving Quiz",  url: "/life/driving-quiz/" },
    { tc: "日本駕照天書",     en: "Driving Guide", url: "/life/driving-guide/" },
  ]
},
```

（若 life 已有 sub，追加到現有陣列末尾）

- [ ] **步驟 2：在 build.js 加入 driving-guide 所有頁面**

找到 build.js 中生成 sitemap 的部分，加入靜態頁面列表：

```js
const staticPages = [
  // ... 現有頁面 ...
  '/life/driving-guide/',
  '/life/driving-guide/chapter-1/',
  '/life/driving-guide/chapter-2/',
  '/life/driving-guide/chapter-3/',
  '/life/driving-guide/chapter-4/',
  '/life/driving-guide/chapter-5/',
  '/life/driving-guide/chapter-6/',
  '/life/driving-guide/chapter-7/',
  '/life/driving-guide/chapter-8/',
  '/life/driving-guide/chapter-9/',
  '/life/driving-guide/chapter-10/',
  '/life/driving-guide/chapter-11/',
  '/life/driving-guide/chapter-12/',
  '/life/driving-guide/chapter-13/',
  '/life/driving-guide/chapter-14/',
  '/life/driving-guide/chapter-15/',
];
```

- [ ] **步驟 3：執行 build.js 確認 sitemap 更新**

```bash
cd /Users/kit/Desktop/Isshohub
node build.js
grep "driving-guide" sitemap.xml
```

預期輸出：sitemap.xml 含 16 個 driving-guide URL。

- [ ] **步驟 4：Commit**

```bash
git add assets/js/data.js build.js sitemap.xml
git commit -m "feat: 更新 nav 加入天書連結，sitemap 加入天書所有頁面"
```

---

## 任務 7：最終測試 + Push

- [ ] **步驟 1：本機快速檢查**

用瀏覽器直接開啟（file:// 或 live server）：
- `/life/driving-guide/` — 目錄頁顯示正常，免費章節有連結，付費章節有鎖頭
- `/life/driving-guide/chapter-1/` — 圖片顯示正常，表格格式正確，側邊目錄正確高亮
- `/life/driving-guide/chapter-3/` — 顯示鎖頭 banner，不顯示內容

- [ ] **步驟 2：確認圖片路徑**

```bash
# 確認圖片檔案存在
ls assets/img/driving-guide/ch01/ | wc -l   # 應 = 34
ls assets/img/driving-guide/ch02/ | wc -l   # 應 = 135
```

- [ ] **步驟 3：Push 到 GitHub，等待 Cloudflare Pages 部署**

```bash
git push
```

約 30-60 秒後訪問 https://isshohub.com/life/driving-guide/ 確認上線。

- [ ] **步驟 4：提交新頁面到 Google Search Console**

登入 https://search.google.com/search-console，提交以下 URL 索引：
- `https://isshohub.com/life/driving-guide/`
- `https://isshohub.com/life/driving-guide/chapter-1/`
- `https://isshohub.com/life/driving-guide/chapter-2/`

---

## 規格自檢

- ✅ URL 結構：`/life/driving-guide/chapter-X/` 各章獨立 URL
- ✅ 免費章節：第1、2章完整內容；第3-14章鎖頭 banner
- ✅ 第15章免責聲明：公開
- ✅ 圖片提取：python 腳本批次處理，存 `/assets/img/driving-guide/`
- ✅ 側邊目錄：桌面固定，手機下拉選單
- ✅ SEO：每章 canonical + title + description
- ✅ sitemap：16 個新頁面
- ✅ nav：life 子選單加入天書連結
- ✅ 付費鎖頭：預留 banner，第二階段替換為真實解鎖邏輯
