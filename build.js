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

/* Standalone-URL → social embed converter.
   Detects a bare URL on its own line (no surrounding text, no markdown link
   syntax) and returns the platform's official embed HTML. Returns null if URL
   doesn't match any supported platform.
   Supported: X/Twitter, Instagram, Threads, Facebook posts/videos, YouTube.
   Inline links (within a paragraph) and markdown [text](url) links are NEVER
   matched here — they're handled by inline()'s regular link rendering. */
function tryUrlEmbed(line) {
  var m;
  // X / Twitter — must have /username/status/digits
  m = line.match(/^https?:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/[\w\.]+\/status\/\d+(?:\/\S*)?$/i);
  if (m) {
    return '<blockquote class="twitter-tweet"><a href="' + escHtml(line) + '"></a></blockquote>';
  }
  // Instagram — /p/<id> or /reel/<id>
  m = line.match(/^(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+)\/?.*$/i);
  if (m) {
    var igUrl = m[1] + '/';
    return '<blockquote class="instagram-media" data-instgrm-permalink="' + escHtml(igUrl) + '" data-instgrm-version="14"><a href="' + escHtml(igUrl) + '"></a></blockquote>';
  }
  // Threads — /@user/post/<id>
  m = line.match(/^https?:\/\/(?:www\.)?threads\.(?:net|com)\/@[\w\.]+\/post\/[A-Za-z0-9_-]+(?:\/\S*)?$/i);
  if (m) {
    return '<blockquote class="text-post-media" data-text-post-permalink="' + escHtml(line) + '"><a href="' + escHtml(line) + '">View on Threads</a></blockquote>';
  }
  // Facebook — posts/videos with numeric id (avoid matching profiles)
  m = line.match(/^https?:\/\/(?:www\.|m\.)?facebook\.com\/[^\/\s]+\/(?:posts|videos)\/[\d_]+(?:\/\S*)?$/i);
  if (m) {
    return '<div class="fb-post" data-href="' + escHtml(line) + '"></div>';
  }
  // YouTube — watch?v=, youtu.be/, or /shorts/
  m = line.match(/^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})(?:[?&]\S*)?$/i);
  if (m) {
    var ytId = m[1];
    return '<div class="yt-embed" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:24px 0;border-radius:8px;"><iframe src="https://www.youtube.com/embed/' + ytId + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>';
  }
  return null;
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
    /* Standalone-URL → social embed (X/IG/Threads/FB/YouTube). Must be on its
       own line, no surrounding text. Falls through if no platform pattern matches. */
    var embed = tryUrlEmbed(t);
    if (embed) { closeLists(); closeBq(); out.push(embed); continue; }
    closeLists(); closeBq(); out.push(inline(t));
  }
  closeLists(); closeBq(); closeTable();
  return out.join('\n').split(/\n{2,}/).map(function(b){
    b = b.trim();
    if (!b) return '';
    /* iframe + div added so YouTube/FB embed wrappers from tryUrlEmbed pass through. */
    if (/^<(h[1-6]|ul|ol|li|hr|blockquote|p|table|div|iframe)/.test(b)) return b;
    return '<p>'+b.replace(/\n/g,'<br>')+'</p>';
  }).filter(Boolean).join('\n');
}

