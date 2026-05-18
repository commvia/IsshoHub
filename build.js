// 本機開發讀取 .env（生產環境有真實環境變數）
try { const d = await import('dotenv'); d.config(); } catch {}

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const BASE_URL     = (process.env.SITE_URL || 'https://isshohub.pages.dev').replace(/\/$/, '');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠️  缺少 SUPABASE_URL 或 SUPABASE_SERVICE_KEY，跳過靜態頁面生成');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function md(text) {
  if (!text) return '';
  var lines = text.split('\n');
  var out   = [];
  var inUl = false, inOl = false, inBq = false, inTable = false;
  var tableRows = [];

  function closeLists() { if (inUl) { out.push('</ul>'); inUl=false; } if (inOl) { out.push('</ol>'); inOl=false; } }
  function closeBq()    { if (inBq) { out.push('</blockquote>'); inBq=false; } }
  function closeTable() {
    if (!inTable) return;
    inTable = false;
    if (tableRows.length < 2) { tableRows.forEach(function(r){ out.push('<p>'+r+'</p>'); }); tableRows=[]; return; }
    var html = '<table>';
    var sepIdx = -1;
    for (var r=0; r<tableRows.length; r++) {
      if (/^\|[-| :]+\|$/.test(tableRows[r].replace(/\s/g,''))) { sepIdx = r; break; }
    }
    var headerRows = sepIdx > 0 ? tableRows.slice(0, sepIdx) : [];
    var bodyRows   = sepIdx >= 0 ? tableRows.slice(sepIdx + 1) : tableRows;
    function parseCells(row) {
      return row.replace(/^\||\|$/g,'').split('|').map(function(c){ return c.trim(); });
    }
    if (headerRows.length) {
      html += '<thead>';
      headerRows.forEach(function(row){ html += '<tr>'+parseCells(row).map(function(c){ return '<th>'+inline(c)+'</th>'; }).join('')+'</tr>'; });
      html += '</thead>';
    }
    if (bodyRows.length) {
      html += '<tbody>';
      bodyRows.forEach(function(row){ html += '<tr>'+parseCells(row).map(function(c){ return '<td>'+inline(c)+'</td>'; }).join('')+'</tr>'; });
      html += '</tbody>';
    }
    html += '</table>';
    out.push(html);
    tableRows = [];
  }
  function inline(s) {
    return s
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,         '<em>$1</em>')
      .replace(/`(.+?)`/g,           '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    /* Table row detection */
    if (/^\|.+/.test(t)) {
      closeLists(); closeBq();
      inTable = true;
      tableRows.push(t);
      continue;
    }
    if (inTable) { closeTable(); }
    if (/^#### (.+)/.test(t)) { closeLists(); closeBq(); out.push('<h4>'+inline(t.slice(5))+'</h4>'); continue; }
    if (/^### (.+)/.test(t))  { closeLists(); closeBq(); out.push('<h3>'+inline(t.slice(4))+'</h3>'); continue; }
    if (/^## (.+)/.test(t))   { closeLists(); closeBq(); out.push('<h2>'+inline(t.slice(3))+'</h2>'); continue; }
    if (/^# (.+)/.test(t))    { closeLists(); closeBq(); out.push('<h2>'+inline(t.slice(2))+'</h2>'); continue; }
    if (/^---+$/.test(t))     { closeLists(); closeBq(); out.push('<hr>'); continue; }
    if (/^> (.*)/.test(t))    { closeLists(); if (!inBq) { out.push('<blockquote>'); inBq=true; } out.push('<p>'+inline(t.slice(2))+'</p>'); continue; }
    if (/^[-*+] (.+)/.test(t)){ closeBq(); if (inOl){out.push('</ol>');inOl=false;} if(!inUl){out.push('<ul>');inUl=true;} out.push('<li>'+inline(t.slice(2))+'</li>'); continue; }
    var om = t.match(/^\d+\. (.+)/);
    if (om) { closeBq(); if(inUl){out.push('</ul>');inUl=false;} if(!inOl){out.push('<ol>');inOl=true;} out.push('<li>'+inline(om[1])+'</li>'); continue; }
    if (t === '') { closeLists(); closeBq(); out.push(''); continue; }
    closeLists(); closeBq(); out.push(inline(t));
  }
  closeLists(); closeBq(); closeTable();
  return out.join('\n').split(/\n{2,}/).map(function(b){
    b = b.trim();
    if (!b) return '';
    if (/^<(h[1-6]|ul|ol|li|hr|blockquote|p|table)/.test(b)) return b;
    return '<p>'+b.replace(/\n/g,'<br>')+'</p>';
  }).filter(Boolean).join('\n');
}

const STATIC_PAGES = [
  { loc: `${BASE_URL}/`,         changefreq: 'daily',  priority: '1.0' },
  { loc: `${BASE_URL}/news/`,    changefreq: 'daily',  priority: '0.9' },
  { loc: `${BASE_URL}/visa/`,    changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/biz/`,     changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/house/`,   changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/tax/`,     changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/life/`,    changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/culture/`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/places/`,  changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/pets/`,    changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/story/`,   changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/invest/`,  changefreq: 'weekly', priority: '0.8' },
];

function generateSitemap(articles) {
  const staticUrls = STATIC_PAGES.map(p =>
    `  <url>\n    <loc>${p.loc}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
  );

  const articleUrls = articles
    .filter(a => a.slug)
    .map(a => {
      const lastmod = (a.updated_at || a.published_at || '').substring(0, 10);
      return `  <url>\n    <loc>${BASE_URL}/article/${a.slug}/</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '',
    ...staticUrls,
    '',
    ...articleUrls,
    '',
    '</urlset>',
    '',
  ].join('\n');

  fs.writeFileSync('sitemap.xml', xml, 'utf8');
  console.log(`✓ sitemap.xml 已更新（${STATIC_PAGES.length} 靜態頁 + ${articleUrls.length} 文章）`);
}

async function build() {
  const template = fs.readFileSync('article/_template.html', 'utf8');

  const { data: articles, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('❌ Supabase 錯誤:', error.message);
    process.exit(1);
  }

  let generated = 0;

  for (const a of articles) {
    const slug = a.slug;
    if (!slug) continue;

    const canonicalUrl = `${BASE_URL}/article/${slug}/`;
    const titleTc    = a.title_tc   || a.title_en   || '';
    const titleEn    = a.title_en   || a.title_tc   || '';
    const excerptTc  = a.excerpt_tc || '';
    const excerptEn  = a.excerpt_en || '';
    const bodyTcHtml = md(a.body_tc || '');
    const bodyEnHtml = md(a.body_en || '');
    const ogImg      = a.cover_image_url
      || 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80';
    const published  = (a.published_at || '').substring(0, 10);
    const modified   = (a.updated_at  || a.published_at || '').substring(0, 10);

    const jsonLd = JSON.stringify({
      '@context':    'https://schema.org',
      '@type':       'Article',
      'headline':    titleTc || titleEn,
      'description': excerptTc || excerptEn || titleTc,
      'image':       ogImg,
      'datePublished': published,
      'dateModified':  modified,
      'author':    { '@type': 'Organization', 'name': 'IsshoHub' },
      'publisher': { '@type': 'Organization', 'name': 'IsshoHub', 'url': BASE_URL },
      'url':         canonicalUrl,
    });

    // 使用函數形式的 replace 避免 $ 符號在替換字串中的特殊行為
    let html = template
      .replace(/\{\{SLUG\}\}/g,          () => slug)
      .replace(/\{\{TITLE_TC\}\}/g,      () => escHtml(titleTc))
      .replace(/\{\{TITLE_EN\}\}/g,      () => escHtml(titleEn))
      .replace(/\{\{EXCERPT_TC\}\}/g,    () => escHtml(excerptTc))
      .replace(/\{\{EXCERPT_EN\}\}/g,    () => escHtml(excerptEn))
      .replace(/\{\{CANONICAL_URL\}\}/g, () => canonicalUrl)
      .replace(/\{\{OG_IMAGE\}\}/g,      () => ogImg)
      .replace(/\{\{JSON_LD\}\}/g,       () => jsonLd)
      .replace(/\{\{BODY_TC\}\}/g,       () => bodyTcHtml)
      .replace(/\{\{BODY_EN\}\}/g,       () => bodyEnHtml)
      .replace(/\{\{PUBLISHED_DATE\}\}/g,() => published)
      .replace(/\{\{AUTHOR\}\}/g,        () => escHtml(a.author || ''));

    const dir = path.join('article', slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    generated++;
  }

  generateSitemap(articles);
  console.log(`✓ 生成 ${generated} 篇文章靜態頁`);
}

build().catch(err => { console.error('❌ Build 失敗:', err); process.exit(1); });
