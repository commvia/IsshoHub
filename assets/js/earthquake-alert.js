/* IsshoHub — JMA Earthquake Alert (震度3以上 → topbar 顯示) */
(function () {
  'use strict';

  var FEED_URL     = 'https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml';
  var POLL_MS      = 5 * 60 * 1000;        // poll every 5 minutes
  var LOOK_BACK_MS = 2 * 60 * 60 * 1000;  // entries within last 2 hours
  var HIGH_INT     = new Set(['3', '4', '5-', '5+', '6-', '6+', '7']);
  var INT_LABEL    = { '3':'３', '4':'４', '5-':'５弱', '5+':'５強', '6-':'６弱', '6+':'６強', '7':'７' };

  /* Prefecture name translation (Japanese → TC / EN) */
  var PREF_TC = {
    '北海道':'北海道','青森県':'青森縣','岩手県':'岩手縣','宮城県':'宮城縣','秋田県':'秋田縣',
    '山形県':'山形縣','福島県':'福島縣','茨城県':'茨城縣','栃木県':'栃木縣','群馬県':'群馬縣',
    '埼玉県':'埼玉縣','千葉県':'千葉縣','東京都':'東京都','神奈川県':'神奈川縣','新潟県':'新潟縣',
    '富山県':'富山縣','石川県':'石川縣','福井県':'福井縣','山梨県':'山梨縣','長野県':'長野縣',
    '岐阜県':'岐阜縣','静岡県':'靜岡縣','愛知県':'愛知縣','三重県':'三重縣','滋賀県':'滋賀縣',
    '京都府':'京都府','大阪府':'大阪府','兵庫県':'兵庫縣','奈良県':'奈良縣','和歌山県':'和歌山縣',
    '鳥取県':'鳥取縣','島根県':'島根縣','岡山県':'岡山縣','広島県':'廣島縣','山口県':'山口縣',
    '徳島県':'德島縣','香川県':'香川縣','愛媛県':'愛媛縣','高知県':'高知縣','福岡県':'福岡縣',
    '佐賀県':'佐賀縣','長崎県':'長崎縣','熊本県':'熊本縣','大分県':'大分縣','宮崎県':'宮崎縣',
    '鹿児島県':'鹿兒島縣','沖縄県':'沖繩縣'
  };
  var PREF_EN = {
    '北海道':'Hokkaido','青森県':'Aomori','岩手県':'Iwate','宮城県':'Miyagi','秋田県':'Akita',
    '山形県':'Yamagata','福島県':'Fukushima','茨城県':'Ibaraki','栃木県':'Tochigi','群馬県':'Gunma',
    '埼玉県':'Saitama','千葉県':'Chiba','東京都':'Tokyo','神奈川県':'Kanagawa','新潟県':'Niigata',
    '富山県':'Toyama','石川県':'Ishikawa','福井県':'Fukui','山梨県':'Yamanashi','長野県':'Nagano',
    '岐阜県':'Gifu','静岡県':'Shizuoka','愛知県':'Aichi','三重県':'Mie','滋賀県':'Shiga',
    '京都府':'Kyoto','大阪府':'Osaka','兵庫県':'Hyogo','奈良県':'Nara','和歌山県':'Wakayama',
    '鳥取県':'Tottori','島根県':'Shimane','岡山県':'Okayama','広島県':'Hiroshima','山口県':'Yamaguchi',
    '徳島県':'Tokushima','香川県':'Kagawa','愛媛県':'Ehime','高知県':'Kochi','福岡県':'Fukuoka',
    '佐賀県':'Saga','長崎県':'Nagasaki','熊本県':'Kumamoto','大分県':'Oita','宮崎県':'Miyazaki',
    '鹿児島県':'Kagoshima','沖縄県':'Okinawa'
  };

  function translateRegion(jpName, lang) {
    if (!jpName) return '';
    return lang === 'en' ? (PREF_EN[jpName] || jpName) : (PREF_TC[jpName] || jpName);
  }

  var lastInfo      = null; /* remember last alert so lang-switch can re-render */
  var lastAlertTime = 0;   /* timestamp when alert was last refreshed */
  var HIDE_AFTER_MS = 24 * 60 * 60 * 1000; /* hide 24 h after last earthquake */

  function hideTopbar() {
    var el  = document.getElementById('eqTopbar');
    var sep = document.querySelector('.eq-topbar-sep');
    if (el)  el.style.display = 'none';
    if (sep) sep.style.display = 'none';
    lastInfo      = null;
    lastAlertTime = 0;
  }

  /* Update the topbar eqTopbar span */
  function showInTopbar(info) {
    if (info) { lastInfo = info; lastAlertTime = Date.now(); }
    var el  = document.getElementById('eqTopbar');
    var sep = document.querySelector('.eq-topbar-sep');
    if (!el) return;

    var lang   = document.body.dataset.lang || 'tc';
    var intLbl = INT_LABEL[lastInfo.intensity] || lastInfo.intensity;
    var region = translateRegion(lastInfo.region, lang === 'en' ? 'en' : 'tc');
    var dt     = new Date(lastInfo.time);
    var timeStr = isNaN(dt.getTime()) ? '' :
      dt.toLocaleTimeString(lang === 'tc' ? 'zh-Hant' : 'en-US',
        { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });

    var text = lang === 'en'
      ? '⚠ Earthquake Intensity ' + intLbl + (region ? ' · ' + region : '') + (timeStr ? ' ' + timeStr : '')
      : '⚠ 地震速報 震度' + intLbl + (region ? ' · ' + region : '') + (timeStr ? ' ' + timeStr : '');

    el.textContent = text;
    el.style.display = '';
    el.style.color = '#fbbf24'; /* amber — visible on dark topbar */
    el.style.fontWeight = '600';
    if (sep) sep.style.display = '';
  }

  /* Fetch and parse one detail XML */
  function fetchDetail(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) return null;
      return r.text();
    }).then(function (text) {
      if (!text) return null;
      var doc = new DOMParser().parseFromString(text, 'text/xml');
      var maxIntEl   = doc.querySelector('MaxInt');
      var timeEl     = doc.querySelector('ReportDateTime');
      var prefNameEl = doc.querySelector('Intensity Observation Pref Name');
      return {
        intensity: maxIntEl   ? maxIntEl.textContent.trim()   : null,
        time:      timeEl     ? timeEl.textContent.trim()     : '',
        region:    prefNameEl ? prefNameEl.textContent.trim() : '',
      };
    }).catch(function () { return null; });
  }

  /* Main: fetch Atom feed, find qualifying 震度速報 entries */
  function checkFeed() {
    fetch(FEED_URL).then(function (r) {
      if (!r.ok) return;
      return r.text();
    }).then(function (text) {
      if (!text) return;
      var doc     = new DOMParser().parseFromString(text, 'application/xml');
      var entries = Array.from(doc.querySelectorAll('entry'));
      var now     = Date.now();

      var candidates = entries.filter(function (e) {
        var title   = (e.querySelector('title') || {}).textContent || '';
        var updated = (e.querySelector('updated') || {}).textContent || '';
        return title === '震度速報' &&
               (now - new Date(updated).getTime()) < LOOK_BACK_MS;
      }).slice(0, 3);

      (function next(i) {
        if (i >= candidates.length) {
          /* No qualifying earthquake found — hide if 24 h have elapsed */
          if (lastAlertTime && (Date.now() - lastAlertTime) >= HIDE_AFTER_MS) {
            hideTopbar();
          }
          return;
        }
        var entry   = candidates[i];
        var linkEl  = entry.querySelector('link');
        var linkUrl = linkEl ? (linkEl.getAttribute('href') || '') : '';
        if (!linkUrl) { next(i + 1); return; }

        fetchDetail(linkUrl).then(function (detail) {
          if (detail && HIGH_INT.has(detail.intensity)) {
            showInTopbar(detail);
          } else {
            next(i + 1);
          }
        });
      })(0);
    }).catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkFeed);
  } else {
    checkFeed();
  }
  setInterval(checkFeed, POLL_MS);

  /* Re-render topbar text when user switches language */
  function registerLangListener() {
    if (window.IsshoCore && window.IsshoCore.onLangChange) {
      window.IsshoCore.onLangChange(function () {
        if (lastInfo) showInTopbar(lastInfo);
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerLangListener);
  } else {
    registerLangListener();
  }
})();
