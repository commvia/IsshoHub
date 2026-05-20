#!/usr/bin/env python3
"""
docx-to-html.py — 完整格式保真轉換器
處理：合併格子(colspan/rowspan)、格子背景色、文字顏色、標題顏色、圖片裁剪+尺寸
用法: python3 scripts/docx-to-html.py
"""
import os, io
from docx import Document
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph as DocxParagraph
from docx.table import Table as DocxTable
from PIL import Image

DOCX_DIR = os.path.expanduser('~/Downloads/外免天書_extracted')
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR  = os.path.join(PROJECT_ROOT, 'scripts', 'output')
IMG_BASE = os.path.join(PROJECT_ROOT, 'assets', 'img', 'driving-guide')
IMG_WEB  = '/assets/img/driving-guide'

EMU_PER_PX = 9525  # 914400 EMU = 1 inch = 96px

STYLE_COLORS = {
    'Heading 1': '1F3A5F',
    'Heading 2': '2E5C8A',
    'Heading 3': '1F4D78',
    'Heading 4': '1F4D78',
}

EXT_MAP = {
    'jpeg': 'jpg', 'png': 'png', 'gif': 'gif',
    'bmp': 'bmp', 'tiff': 'tif', 'x-wmf': 'wmf', 'x-emf': 'emf'
}

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


# ── 圖片 ──────────────────────────────────

def process_drawing(drawing_elem, doc, ch_num, img_counter, img_dir):
    """處理 w:drawing：提取、裁剪、儲存，回傳 (<img> html, new_counter)"""
    blip = drawing_elem.find('.//' + qn('a:blip'))
    if blip is None:
        return '', img_counter

    embed = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
    if not embed or embed not in doc.part.rels:
        return '', img_counter

    try:
        img_part = doc.part.rels[embed].target_part
    except Exception:
        return '', img_counter

    img_data = img_part.blob
    content_type = img_part.content_type
    ext = EXT_MAP.get(content_type.split('/')[-1], 'png')

    # 顯示寬度（EMU → px）
    extent = drawing_elem.find('.//' + qn('wp:extent'))
    cx = int(extent.get('cx', '0')) if extent is not None else 0
    width_px = round(cx / EMU_PER_PX) if cx > 0 else None

    # 裁剪設定（1/100000 單位）
    srcRect = drawing_elem.find('.//' + qn('a:srcRect'))
    if srcRect is not None:
        crop_l = int(srcRect.get('l', '0')) / 100000
        crop_t = int(srcRect.get('t', '0')) / 100000
        crop_r = int(srcRect.get('r', '0')) / 100000
        crop_b = int(srcRect.get('b', '0')) / 100000
    else:
        crop_l = crop_t = crop_r = crop_b = 0.0

    img_counter += 1
    fname = f'ch{ch_num:02d}_img{img_counter:03d}.{ext}'
    fpath = os.path.join(img_dir, fname)

    needs_crop = any(v > 0.001 for v in [crop_l, crop_t, crop_r, crop_b])
    if needs_crop and ext not in ('wmf', 'emf'):
        try:
            img = Image.open(io.BytesIO(img_data))
            w, h = img.size
            left   = max(0, round(w * crop_l))
            top    = max(0, round(h * crop_t))
            right  = min(w, round(w * (1 - crop_r)))
            bottom = min(h, round(h * (1 - crop_b)))
            if right > left and bottom > top:
                img = img.crop((left, top, right, bottom))
            img.save(fpath)
        except Exception as e:
            print(f'    ⚠ 裁剪失敗 {fname}: {e}')
            with open(fpath, 'wb') as f:
                f.write(img_data)
    else:
        with open(fpath, 'wb') as f:
            f.write(img_data)

    src = f'{IMG_WEB}/ch{ch_num:02d}/{fname}'
    style_attr = f' style="width:{width_px}px;max-width:100%;"' if width_px else ''
    return f'<img src="{src}" class="guide-img" alt=""{style_attr}>', img_counter


# ── 段落 ──────────────────────────────────

def para_to_html(para, doc, ch_num, img_counter, img_dir):
    """段落 → HTML，含內嵌圖片、文字顏色、標題顏色"""
    style = para.style.name
    tag_map = {
        'Heading 1': 'h1', 'Heading 2': 'h2',
        'Heading 3': 'h3', 'Heading 4': 'h4',
    }
    tag = tag_map.get(style, 'p')
    is_list = 'List' in style

    # 段落含圖片？
    drawings = para._p.findall('.//' + qn('w:drawing'))
    if drawings:
        parts = []
        for d in drawings:
            img_html, img_counter = process_drawing(d, doc, ch_num, img_counter, img_dir)
            if img_html:
                parts.append(img_html)
        return '\n'.join(parts), img_counter

    # 純文字
    inner = ''
    for run in para.runs:
        t = run.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        if not t:
            continue

        rPr = run._r.find(qn('w:rPr'))

        # 顏色
        run_color = None
        if rPr is not None:
            ce = rPr.find(qn('w:color'))
            if ce is not None:
                val = ce.get(qn('w:val'), 'auto')
                if val and val.lower() != 'auto':
                    run_color = f'#{val}'

        # 字號（僅用於正文段落）
        font_size_pt = None
        if tag == 'p' and rPr is not None:
            sz_e = rPr.find(qn('w:sz'))
            if sz_e is not None:
                sz = sz_e.get(qn('w:val'))
                if sz:
                    font_size_pt = int(sz) / 2

        # 粗體 / 斜體
        if run.bold and run.italic:
            t = f'<strong><em>{t}</em></strong>'
        elif run.bold:
            t = f'<strong>{t}</strong>'
        elif run.italic:
            t = f'<em>{t}</em>'

        # span 包色彩 / 字號
        span_styles = []
        if run_color:
            span_styles.append(f'color:{run_color}')
        if font_size_pt:
            span_styles.append(f'font-size:{font_size_pt}pt')
        if span_styles:
            t = f'<span style="{";".join(span_styles)}">{t}</span>'

        inner += t

    if not inner.strip():
        return '', img_counter

    # Heading 顏色
    tag_style = ''
    if tag in ('h1', 'h2', 'h3', 'h4'):
        sc = STYLE_COLORS.get(style)
        if sc:
            tag_style = f' style="color:#{sc}"'

    if is_list:
        return f'<li>{inner}</li>', img_counter
    return f'<{tag}{tag_style}>{inner}</{tag}>', img_counter


