/* IsshoHub — Members Manager (admin only) */
(function (global) {
  'use strict';

  var _members  = [];
  var _curFilter = 'all';
  var _curSearch = '';

  /* ── Fetch from Cloudflare Function ── */
  async function fetchMembers() {
    var sessionData = await window.IsshoAuth.getClient().auth.getSession();
    var token = sessionData?.data?.session?.access_token;
    if (!token) return { error: '請先登入' };

    var res = await fetch('/api/admin-members', {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    var json = await res.json();
    if (!res.ok) return { error: json.error || '載入失敗' };
    return json;
  }

  /* ── Panel HTML ── */
  function buildHTML() {
    return `
    <div class="mm-overlay" id="mmManager">
      <div class="mm-panel">
        <div class="editor-header">
          <div class="editor-header-left">
            <h2 class="editor-title">會員管理</h2>
            <span class="editor-status" id="mmStatus"></span>
          </div>
          <div class="editor-header-actions">
            <button class="editor-close" id="mmClose">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
        </div>
        <div class="mm-toolbar">
          <input type="text" id="mmSearch" class="mm-search" placeholder="搜尋 Email 或姓名…" />
          <div class="mm-filters">
            <button class="mm-filter active" data-filter="all">全部</button>
            <button class="mm-filter" data-filter="active">天書有效</button>
            <button class="mm-filter" data-filter="expired">天書到期</button>
            <button class="mm-filter" data-filter="none">未購買</button>
          </div>
        </div>
        <div id="mmSummary" class="mm-summary" style="display:none"></div>
        <div id="mmBody" class="mm-body">
          <div class="mm-loading"><div class="mm-spinner"></div><div>載入會員資料…</div></div>
        </div>
      </div>
    </div>`;
  }

  /* ── Filter + search ── */
  function getFiltered() {
    var now = new Date();
    return _members.filter(function (m) {
      /* Filter */
      if (_curFilter === 'active') {
        if (!m.driving_guide || m.driving_guide.status !== 'active') return false;
        if (new Date(m.driving_guide.expires_at) <= now) return false;
      } else if (_curFilter === 'expired') {
        if (!m.driving_guide) return false;
        if (new Date(m.driving_guide.expires_at) > now) return false;
      } else if (_curFilter === 'none') {
        if (m.driving_guide && new Date(m.driving_guide.expires_at) > now) return false;
      }
      /* Search */
      if (_curSearch) {
        var q = _curSearch.toLowerCase();
        if (!(m.email || '').toLowerCase().includes(q) &&
            !(m.name  || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  /* ── Render table ── */
  function renderTable() {
    var body = document.getElementById('mmBody');
    var filtered = getFiltered();
    var now = new Date();

    document.getElementById('mmStatus').textContent =
      filtered.length + ' / ' + _members.length + ' 位';

    if (!filtered.length) {
      body.innerHTML = '<div class="mm-empty">沒有符合條件的會員</div>';
      return;
    }

    body.innerHTML = '<table class="mm-table">'
      + '<thead><tr>'
      + '<th>Email</th><th>姓名</th><th>角色</th><th>加入日期</th>'
      + '<th>性別</th><th>國籍/地區</th><th>年齡</th><th>現居地</th>'
      + '<th>天書狀態</th>'
      + '</tr></thead><tbody>'
      + filtered.map(function (m) {
          var joined = m.joined
            ? new Date(m.joined).toLocaleDateString('zh-Hant', { year:'numeric', month:'2-digit', day:'2-digit' })
            : '—';

          var dg = m.driving_guide;
          var dgBadge;
          if (dg && dg.status === 'active' && new Date(dg.expires_at) > now) {
            var expStr = new Date(dg.expires_at).toLocaleDateString('zh-Hant', { year:'numeric', month:'2-digit', day:'2-digit' });
            dgBadge = '<span class="mm-badge mm-badge-active">✓ 有效至 ' + expStr + '</span>';
          } else if (dg) {
            dgBadge = '<span class="mm-badge mm-badge-expired">已到期</span>';
          } else {
            dgBadge = '<span class="mm-badge mm-badge-none">未購買</span>';
          }

          var roleBadge = m.role === 'admin'
            ? '<span class="mm-badge mm-badge-admin">管理員</span>'
            : '<span style="color:var(--ink-3);font-size:12px">一般</span>';

          var genderMap = { male: '男', female: '女', other: '其他' };
          var genderLabel = m.gender ? (genderMap[m.gender] || m.gender) : '<span style="color:var(--ink-3)">—</span>';

          var dim = 'style="font-size:12px;color:var(--ink-2)"';

          return '<tr>'
            + '<td class="mm-email">' + (m.email || '—') + '</td>'
            + '<td>' + (m.name || '<span style="color:var(--ink-3)">—</span>') + '</td>'
            + '<td>' + roleBadge + '</td>'
            + '<td style="white-space:nowrap;font-size:12px;color:var(--ink-2)">' + joined + '</td>'
            + '<td ' + dim + '>' + genderLabel + '</td>'
            + '<td ' + dim + '>' + (m.nationality || '<span style="color:var(--ink-3)">—</span>') + '</td>'
            + '<td ' + dim + '>' + (m.age_range   || '<span style="color:var(--ink-3)">—</span>') + '</td>'
            + '<td ' + dim + '>' + (m.ip_country  || '<span style="color:var(--ink-3)">—</span>') + '</td>'
            + '<td>' + dgBadge + '</td>'
            + '</tr>';
        }).join('')
      + '</tbody></table>';
  }

  /* ── Render summary ── */
  function renderSummary() {
    var now = new Date();
    var total    = _members.length;
    var active   = _members.filter(function (m) {
      return m.driving_guide && m.driving_guide.status === 'active' && new Date(m.driving_guide.expires_at) > now;
    }).length;
    var expired  = _members.filter(function (m) {
      return m.driving_guide && new Date(m.driving_guide.expires_at) <= now;
    }).length;
    var noPurchase = total - active - expired;

    var summary = document.getElementById('mmSummary');
    summary.style.display = 'flex';
    summary.innerHTML =
        '<div class="mm-summary-item"><span class="mm-summary-num">' + total + '</span><span>總會員</span></div>'
      + '<div class="mm-summary-item"><span class="mm-summary-num mm-num-green">' + active + '</span><span>天書有效</span></div>'
      + '<div class="mm-summary-item"><span class="mm-summary-num mm-num-red">' + expired + '</span><span>天書到期</span></div>'
      + '<div class="mm-summary-item"><span class="mm-summary-num mm-num-grey">' + noPurchase + '</span><span>未購買</span></div>';
  }

  /* ── Wire events ── */
  function wire() {
    var overlay = document.getElementById('mmManager');
    document.getElementById('mmClose').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    document.getElementById('mmSearch').addEventListener('input', function (e) {
      _curSearch = e.target.value;
      renderTable();
    });

    overlay.querySelectorAll('.mm-filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        overlay.querySelectorAll('.mm-filter').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        _curFilter = btn.getAttribute('data-filter');
        renderTable();
      });
    });
  }

  /* ── Open ── */
  async function open() {
    if (!document.getElementById('mmManager')) {
      document.body.insertAdjacentHTML('beforeend', buildHTML());
      wire();
    } else {
      /* Reset to loading state for fresh data */
      document.getElementById('mmBody').innerHTML =
        '<div class="mm-loading"><div class="mm-spinner"></div><div>載入會員資料…</div></div>';
      document.getElementById('mmSummary').style.display = 'none';
      document.getElementById('mmStatus').textContent = '';
    }

    document.getElementById('mmManager').classList.add('open');
    document.body.style.overflow = 'hidden';
    _members = [];
    _curFilter = 'all';
    _curSearch = '';

    var result = await fetchMembers();
    if (result.error) {
      document.getElementById('mmBody').innerHTML =
        '<div class="mm-empty">載入失敗：' + result.error + '</div>';
      return;
    }

    _members = result.members || [];
    renderSummary();
    renderTable();
  }

  /* ── Close ── */
  function close() {
    var el = document.getElementById('mmManager');
    if (el) el.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── Init ── */
  var _wired = false;
  function wire() {
    if (_wired) return;
    var btn = document.getElementById('adminMembers');
    if (btn) { btn.addEventListener('click', open); _wired = true; }
  }
  function init() {
    wire();
    /* Admin bar is JS-injected after login, so re-wire on the ready event. */
    document.addEventListener('issho:admin-bar-ready', wire);
  }

  global.IsshoMembers = { init, open, close };

})(window);