const STATIC_PAGES = [
  { loc: `${BASE_URL}/`,           changefreq: 'daily',  priority: '1.0' },
  { loc: `${BASE_URL}/news/`,      changefreq: 'daily',  priority: '0.9' },
  { loc: `${BASE_URL}/en/news/`,   changefreq: 'daily',  priority: '0.9' },
  { loc: `${BASE_URL}/visa/`,      changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/en/visa/`,   changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/biz/`,       changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/en/biz/`,    changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/house/`,     changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/en/house/`,  changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/tax/`,       changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/en/tax/`,    changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/life/`,      changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/en/life/`,   changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/culture/`,   changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/en/culture/`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/places/`,    changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/en/places/`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/pets/`,      changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/en/pets/`,   changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/story/`,     changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/en/story/`,  changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/about/`,     changefreq: 'monthly', priority: '0.6' },
  { loc: `${BASE_URL}/en/about/`,  changefreq: 'monthly', priority: '0.6' },
  { loc: `${BASE_URL}/privacy/`,   changefreq: 'monthly', priority: '0.4' },
  { loc: `${BASE_URL}/en/privacy/`, changefreq: 'monthly', priority: '0.4' },
  { loc: `${BASE_URL}/visa/hsp-calculator/`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${BASE_URL}/life/driving-quiz/`,           changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/life/driving-guide/`,          changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-1/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-2/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-3/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-4/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-5/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-6/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-7/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-8/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-9/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-10/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-11/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-12/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-13/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-14/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/chapter-15/`, changefreq: 'monthly', priority: '0.7' },
  /* English versions */
  { loc: `${BASE_URL}/life/driving-guide/en/`,           changefreq: 'weekly',  priority: '0.8' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-1/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-2/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-3/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-4/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-5/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-6/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-7/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-8/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-9/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-10/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-11/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-12/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-13/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-14/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/en/chapter-15/`, changefreq: 'monthly', priority: '0.7' },
  /* Indonesian versions (chapters 1–15 + hub built) */
  { loc: `${BASE_URL}/life/driving-guide/id/`,           changefreq: 'weekly',  priority: '0.8' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-1/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-2/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-3/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-4/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-5/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-6/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-7/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-8/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-9/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-10/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-11/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-12/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-13/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-14/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/id/chapter-15/`, changefreq: 'monthly', priority: '0.7' },
  /* Vietnamese versions (chapters 1–15 + hub) */
  { loc: `${BASE_URL}/life/driving-guide/vi/`,           changefreq: 'weekly',  priority: '0.8' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-1/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-2/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-3/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-4/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-5/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-6/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-7/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-8/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-9/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-10/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-11/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-12/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-13/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-14/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/vi/chapter-15/`, changefreq: 'monthly', priority: '0.7' },
  /* Filipino versions (chapters 1–15 + hub) */
  { loc: `${BASE_URL}/life/driving-guide/fil/`,           changefreq: 'weekly',  priority: '0.8' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-1/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-2/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-3/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-4/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-5/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-6/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-7/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-8/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-9/`,  changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-10/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-11/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-12/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-13/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-14/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/life/driving-guide/fil/chapter-15/`, changefreq: 'monthly', priority: '0.7' },
];

/* Hreflang translation groups for STATIC_PAGES.
   Each entry maps language code → URL path. Used by generateSitemap to emit
   <xhtml:link rel="alternate" hreflang="..."> annotations so Google understands
   which URLs are translations of the same content.

   Languages: zh-Hant (default TC), en, id, vi, fil, x-default.
   Paths must start with `/` (BASE_URL is prepended at emit time).

   To add a new translation pair: add the URL paths to the appropriate group.
   Currently covers driving-guide (5 langs × 16 pages) + category pages.
*/
const HREFLANG_GROUPS = [
  /* Category & info pages (TC ↔ EN translation pairs) */
  { 'zh-Hant': '/tax/',     'en': '/en/tax/',     'x-default': '/tax/' },
  { 'zh-Hant': '/news/',    'en': '/en/news/',    'x-default': '/news/' },
  { 'zh-Hant': '/visa/',    'en': '/en/visa/',    'x-default': '/visa/' },
  { 'zh-Hant': '/biz/',     'en': '/en/biz/',     'x-default': '/biz/' },
  { 'zh-Hant': '/house/',   'en': '/en/house/',   'x-default': '/house/' },
  { 'zh-Hant': '/culture/', 'en': '/en/culture/', 'x-default': '/culture/' },
  { 'zh-Hant': '/life/',    'en': '/en/life/',    'x-default': '/life/' },
  { 'zh-Hant': '/places/',  'en': '/en/places/',  'x-default': '/places/' },
  { 'zh-Hant': '/pets/',    'en': '/en/pets/',    'x-default': '/pets/' },
  { 'zh-Hant': '/story/',   'en': '/en/story/',   'x-default': '/story/' },
  { 'zh-Hant': '/about/',   'en': '/en/about/',   'x-default': '/about/' },
  { 'zh-Hant': '/privacy/', 'en': '/en/privacy/', 'x-default': '/privacy/' },
  { 'zh-Hant': '/',         'en': '/en/',         'x-default': '/' },

  /* Driving guide hub */
  {
    'zh-Hant': '/life/driving-guide/',
    'en': '/life/driving-guide/en/',
    'id': '/life/driving-guide/id/',
    'vi': '/life/driving-guide/vi/',
    'fil': '/life/driving-guide/fil/',
    'x-default': '/life/driving-guide/',
  },

  /* Driving guide chapters 1-15 */
  ...Array.from({ length: 15 }, (_, i) => i + 1).map(n => ({
    'zh-Hant': `/life/driving-guide/chapter-${n}/`,
    'en':      `/life/driving-guide/en/chapter-${n}/`,
    'id':      `/life/driving-guide/id/chapter-${n}/`,
    'vi':      `/life/driving-guide/vi/chapter-${n}/`,
    'fil':     `/life/driving-guide/fil/chapter-${n}/`,
    'x-default': `/life/driving-guide/chapter-${n}/`,
  })),
];

