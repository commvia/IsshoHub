/* IsshoHub — JMA Earthquake Alert (震度4以上) */
(function () {
  'use strict';

  var FEED_URL       = 'https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml';
  var POLL_MS        = 5 * 60 * 1000;   // poll every 5 minutes
  var LOOK_BACK_MS   = 2 * 60 * 60 * 1000; // only entries within last 2 hours
  var HIGH_INT       = new Set(['4', '5-', '5+', '6-', '6+', '7']);
  var INT_LABEL      = { '4':'４', '5-':'５弱', '5+':'５強', '6-':'６弱', '6+':'６強', '7':'７' };

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
    var subTC   = (info.region ? info.region + '　' : '') + timeStr;
    var subEN   = (info.region ? info.region + '　' : '') + timeStr;
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
