#!/usr/bin/env python3
"""
docx-to-html.py
用法: python3 scripts/docx-to-html.py
輸出: 每章 HTML 片段到 scripts/output/chapter-X.html
      圖片到 assets/img/driving-guide/chXX/
"""
import os
from docx import Document
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph as DocxParagraph
from docx.table import Table as DocxTable

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

def extract_images(doc, ch_num):
    img_dir = f'{IMG_BASE}/ch{ch_num:02d}'
    os.makedirs(img_dir, exist_ok=True)
    mapping = {}  # {rId: '/assets/img/driving-guide/chXX/chXX_imgYYY.ext'}

    for rId, rel in doc.part.rels.items():
        if 'image' in rel.reltype:
            img_part = rel.target_part
            content_type = img_part.content_type
            EXT_MAP = {'jpeg': 'jpg', 'png': 'png', 'gif': 'gif', 'bmp': 'bmp', 'tiff': 'tif'}
            ext = EXT_MAP.get(content_type.split('/')[-1], 'bin')
            idx = len(mapping) + 1
            fname = f'ch{ch_num:02d}_img{idx:03d}.{ext}'
            fpath = f'{img_dir}/{fname}'
            with open(fpath, 'wb') as f:
                f.write(img_part.blob)
            mapping[rId] = f'/{img_dir}/{fname}'

    return mapping


def para_to_html(para):
    style = para.style.name
    text = ''
    for run in para.runs:
        t = run.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        if not t:
            continue
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
        'Heading 1': 'h1', 'Heading 2': 'h2', 'Heading 3': 'h3', 'Heading 4': 'h4',
    }
    tag = tag_map.get(style, 'p')

    if 'List' in style:
        return f'<li>{text}</li>'

    return f'<{tag}>{text}</{tag}>'


def table_to_html(table, img_mapping):
    html = '<table class="guide-table">\n'
    for row in table.rows:
        html += '  <tr>\n'
        for cell in row.cells:
            cell_html = ''
            # 找格子內所有圖片（通過 XML 找 blip embed）
            blips = cell._element.findall('.//' + qn('a:blip'))
            for blip in blips:
                embed = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                if embed and embed in img_mapping:
                    src = img_mapping[embed]
                    cell_html += f'<img src="{src}" class="guide-img" alt="">\n'
            # 格子內文字段落
            for para in cell.paragraphs:
                t = para.text.strip()
                if t:
                    t_escaped = t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    cell_html += f'<p>{t_escaped}</p>\n'
            html += f'    <td>{cell_html}</td>\n'
        html += '  </tr>\n'
    html += '</table>\n'
    return html


def convert_chapter(ch_num, fname):
    path = os.path.join(DOCX_DIR, fname)
    if not os.path.exists(path):
        print(f'✗ Chapter {ch_num}: 找不到 {path}')
        return

    doc = Document(path)
    img_mapping = extract_images(doc, ch_num)

    html_parts = []
    body = doc.element.body

    for child in body:
        tag = child.tag.split('}')[-1]
        if tag == 'p':
            para = DocxParagraph(child, doc)
            h = para_to_html(para)
            if h:
                html_parts.append(h)
        elif tag == 'tbl':
            table = DocxTable(child, doc)
            html_parts.append(table_to_html(table, img_mapping))

    out_path = f'{OUT_DIR}/chapter-{ch_num}.html'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(html_parts))
    print(f'✓ Chapter {ch_num}: {len(img_mapping)} 張圖片, {len(html_parts)} 個區塊 → {out_path}')


if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)
    for ch_num, fname in CHAPTERS:
        convert_chapter(ch_num, fname)
    print('完成！')