/* Find the HREFLANG_GROUPS entry that contains the given full URL.
   Returns null if the URL has no translation pairs. */
function findHreflangGroup(fullLoc) {
  const path = fullLoc.replace(BASE_URL, '');
  return HREFLANG_GROUPS.find(g => Object.values(g).includes(path)) || null;
}

function generateSitemap(articles) {
  const staticUrls = STATIC_PAGES.map(p => {
    const group = findHreflangGroup(p.loc);
    const altsHtml = group
      ? '\n' + Object.entries(group).map(
          ([lang, path]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${BASE_URL}${path}"/>`
        ).join('\n')
      : '';
    return `  <url>\n    <loc>${p.loc}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>${altsHtml}\n  </url>`;
  });

  /* Generate sitemap entries with xhtml:link hreflang annotations so Google
     understands both TC and EN versions are equivalent translations. */
  const articleUrls = articles
    .filter(a => a.slug)
    .flatMap(a => {
      const lastmod = (a.updated_at || a.published_at || '').substring(0, 10);
      const tcLoc = `${BASE_URL}/article/${a.slug}/`;
      const enLoc = `${BASE_URL}/article/${a.slug}/en/`;
      const altLinks =
        `    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${tcLoc}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${tcLoc}"/>`;
      return [
        `  <url>\n    <loc>${tcLoc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n${altLinks}\n  </url>`,
        `  <url>\n    <loc>${enLoc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n${altLinks}\n  </url>`,
      ];
    });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    '',
    ...staticUrls,
    '',
    ...articleUrls,
    '',
    '</urlset>',
    '',
  ].join('\n');

  fs.writeFileSync('sitemap.xml', xml, 'utf8');
  console.log(`✓ sitemap.xml 已更新（${STATIC_PAGES.length} 靜態頁 + ${articleUrls.length} 文章 URL，含 TC/EN 雙語）`);
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

    const tcUrl  = `${BASE_URL}/article/${slug}/`;
    const enUrl  = `${BASE_URL}/article/${slug}/en/`;
    const titleTc    = a.title_tc   || a.title_en   || '';
    const titleEn    = a.title_en   || a.title_tc   || '';
    const excerptTc  = a.excerpt_tc || '';
    const excerptEn  = a.excerpt_en || '';
    const bodyTcHtml = md(a.body_tc || '');
    const bodyEnHtml = md(a.body_en || '');
    const ogImg      = a.cover_image_url
      || 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&w=1200&q=80';
    const published  = (a.published_at || '').substring(0, 10);
    const modified   = (a.updated_at  || a.published_at || '').substring(0, 10);

    /* Build language-specific JSON-LD */
    const jsonLdFor = (lang) => JSON.stringify({
      '@context':      'https://schema.org',
      '@type':         'Article',
      'headline':      lang === 'en' ? (titleEn || titleTc) : (titleTc || titleEn),
      'description':   lang === 'en' ? (excerptEn || excerptTc) : (excerptTc || excerptEn),
      'image':         ogImg,
      'datePublished': published,
      'dateModified':  modified,
      'author':    { '@type': 'Organization', 'name': 'IsshoHub' },
      'publisher': { '@type': 'Organization', 'name': 'IsshoHub', 'url': BASE_URL },
      'inLanguage':    lang === 'en' ? 'en' : 'zh-Hant',
      'url':           lang === 'en' ? enUrl : tcUrl,
    });

    /* Substitute template for one language variant */
    const renderHtml = (lang) => {
      const isEn = lang === 'en';
      return template
        .replace(/\{\{SLUG\}\}/g,          () => slug)
        .replace(/\{\{HTML_LANG\}\}/g,     () => isEn ? 'en' : 'zh-Hant')
        .replace(/\{\{BODY_LANG\}\}/g,     () => isEn ? 'en' : 'tc')
        .replace(/\{\{TITLE\}\}/g,         () => escHtml(isEn ? titleEn : titleTc))
        .replace(/\{\{EXCERPT\}\}/g,       () => escHtml(isEn ? excerptEn : excerptTc))
        .replace(/\{\{TITLE_TC\}\}/g,      () => escHtml(titleTc))
        .replace(/\{\{TITLE_EN\}\}/g,      () => escHtml(titleEn))
        .replace(/\{\{EXCERPT_TC\}\}/g,    () => escHtml(excerptTc))
        .replace(/\{\{EXCERPT_EN\}\}/g,    () => escHtml(excerptEn))
        .replace(/\{\{CANONICAL_URL\}\}/g, () => isEn ? enUrl : tcUrl)
        .replace(/\{\{TC_URL\}\}/g,        () => tcUrl)
        .replace(/\{\{EN_URL\}\}/g,        () => enUrl)
        .replace(/\{\{OG_LOCALE\}\}/g,     () => isEn ? 'en_US' : 'zh_TW')
        .replace(/\{\{OG_LOCALE_ALT\}\}/g, () => isEn ? 'zh_TW' : 'en_US')
        .replace(/\{\{IS_EN_FLAG\}\}/g,    () => isEn ? 'true' : 'false')
        .replace(/\{\{OG_IMAGE\}\}/g,      () => ogImg)
        .replace(/\{\{JSON_LD\}\}/g,       () => jsonLdFor(lang))
        .replace(/\{\{BODY_TC\}\}/g,       () => bodyTcHtml)
        .replace(/\{\{BODY_EN\}\}/g,       () => bodyEnHtml)
        .replace(/\{\{PUBLISHED_DATE\}\}/g,() => published)
        .replace(/\{\{AUTHOR\}\}/g,        () => escHtml(a.author || ''));
    };

    /* TC version: /article/<slug>/index.html */
    const tcDir = path.join('article', slug);
    fs.mkdirSync(tcDir, { recursive: true });
    fs.writeFileSync(path.join(tcDir, 'index.html'), renderHtml('tc'), 'utf8');

    /* EN version: /article/<slug>/en/index.html */
    const enDir = path.join('article', slug, 'en');
    fs.mkdirSync(enDir, { recursive: true });
    fs.writeFileSync(path.join(enDir, 'index.html'), renderHtml('en'), 'utf8');

    generated++;
  }

  generateSitemap(articles);
  console.log(`✓ 生成 ${generated} 篇文章 × 2 語言 = ${generated * 2} 個靜態頁`);

  /* ── Homepage SSG: inject article content into empty containers so AI
     crawlers (Gemini, ChatGPT browsing, Perplexity) and search engines see
     actual content, not just a JS-shell. Real users still see the JS-rendered
     version after applySettings runs — JS will overwrite these containers. */
  await generateHomepageSSG(articles);
}