# ── 表格 ──────────────────────────────────

def get_cell_bg(cell):
    tc = cell._tc
    tcPr = tc.find(qn('w:tcPr'))
    if tcPr is None:
        return None
    shd = tcPr.find(qn('w:shd'))
    if shd is None:
        return None
    fill = shd.get(qn('w:fill'))
    if fill and fill.lower() not in ('auto', 'ffffff', 'none', ''):
        return fill
    return None


def get_cell_align(cell):
    tc = cell._tc
    tcPr = tc.find(qn('w:tcPr'))
    if tcPr is None:
        return None
    jc = tcPr.find(qn('w:jc'))
    if jc is None:
        return None
    return jc.get(qn('w:val'))


def get_colspan(cell):
    tc = cell._tc
    tcPr = tc.find(qn('w:tcPr'))
    if tcPr is None:
        return 1
    gs = tcPr.find(qn('w:gridSpan'))
    if gs is None:
        return 1
    return int(gs.get(qn('w:val'), '1'))


def is_vmerge_continue(cell):
    tc = cell._tc
    tcPr = tc.find(qn('w:tcPr'))
    if tcPr is None:
        return False
    vm = tcPr.find(qn('w:vMerge'))
    if vm is None:
        return False
    return vm.get(qn('w:val'), '') != 'restart'


def get_rowspan(table, ri, ci):
    span = 1
    for r in range(ri + 1, len(table.rows)):
        row = table.rows[r]
        if ci >= len(row.cells):
            break
        if is_vmerge_continue(row.cells[ci]):
            span += 1
        else:
            break
    return span


def table_to_html(table, doc, ch_num, img_counter, img_dir):
    """完整保留格式的表格轉換"""
    html = '<table class="guide-table">\n'
    skipped = set()

    for ri, row in enumerate(table.rows):
        html += '  <tr>\n'
        processed_tc = set()  # 追蹤已輸出的 tc 元素，防止 colspan 重複
        for ci, cell in enumerate(row.cells):
            if (ri, ci) in skipped:
                continue
            if id(cell._tc) in processed_tc:
                continue  # colspan 造成的重複格子，跳過
            if is_vmerge_continue(cell):
                skipped.add((ri, ci))
                continue
            processed_tc.add(id(cell._tc))

            colspan = get_colspan(cell)
            rowspan = get_rowspan(table, ri, ci)

            if rowspan > 1:
                for dr in range(1, rowspan):
                    skipped.add((ri + dr, ci))

            # 格子樣式
            cell_styles = []
            bg = get_cell_bg(cell)
            if bg:
                cell_styles.append(f'background-color:#{bg}')
            align = get_cell_align(cell)
            if align == 'center':
                cell_styles.append('text-align:center')
            elif align == 'right':
                cell_styles.append('text-align:right')

            attrs = ''
            if colspan > 1:
                attrs += f' colspan="{colspan}"'
            if rowspan > 1:
                attrs += f' rowspan="{rowspan}"'
            if cell_styles:
                attrs += f' style="{";".join(cell_styles)}"'

            tag = 'th' if ri == 0 else 'td'

            # 格子內容
            cell_html_parts = []
            for para in cell.paragraphs:
                h, img_counter = para_to_html(para, doc, ch_num, img_counter, img_dir)
                if h:
                    cell_html_parts.append(h)
            cell_content = '\n'.join(cell_html_parts)

            html += f'    <{tag}{attrs}>{cell_content}</{tag}>\n'

        html += '  </tr>\n'

    html += '</table>\n'
    return html, img_counter


# ── 主迴圈 ────────────────────────────────

def convert_chapter(ch_num, fname):
    path = os.path.join(DOCX_DIR, fname)
    if not os.path.exists(path):
        print(f'✗ 第{ch_num}章: 找不到 {path}')
        return

    doc = Document(path)
    img_dir = os.path.join(IMG_BASE, f'ch{ch_num:02d}')
    os.makedirs(img_dir, exist_ok=True)

    html_parts = []
    img_counter = 0
    body = doc.element.body

    for child in body:
        tag = child.tag.split('}')[-1]
        if tag == 'p':
            para = DocxParagraph(child, doc)
            h, img_counter = para_to_html(para, doc, ch_num, img_counter, img_dir)
            if h:
                html_parts.append(h)
        elif tag == 'tbl':
            table = DocxTable(child, doc)
            h, img_counter = table_to_html(table, doc, ch_num, img_counter, img_dir)
            html_parts.append(h)

    out_path = os.path.join(OUT_DIR, f'chapter-{ch_num}.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(html_parts))

    print(f'✓ 第{ch_num}章: {img_counter} 張圖片, {len(html_parts)} 個區塊')


if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)
    for ch_num, fname in CHAPTERS:
        convert_chapter(ch_num, fname)
    print('\n完成！')
