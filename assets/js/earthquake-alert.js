/* IsshoHub — JMA Earthquake Alert (震度4以上) */
(function () {
  'use strict';

  var FEED_URL       = 'https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml';
  var POLL_MS        = 5 * 60 * 1000;   // poll every 5 minutes
  var LOOK_BACK_MS   = 2 * 60 * 60 * 1000; // only entries within last 2 hours
  var HIGH_INT       = new Set(['3', '4', '5-', '5+', '6-', '6+', '7']);
  var INT_LABEL      = { '3':'３', '4':'４', '5-':'５弱', '5+':'５強', '6-':'６弱', '6+':'６強', '7':'７' };

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

  /* Track which alerts have already been shown this session */
  var _shown;
  try { _shown = new Set(JSON.parse(sessionStorage.getItem('eq_shown') || '[]')); }
  catch(e) { _shown = new Set(); }

  function saveShown() {
    try { sessionStorage.setItem('eq_shown', JSON.stringify(Array.from(_shown))); } catch(e){}
  }

  /* Inject banner HTML once */
  function ensureBanner() {
    if (document.getElementById('eqAlertBanner')) return;
    var el = document.createElement('div');
    el.id = 'eqAlertBanner';
    el.className = 'eq-alert';
    el.style.display = 'none';
    document.body.insertBefore(el, document.body.firstChild);
  }

  function showBanner(info) {
    ensureBanner();
    var banner = document.getElementById('eqAlertBanner');
    var lang   = document.body.dataset.lang || 'tc';
    var intLbl = INT_LABEL[info.intensity] || info.intensity;
    var dt     = new Date(info.time);
    var timeStr = isNaN(dt) ? '' : dt.toLocaleTimeString(lang === 'tc' ? 'zh-Hant' : 'en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }) + ' JST';

    var titleTC = '⚠ 地震速報　最大震度 ' + intLbl;
    var titleEN = '⚠ Earthquake Alert　Max Intensity ' + intLbl;
    var regionTC = translateRegion(info.region, 'tc');
    var regionEN = translateRegion(info.region, 'en');
    var subTC   = (regionTC ? regionTC + '　' : '') + timeStr;
    var subEN   = (regionEN ? regionEN + '　' : '') + timeStr;
    var linkLbl = lang === 'tc' ? '氣象庁詳情 →' : 'JMA Details →';

    banner.innerHTML =
      '<div class="eq-alert-inner">' +
        '<div class="eq-alert-badge">震度 ' + intLbl + '</div>' +
        '<div class="eq-alert-text">' +
          '<strong>' + (lang === 'tc' ? titleTC : titleEN) + '</strong>' +
          '<span>' + (lang === 'tc' ? subTC : subEN) + '</span>' +
        '</div>' +
        '<a class="eq-alert-link" href="https://www.jma.go.jp/bosai/map.html#5/34.5/137/&elem=int&contents=earthquake" target="_blank" rel="noopener">' + linkLbl + '</a>' +
        '<button class="eq-alert-close" id="eqAlertClose" aria-label="Close">✕</button>' +
      '</div>';

    banner.style.display = '';
    document.getElementById('eqAlertClose').addEventListener('click', function () {
      banner.style.display = 'none';
    });
  }

  /* Fetch and parse one detail XML to get MaxInt + region + time */
  function fetchDetail(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) return null;
      return r.text();
    }).then(function (text) {
      if (!text) return null;
      var doc = new DOMParser().parseFromString(text, 'text/xml');
      var maxIntEl  = doc.querySelector('MaxInt');
      var timeEl    = doc.querySelector('ReportDateTime');
      /* Region: first prefecture with max intensity */
      var prefNameEl = doc.querySelector('Intensity Observation Pref Name');
      return {
        intensity: maxIntEl  ? maxIntEl.textContent.trim()  : null,
        time:      timeEl    ? timeEl.textContent.trim()    : '',
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

      /* Filter: 震度速報 only, within look-back window, not yet shown */
      var candidates = entries.filter(function (e) {
        var title   = (e.querySelector('title') || {}).textContent || '';
        var updated = (e.querySelector('updated') || {}).textContent || '';
        var id      = (e.querySelector('id') || {}).textContent || '';
        return title === '震度速報' &&
               (now - new Date(updated).getTime()) < LOOK_BACK_MS &&
               !_shown.has(id);
      }).slice(0, 3); /* check at most 3 most recent */

      /* Process candidates sequentially until one qualifies */
      (function next(i) {
        if (i >= candidates.length) return;
        var entry   = candidates[i];
        var id      = (entry.querySelector('id') || {}).textContent || '';
        var linkEl  = entry.querySelector('link');
        var linkUrl = linkEl ? (linkEl.getAttribute('href') || '') : '';
        if (!linkUrl) { next(i + 1); return; }

        fetchDetail(linkUrl).then(function (detail) {
          if (detail && HIGH_INT.has(detail.intensity)) {
            _shown.add(id);
            saveShown();
            showBanner(detail);
          } else {
            next(i + 1);
          }
        });
      })(0);
    }).catch(function () {});
  }

  /* Boot */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { ensureBanner(); checkFeed(); });
  } else {
    ensureBanner();
    checkFeed();
  }
  setInterval(checkFeed, POLL_MS);
})();