/* ── Homepage SSG helpers ───────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('zh-Hant', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

/* Cloudflare Image Transformations wrapper — same as core.js cfImg().
   Used by SSG so static HTML served to crawlers uses optimized image URLs. */
function cfImg(url, width, quality) {
  if (!url || typeof url !== 'string') return url || '';
  if (url.startsWith('data:')) return url;
  if (url.indexOf('/cdn-cgi/image/') !== -1) return url;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  const w = width || 800;
  const q = quality || 80;
  return '/cdn-cgi/image/width=' + w + ',quality=' + q + ',format=auto/' + url;
}

/* Build a semantic card for crawlers — JS will replace this with the styled
   version when the page loads in a real browser. */
function ssgCardHTML(a, opts) {
  opts = opts || {};
  const title   = a.title_tc || a.title_en || '';
  const excerpt = a.excerpt_tc || a.excerpt_en || '';
  const img     = a.cover_image_url || 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&w=800&q=80';
  const url     = `/article/${a.slug}/`;
  const author  = a.author || '';
  const date    = fmtDate(a.published_at);
  const featuredCls = opts.featured ? ' featured' : '';
  const overlayCls  = opts.overlay ? ' overlay' : '';
  return `<article class="card${featuredCls}${overlayCls}" onclick="if(!event.target.closest('a'))window.location.href='${url}'" style="cursor:pointer"><a class="card-media" href="${url}" style="background-image: url('${cfImg(img, 600)}')"></a><div class="card-body"><h3 class="card-title">${escHtml(title)}</h3><p class="card-excerpt">${escHtml(excerpt)}</p><div class="card-meta"><span class="author">${escHtml(author)}</span>${author && date ? '<span class="dot"></span>' : ''}<span>${escHtml(date)}</span></div></div></article>`;
}

