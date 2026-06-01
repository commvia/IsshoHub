/* embeds.js — lazy-load social embed scripts on demand.
   Why this exists: inline-editor.js strips <script> tags from pasted HTML for
   security (line 110), so the script tags from Instagram/X/Threads/Facebook
   official embed snippets never make it into article body_html.
   This site-provided loader detects each platform's blockquote markup and
   loads the corresponding script ONLY if needed. YouTube iframes don't need
   any script — they self-render.
*/
(function() {
  'use strict';

  var PLATFORMS = [
    { name: 'instagram', sel: '.instagram-media',           src: 'https://www.instagram.com/embed.js' },
    { name: 'twitter',   sel: '.twitter-tweet,.twitter-timeline', src: 'https://platform.twitter.com/widgets.js' },
    { name: 'threads',   sel: '.text-post-media',           src: 'https://www.threads.net/embed.js' },
    { name: 'facebook',  sel: '.fb-post,.fb-video,.fb-page', src: 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0' }
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

  function detect() {
    PLATFORMS.forEach(function(p) {
      try {
        if (document.querySelector(p.sel)) loadScript(p);
      } catch (_) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detect);
  } else {
    detect();
  }
})();
