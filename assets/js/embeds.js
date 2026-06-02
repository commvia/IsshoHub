/* embeds.js — lazy-load social embed scripts when blockquotes scroll near viewport.
   Why this exists: inline-editor.js strips <script>/attributes for security, so
   user-pasted embed code loses what it needs to render. build.js's md() auto-
   converts standalone social URLs to embed blockquotes; this script then loads
   the platform's official renderer ONLY when the user is about to see the embed
   (Intersection Observer, 500px rootMargin) — avoids the 200-500KB hit on FCP/LCP.
*/
(function() {
  'use strict';

  var PLATFORMS = [
    { name: 'instagram', sel: '.instagram-media',                src: 'https://www.instagram.com/embed.js' },
    { name: 'twitter',   sel: '.twitter-tweet,.twitter-timeline', src: 'https://platform.twitter.com/widgets.js' },
    { name: 'threads',   sel: '.text-post-media',                src: 'https://www.threads.net/embed.js' },
    { name: 'facebook',  sel: '.fb-post,.fb-video,.fb-page',     src: 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0' }
  ];

  var loaded = {};

  function loadScript(p) {
    if (loaded[p.name]) return;
    loaded[p.name] = true;
    if (p.name === 'facebook' && !document.getElementById('fb-root')) {
      var fbRoot = document.createElement('div');
      fbRoot.id = 'fb-root';
      document.body.appendChild(fbRoot);
    }
    var s = document.createElement('script');
    s.async = true;
    s.src = p.src;
    if (p.name === 'facebook') s.crossOrigin = 'anonymous';
    document.body.appendChild(s);
  }

  function watch(p, els) {
    if (!('IntersectionObserver' in window)) {
      /* Old browser fallback: just load immediately. */
      loadScript(p);
      return;
    }
    var io = new IntersectionObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          loadScript(p);
          io.disconnect();
          return;
        }
      }
    }, { rootMargin: '500px 0px' });
    for (var j = 0; j < els.length; j++) io.observe(els[j]);
  }

  function detect() {
    PLATFORMS.forEach(function(p) {
      try {
        var els = document.querySelectorAll(p.sel);
        if (els.length) watch(p, els);
      } catch (_) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detect);
  } else {
    detect();
  }
})();
