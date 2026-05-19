/* IsshoHub Preview Guard — password-protect site before launch */
(function () {
  var COOKIE = 'isshohub_preview';
  var PASS   = 'yuji0209';

  function getCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? m.pop() : '';
  }
  function setCookie(name, value, days) {
    var exp = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + value + ';expires=' + exp + ';path=/;SameSite=Lax';
  }
  function unlock() {
    setCookie(COOKIE, 'ok', 30);
    var overlay = document.getElementById('_preview_guard');
    if (overlay) overlay.remove();
    document.documentElement.style.visibility = '';
  }

  /* Already unlocked via cookie */
  if (getCookie(COOKIE) === 'ok') return;

  /* Hide page immediately to prevent flash */
  document.documentElement.style.visibility = 'hidden';

  /* Check if logged-in admin → auto-unlock */
  function checkAdmin() {
    var auth = window.IsshoAuth;
    if (!auth) return false;
    auth.getUser().then(function (user) {
      if (!user) return showOverlay();
      auth.getProfile(user.id).then(function (res) {
        if (res && res.data && res.data.role === 'admin') {
          unlock();
        } else {
          showOverlay();
        }
      }).catch(showOverlay);
    }).catch(showOverlay);
    return true;
  }

  /* Wait for IsshoAuth to load (loaded via supabase-client.js) */
  var _attempts = 0;
  function waitForAuth() {
    if (checkAdmin()) return;
    _attempts++;
    if (_attempts < 20) {
      setTimeout(waitForAuth, 150);
    } else {
      showOverlay();
    }
  }

  function showOverlay() {
    document.documentElement.style.visibility = '';
    if (document.getElementById('_preview_guard')) return;

    var el = document.createElement('div');
    el.id = '_preview_guard';
    el.innerHTML = [
      '<style>',
      '#_preview_guard{position:fixed;inset:0;z-index:99999;background:#0a1a31;',
      'display:flex;align-items:center;justify-content:center;font-family:sans-serif;}',
      '._pg_box{background:#fff;border-radius:16px;padding:40px 36px;width:100%;max-width:380px;',
      'margin:16px;box-shadow:0 8px 40px rgba(0,0,0,.4);text-align:center;}',
      '._pg_logo{font-size:22px;font-weight:800;color:#0a1a31;letter-spacing:-.5px;margin-bottom:6px;}',
      '._pg_sub{font-size:13px;color:#888;margin-bottom:28px;}',
      '._pg_inp{width:100%;padding:13px 16px;border:1.5px solid #e0ddd6;border-radius:10px;',
      'font-size:16px;outline:none;box-sizing:border-box;text-align:center;letter-spacing:.1em;}',
      '._pg_inp:focus{border-color:#378add;}',
      '._pg_btn{margin-top:12px;width:100%;padding:14px;background:#0a1a31;color:#fff;',
      'border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;}',
      '._pg_btn:hover{background:#378add;}',
      '._pg_err{margin-top:10px;font-size:13px;color:#c0392b;min-height:18px;}',
      '</style>',
      '<div class="_pg_box">',
      '<div class="_pg_logo">IsshoHub</div>',
      '<div class="_pg_sub">Preview — 請輸入密碼</div>',
      '<input class="_pg_inp" id="_pg_input" type="password" placeholder="密碼" autocomplete="off">',
      '<button class="_pg_btn" id="_pg_btn">進入</button>',
      '<div class="_pg_err" id="_pg_err"></div>',
      '</div>',
    ].join('');
    document.body.appendChild(el);

    function attempt() {
      var val = document.getElementById('_pg_input').value;
      if (val === PASS) {
        unlock();
      } else {
        document.getElementById('_pg_err').textContent = '密碼錯誤，請再試。';
        document.getElementById('_pg_input').value = '';
        document.getElementById('_pg_input').focus();
      }
    }
    document.getElementById('_pg_btn').addEventListener('click', attempt);
    document.getElementById('_pg_input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') attempt();
    });
    document.getElementById('_pg_input').focus();
  }

  /* Start auth check after DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForAuth);
  } else {
    waitForAuth();
  }
})();
