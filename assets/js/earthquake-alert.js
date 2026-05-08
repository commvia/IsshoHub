/* IsshoHub — JMA Earthquake Alert (震度3以上 → topbar 顯示) */
(function () {
  'use strict';

  var FEED_URL      = '/api/jma-feed';
  var POLL_MS       = 5 * 60 * 1000;        // poll every 5 minutes
  var LOOK_BACK_MS  = 2 * 60 * 60 * 1000;  // entries within last 2 hours
  var HIDE_AFTER_MS = 24 * 60 * 60 * 1000; // hide 24 h after last alert
  var CYCLE_MS      = 5 * 1000;            // rotate alerts every 5 seconds
  var HIGH_INT      = new Set(['3', '4', '5-', '5+', '6-', '6+', '7']);
  var INT_LABEL     = { '3':'３', '4':'４', '5-':'５弱', '5+':'５強', '6-':'６弱', '6+':'６強', '7':'７' };

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

  /* Hypocenter area translation (Japanese → TC / EN) */
  var HYPO_TC = {
    /* 灣（湾→灣） */
    '東京湾':'東京灣','相模湾':'相模灣','駿河湾':'駿河灣','伊勢湾':'伊勢灣',
    '大阪湾':'大阪灣','富山湾':'富山灣','若狭湾':'若狹灣','陸奥湾':'陸奧灣',
    /* 沖繩 */
    '沖縄本島近海':'沖繩本島近海','沖縄本島北西沖':'沖繩本島西北沖',
    '沖縄本島南方沖':'沖繩本島南方沖','沖縄本島西方沖':'沖繩本島西方沖',
    '与那国島近海':'与那國島近海','宮古島近海':'宮古島近海',
    '宮古島北西沖':'宮古島西北沖','石垣島近海':'石垣島近海',
    '石垣島北西沖':'石垣島西北沖','沖縄トラフ':'沖繩海槽',
    /* 瀨戶內海 */
    '瀬戸内海':'瀨戶內海',
    /* 豊後水道 */
    '豊後水道':'豐後水道',
    /* 千島列島 */
    '択捉島沖':'擇捉島沖','国後島沖':'國後島沖',
    '色丹島沖':'色丹島沖','歯舞群島沖':'齒舞群島沖',
    /* 龍（竜→龍） */
    '竜飛崎沖':'龍飛崎沖',
    /* 廣（広→廣） */
    '広尾沖':'廣尾沖',
  };
  var HYPO_EN = {
    /* Okinawa */
    '沖縄本島近海':'Near Okinawa','沖縄本島北西沖':'NW of Okinawa',
    '沖縄本島南方沖':'S of Okinawa','沖縄本島西方沖':'W of Okinawa',
    '与那国島近海':'Near Yonaguni Island','石垣島近海':'Near Ishigaki Island',
    '石垣島北西沖':'NW of Ishigaki Island','宮古島近海':'Near Miyako Islands',
    '宮古島北西沖':'NW of Miyako Islands','沖縄トラフ':'Okinawa Trough',
    /* Ryukyu / Kagoshima */
    '吐噶喇列島近海':'Near Tokara Islands','奄美大島近海':'Near Amami-Oshima',
    '奄美大島北東沖':'NE of Amami-Oshima','種子島近海':'Near Tanegashima',
    '屋久島近海':'Near Yakushima','薩摩半島西方沖':'W of Satsuma Peninsula',
    '大隅半島東方沖':'E of Osumi Peninsula','トカラ列島近海':'Near Tokara Islands',
    /* Kyushu */
    '日向灘':'Hyuga-nada Sea','豊後水道':'Bungo Channel','有明海':'Ariake Sea',
    '熊本県熊本地方':'Kumamoto area','阿蘇山':'Near Mt. Aso',
    '大分県中部':'Central Oita','大分県西部':'W Oita',
    /* Kinki / Tokai */
    '紀伊水道':'Kii Channel','熊野灘':'Kumano-nada Sea','遠州灘':'Enshu-nada Sea',
    '駿河湾':'Suruga Bay','駿河湾南部':'S Suruga Bay',
    '相模湾':'Sagami Bay','伊勢湾':'Ise Bay','東京湾':'Tokyo Bay',
    '大阪湾':'Osaka Bay','瀬戸内海':'Seto Inland Sea',
    /* Kanto offshore */
    '千葉県東方沖':'E off Chiba','千葉県北西部':'NW Chiba',
    '茨城県沖':'Off Ibaraki','茨城県北部':'N Ibaraki','茨城県南部':'S Ibaraki',
    '神奈川県西部':'W Kanagawa','東京都23区':'Tokyo (23 wards)',
    /* Tohoku offshore */
    '福島県沖':'Off Fukushima','宮城県沖':'Off Miyagi','岩手県沖':'Off Iwate',
    '三陸沖':'Off Sanriku','青森県東方沖':'E off Aomori',
    '宮城県北部':'N Miyagi','福島県中通り':'Central Fukushima',
    /* Hokkaido */
    '根室半島南東沖':'SE of Nemuro Peninsula','十勝沖':'Off Tokachi',
    '浦河沖':'Off Urakawa','日高地方':'Hidaka','胆振地方中東部':'E-central Iburi',
    '石狩地方南部':'S Ishikari','函館沖':'Off Hakodate','釧路沖':'Off Kushiro',
    '広尾沖':'Off Hiroo','日本海北部':'N Sea of Japan',
    /* Kurils */
    '択捉島沖':'Off Etorofu Island','国後島沖':'Off Kunashiri Island',
    '色丹島沖':'Off Shikotan Island','歯舞群島沖':'Off Habomai Islands',
    /* Sea of Japan side */
    '秋田県沖':'Off Akita','山形県沖':'Off Yamagata',
    '新潟県上越地方':'Joetsu, Niigata','新潟県中越':'Chuetsu, Niigata',
    '新潟県中越沖':'Off Chuetsu, Niigata','能登半島沖':'Off Noto Peninsula',
    '富山湾':'Toyama Bay','若狭湾':'Wakasa Bay','島根県沖':'Off Shimane',
    /* Inland */
    '長野県北部':'N Nagano','長野県南部':'S Nagano','長野県中部':'Central Nagano',
    '岐阜県飛騨地方':'Hida, Gifu','山梨県東部・富士五湖':'E Yamanashi / Fuji Five Lakes',
    '静岡県西部':'W Shizuoka','静岡県中部':'Central Shizuoka',
    '和歌山県北部':'N Wakayama','和歌山県南部':'S Wakayama',
    '陸奥湾':'Mutsu Bay','青森県三八上北地方':'Sanpachi-Kamikita, Aomori',
  };

  function translateHypo(jpName, lang) {
    if (!jpName) return '';
    return lang === 'en' ? (HYPO_EN[jpName] || jpName) : (HYPO_TC[jpName] || jpName);
  }

  /* Alert state */
  var alerts     = [];   /* active alerts, newest first: { intensity, time, region, shownAt } */
  var cycleIdx   = 0;    /* which alert is currently shown */
  var cycleTimer = null;

  function pruneAlerts() {
    var now = Date.now();
    alerts = alerts.filter(function (a) { return (now - a.shownAt) < HIDE_AFTER_MS; });
  }

  function hideTopbar() {
    var el  = document.getElementById('eqTopbar');
    var sep = document.querySelector('.eq-topbar-sep');
    if (el)  el.style.display = 'none';
    if (sep) sep.style.display = 'none';
    if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
    alerts   = [];
    cycleIdx = 0;
  }

  function renderCurrent() {
    if (!alerts.length) return;
    var a   = alerts[cycleIdx];
    var el  = document.getElementById('eqTopbar');
    var sep = document.querySelector('.eq-topbar-sep');
    if (!el) return;

    var lang    = document.body.dataset.lang || 'tc';
    var intLbl  = INT_LABEL[a.intensity] || a.intensity;
    var region  = translateRegion(a.region, lang === 'en' ? 'en' : 'tc');
    var dt      = new Date(a.time);
    var timeStr = isNaN(dt.getTime()) ? '' :
      dt.toLocaleTimeString(lang === 'tc' ? 'zh-Hant' : 'en-US',
        { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });

    /* show (1/2) counter only when multiple alerts are active */
    var prefix = alerts.length > 1 ? '(' + (cycleIdx + 1) + '/' + alerts.length + ') ' : '';

    var hypo     = a.hypo ? translateHypo(a.hypo, lang === 'en' ? 'en' : 'tc') : '';
    var location = hypo
      ? hypo + (region ? '（' + region + '）' : '')
      : region;
    var text = lang === 'en'
      ? '⚠ ' + prefix + 'Earthquake Intensity ' + intLbl + (location ? ' · ' + location : '') + (timeStr ? ' ' + timeStr : '')
      : '⚠ ' + prefix + '地震速報 震度' + intLbl + (location ? ' · ' + location : '') + (timeStr ? ' ' + timeStr : '');

    el.textContent = text;
    el.style.display = '';
    el.style.color = '#fbbf24';
    el.style.fontWeight = '600';
    if (sep) sep.style.display = '';
  }

  function startCycle() {
    if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
    if (alerts.length <= 1) return;
    cycleTimer = setInterval(function () {
      cycleIdx = (cycleIdx + 1) % alerts.length;
      renderCurrent();
    }, CYCLE_MS);
  }

  function addAlert(info) {
    /* use originTime as event key; fall back to reportTime if absent */
    var key = info.originTime || info.time;
    var existing = alerts.find(function (a) { return a.key === key; });
    if (existing) {
      /* update hypocenter name if the newer report has it */
      if (info.hypo) existing.hypo = info.hypo;
    } else {
      alerts.unshift({ key: key, intensity: info.intensity, time: info.time, region: info.region, hypo: info.hypo || '', shownAt: Date.now() });
    }
  }

  function showInTopbar(info) {
    if (info) addAlert(info);
    pruneAlerts();
    if (!alerts.length) { hideTopbar(); return; }
    cycleIdx = 0;
    renderCurrent();
    startCycle();
  }

  /* Fetch and parse one detail XML */
  function fetchDetail(url) {
    return fetch('/api/jma-detail?url=' + encodeURIComponent(url)).then(function (r) {
      if (!r.ok) return null;
      return r.text();
    }).then(function (text) {
      if (!text) return null;
      var doc = new DOMParser().parseFromString(text, 'text/xml');
      var maxIntEl    = doc.querySelector('MaxInt');
      var originEl    = doc.querySelector('OriginTime');
      var reportEl    = doc.querySelector('ReportDateTime');
      var prefNameEl  = doc.querySelector('Intensity Observation Pref Name');
      var hypoEl      = doc.querySelector('Hypocenter Area Name');
      return {
        intensity:  maxIntEl   ? maxIntEl.textContent.trim()   : null,
        originTime: originEl   ? originEl.textContent.trim()   : '',
        time:       reportEl   ? reportEl.textContent.trim()   : '',
        region:     prefNameEl ? prefNameEl.textContent.trim() : '',
        hypo:       hypoEl     ? hypoEl.textContent.trim()     : '',
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
        return (title === '震度速報' || title === '震源・震度情報') &&
               (now - new Date(updated).getTime()) < LOOK_BACK_MS;
      }).slice(0, 5);

      (function next(i) {
        if (i >= candidates.length) {
          /* No new qualifying earthquake — prune old alerts, hide if none left */
          pruneAlerts();
          if (!alerts.length) hideTopbar();
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

  /* Re-render current alert when user switches language */
  function registerLangListener() {
    if (window.IsshoCore && window.IsshoCore.onLangChange) {
      window.IsshoCore.onLangChange(function () {
        if (alerts.length) renderCurrent();
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerLangListener);
  } else {
    registerLangListener();
  }
})();