/* Category labels for SSG hero chip + kicker, mirroring data.js D.nav[].short_tc
   and D.nav[].tc. Keep in sync with data.js. Used so SSG hero output matches
   what JS renderHero would produce → eliminates SSG→JS hero flash on refresh. */
const NAV_SHORT_LABELS_TC = {
  news: '新聞', visa: '簽證', biz: '創業', house: '住屋',
  culture: '文化', tax: '稅務', life: '生活',
  places: '好去處', pets: '寵物', story: '故事',
};
const NAV_LONG_LABELS_TC = {
  news: '新聞・資訊', visa: '簽證・在留資格', biz: '創業・工作',
  house: '住屋', culture: '文化', tax: '稅務・保險・年金',
  life: '生活', places: '好去處', pets: '寵物', story: '人物故事',
};

function ssgHeroMain(a, settings) {
  if (!a) return '';
  settings = settings || {};
  /* Match JS renderHero (index.html line 575-586) output exactly so the
     post-fetch DOM swap is invisible. Priority chains mirror JS code:
       img:    settings.hero_img → article.cover_image_url
       title:  article.title_tc → settings.hero_title_tc → article.title_en
       sub:    article.excerpt_tc → settings.hero_sub_tc → article.excerpt_en
       tag:    NAV_SHORT_LABELS_TC[cat] → NAV_LONG_LABELS_TC[cat] → 'FEATURED'
       kicker: settings.hero_kicker_tc → NAV_LONG_LABELS_TC[cat] → '' */
  const img    = settings.hero_img || a.cover_image_url || '';
  const url    = `/article/${a.slug}/`;
  const title  = a.title_tc || settings.hero_title_tc || a.title_en || '';
  const sub    = a.excerpt_tc || settings.hero_sub_tc || a.excerpt_en || '';
  const catKey = a.category_key;
  const tag    = NAV_SHORT_LABELS_TC[catKey] || NAV_LONG_LABELS_TC[catKey] || 'FEATURED';
  const kicker = settings.hero_kicker_tc || NAV_LONG_LABELS_TC[catKey] || '';
  return `<div class="hero-img" style="background-image: url('${cfImg(img, 1200)}')"></div><div class="hero-body"><div class="hero-top"><div class="hero-chip"><i></i>${escHtml(tag)}</div></div><div><div class="hero-kicker">${escHtml(kicker)}</div><h1 class="hero-title"><a href="${url}" style="color:inherit;text-decoration:none;">${escHtml(title)}</a></h1><p class="hero-sub">${escHtml(sub)}</p></div></div>`;
}

function ssgHeroSide(articles) {
  return articles.map((a, i) => {
    const title = a.title_tc || a.title_en || '';
    const img   = a.cover_image_url || '';
    const date  = fmtDate(a.published_at);
    return `<a class="side-card" href="/article/${a.slug}/"><div class="side-thumb" style="background-image: url('${cfImg(img, 400)}')"><div class="side-thumb-num">${String(i + 1).padStart(2, '0')}</div></div><div class="side-body"><div class="side-tag">${escHtml(a.category_key || '')}</div><div class="side-title">${escHtml(title)}</div><div class="side-meta">${escHtml(date)}</div></div></a>`;
  }).join('');
}

function ssgStoryCard(a) {
  const title   = a.title_tc || a.title_en || '';
  const excerpt = a.excerpt_tc || a.excerpt_en || '';
  const img     = a.cover_image_url || '';
  return `<a class="story-card" href="/article/${a.slug}/"><div class="story-img" style="background-image:url('${cfImg(img, 800)}')"></div><div class="story-body"><div class="story-tag">${escHtml(a.category_key || '')}</div><h3 class="story-quote">${escHtml(title)}</h3><p class="story-excerpt">${escHtml(excerpt)}</p></div></a>`;
}

async function generateHomepageSSG(articles) {
  /* Fetch site_settings + hot_searches in parallel for hero / picks / story /
     featured-order config and hot search pills SSG. */
  const [{ data: settings }, { data: hotSearches }] = await Promise.all([
    supabase.from('site_settings').select('*'),
    supabase.from('hot_searches').select('keyword_tc, keyword_en, sort_order').eq('active', true).order('sort_order'),
  ]);
  const map = {};
  (settings || []).forEach(s => { map[s.key] = s; });

  const bySlug = {};
  articles.forEach(a => { bySlug[a.slug] = a; });

  function slugListFromSetting(key) {
    const val = map[key]?.value_tc;
    if (!val) return [];
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }

  /* Hero article + side articles */
  const heroSlug   = (map.hero_article_slug?.value_tc || '').trim();
  const heroArticle = heroSlug ? bySlug[heroSlug] : null;
  const sideSlugs  = slugListFromSetting('homepage_side_slugs').slice(0, 3);
  const sideArts   = sideSlugs.map(s => bySlug[s]).filter(Boolean);

  /* Editor's picks: explicit slugs, else featured=true sorted by featured_order */
  const picksSlugs = slugListFromSetting('homepage_picks_slugs');
  let picksArts;
  if (picksSlugs.length) {
    picksArts = picksSlugs.map(s => bySlug[s]).filter(Boolean).slice(0, 6);
  } else {
    const order = slugListFromSetting('featured_order');
    picksArts = articles
      .filter(a => a.featured)
      .slice()
      .sort((a, b) => {
        const ia = order.indexOf(a.slug);
        const ib = order.indexOf(b.slug);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      })
      .slice(0, 6);
  }

  /* Stories */
  const storySlugs = slugListFromSetting('homepage_story_slugs').slice(0, 3);
  const storyArts  = storySlugs.map(s => bySlug[s]).filter(Boolean);

  /* News (category=news, top 3) */
  const newsArts = articles.filter(a => a.category_key === 'news').slice(0, 3);

  /* Latest: 3 most recent (excluding hero) */
  const latestArts = articles
    .filter(a => a.slug !== heroSlug)
    .slice(0, 3);

  /* Category sections: group by primary + secondary categories */
  const NAV_KEYS = ['visa','biz','house','culture','tax','life','places','pets','story'];
  const NAV_LABELS_TC = {
    visa: '簽證・在留資格', biz: '創業・工作', house: '住屋', culture: '文化',
    tax: '稅務・保險・年金', life: '生活', places: '好去處', pets: '寵物', story: '人物故事'
  };
  const byCat = {};
  function pushTo(k, a) {
    if (!k) return;
    if (!byCat[k]) byCat[k] = [];
    if (!byCat[k].some(x => x.id === a.id)) byCat[k].push(a);
  }
  articles.forEach(a => {
    pushTo(a.category_key, a);
    (a.category_keys || []).forEach(k => pushTo(k, a));
  });
  const catSectionsHtml = NAV_KEYS.map(key => {
    const arts = (byCat[key] || []).slice(0, 3);
    if (!arts.length) return '';
    const title = NAV_LABELS_TC[key] || key;
    return `<section class="section"><div class="container"><div class="section-head"><div><div class="section-eyebrow">— ${escHtml(title)}</div><h2 class="section-title">${escHtml(title)}</h2></div><div class="section-actions"><a class="link-more" href="/${key}/">查看全部 →</a></div></div><div class="article-grid">${arts.map(a => ssgCardHTML(a)).join('')}</div></div></section>`;
  }).join('');

  /* Browse Categories grid — use REAL counts from articles, no stale
     placeholders. Crawlers see all 10 category names + accurate counts. */
  const CAT_META = [
    { key: 'news',    tc: '新聞・資訊',         en: 'News & Updates' },
    { key: 'visa',    tc: '簽證・在留資格',     en: 'Visa & Residency' },
    { key: 'biz',     tc: '創業・工作',         en: 'Business & Work' },
    { key: 'house',   tc: '住屋',               en: 'Housing' },
    { key: 'culture', tc: '文化',               en: 'Culture' },
    { key: 'tax',     tc: '稅務・保險・年金',   en: 'Tax, Insurance & Pension' },
    { key: 'life',    tc: '生活',               en: 'Life' },
    { key: 'places',  tc: '好去處',             en: 'Leisure' },
    { key: 'pets',    tc: '寵物',               en: 'Pets in Japan' },
    { key: 'story',   tc: '人物故事',           en: 'Stories' },
  ];
  const catsGridHtml = CAT_META.map(c => {
    const count = (byCat[c.key] || []).length;
    return `<div class="cat"><a class="cat-link" href="/${c.key}/"><span class="cat-count">${count || ''}</span><div class="cat-icon"></div><div class="cat-labels"><div class="cat-label-tc">${escHtml(c.tc)}</div><div class="cat-label-en">${escHtml(c.en)}</div></div></a></div>`;
  }).join('');

  /* Hero image preload — lets the browser start downloading the LCP image
     immediately from <head>, without waiting for JS + Supabase API. */
  const heroImg = heroArticle ? (heroArticle.cover_image_url || '') : '';
  const heroPreloadHtml = heroImg
    ? `<link rel="preload" as="image" href="${cfImg(heroImg, 1200)}" fetchpriority="high">`
    : '';

  /* Build all the section HTML strings */
  const heroMainHtml   = ssgHeroMain(heroArticle, {
    hero_img:       map.hero_img?.value_tc       || '',
    hero_kicker_tc: map.hero_kicker?.value_tc    || '',
    hero_title_tc:  map.hero_title?.value_tc     || '',
    hero_sub_tc:    map.hero_sub?.value_tc       || '',
  });
  const heroSideHtml   = ssgHeroSide(sideArts);
  const editorHtml     = picksArts.map(a => ssgCardHTML(a, { overlay: true })).join('');
  const newsHtml       = newsArts.map(a => ssgCardHTML(a)).join('');
  const latestHtml     = latestArts.map(a => ssgCardHTML(a)).join('');
  const storiesHtml    = storyArts.map(a => ssgStoryCard(a)).join('');
  const hotPillsHtml   = (hotSearches || [])
    .map((p, i) => `<button class="pill"><span class="rank">${String(p.sort_order || i + 1).padStart(2, '0')}</span>${escHtml(p.keyword_tc || p.keyword_en || '')}</button>`)
    .join('');

  /* Inject into index.html — fill containers wrapped in SSG marker comments.
     Markers make re-runs idempotent (e.g., if a previous build left content)
     and unambiguous when the inner content contains nested HTML.
     JS still overwrites these containers at runtime when applySettings fires,
     so real users get the dynamic experience; crawlers get the SSG content. */
  let html = fs.readFileSync('index.html', 'utf8');
  function injectBetween(name, openTag, closeTag, inner) {
    const startMarker = `<!-- SSG:${name}:start -->`;
    const endMarker   = `<!-- SSG:${name}:end -->`;
    const re = new RegExp(startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const replacement = `${startMarker}${openTag}${inner}${closeTag}${endMarker}`;
    if (re.test(html)) {
      html = html.replace(re, replacement);
    } else {
      console.warn(`⚠️  SSG marker not found in index.html: ${name}`);
    }
  }
  injectBetween('heroPreload', '', '', heroPreloadHtml);
  injectBetween('heroMain',  '<article class="hero-main" id="heroMain">', '</article>', heroMainHtml);
  injectBetween('heroSide',  '<aside class="hero-side" id="heroSide">',   '</aside>',   heroSideHtml);
  injectBetween('catsGrid',  '<div class="cats" id="catsGrid">',          '</div>',     catsGridHtml);
  injectBetween('editor',    '<div class="article-grid" id="editorGrid">', '</div>',   editorHtml);
  injectBetween('news',      '<div class="article-grid" id="newsGrid">',   '</div>',   newsHtml);
  injectBetween('stories',   '<div class="stories" id="storiesGrid">',     '</div>',   storiesHtml);
  injectBetween('latest',    '<div class="article-grid" id="latestGrid">', '</div>',   latestHtml);
  injectBetween('catSections','<div id="catArticleSections">',             '</div>',   catSectionsHtml);
  injectBetween('hotPills',  '<div class="hot-pills" id="hotPills">',      '</div>',   hotPillsHtml);

  fs.writeFileSync('index.html', html, 'utf8');
  console.log(`✓ 首頁 SSG 完成：hero + side(${sideArts.length}) + picks(${picksArts.length}) + news(${newsArts.length}) + stories(${storyArts.length}) + latest(${latestArts.length}) + hotPills(${(hotSearches||[]).length}) + ${NAV_KEYS.length} cat sections`);
}

build().catch(err => { console.error('❌ Build 失敗:', err); process.exit(1); });
