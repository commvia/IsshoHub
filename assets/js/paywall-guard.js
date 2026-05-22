/* IsshoHub — Paywall Guard (章節頁 3–14) */
(function () {
  'use strict';

  /* ── 語言偵測（/en/ 路徑 = 英文版） ── */
  var isEN = window.location.pathname.indexOf('/en/') !== -1;

  var TEXT = {
    eyebrow:      isEN ? 'PREMIUM CONTENT' : '付費內容',
    bannerTitle:  isEN ? 'Unlock the Full Guide' : '解鎖天書全文',
    bannerSub:    isEN ? 'Chapters 3–14 · ¥880 incl. tax · Valid 3 months' : '第 3–14 章 · ¥880 稅込 · 3 個月有效',
    expiredMsg:   isEN ? 'Your access expired on ' : '你的閱讀權限已於 ',
    expiredSuffix: isEN ? '. Renew to read again.' : ' 到期。續購即可重新閱讀。',
    unlockBtn:    isEN ? 'Unlock Now  ¥880' : '立即解鎖 ¥880',
    renewBtn:     isEN ? 'Renew ¥880' : '續購 ¥880',
    loginHint:    isEN ? 'Already purchased? <a id="_pw_login">Sign in</a>' : '已購買？<a id="_pw_login">登入</a>',
    modalTitle:   isEN ? 'Unlock the Full Guide' : '解鎖天書全文',
    modalDesc:    isEN ? 'Chapters 3–14 · ¥880 incl. tax · 3 months access' : '第 3–14 章 · ¥880 稅込 · 3 個月有效期',
    features:     isEN
      ? ['12 chapters with diagrams', 'Bilingual Chinese / English', 'Instant access after payment']
      : ['12 章圖文詳解', '中英文雙語', '付款後即時解鎖'],
    price:        '¥880',
    priceSub:     isEN ? 'Tax included · 3 months' : '稅込 · 3 個月',
    buyBtn:       isEN ? 'Purchase ¥880' : '立即購買 ¥880',
    buying:       isEN ? 'Redirecting to payment...' : '正在跳轉至付款頁面…',
    processingTitle: isEN ? 'Confirming your payment…' : '正在確認你的付款…',
    processingSub:   isEN ? 'Please wait a moment.' : '請稍候片刻。',
    alreadyPurchased: isEN ? 'Already purchased? <a id="_pw_login2">Sign in</a>' : '已購買？<a id="_pw_login2">登入</a>',
  };

  /* ── Handle payment return ── */
  var urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success') {
    showProcessingOverlay();
    window.history.replaceState({}, '', window.location.pathname);
    setTimeout(function () { window.location.reload(); }, 3000);
    return;
  }
  if (urlParams.get('payment') === 'cancelled') {
    window.history.replaceState({}, '', window.location.pathname);
  }

  /* ── Main init ── */
  function init() {
    if (!window.IsshoAuth || !window.IsshoAPI || !window.IsshoAPI.hasDrivingGuideAccess) {
      setTimeout(init, 80);
      return;
    }

    window.IsshoAPI.hasDrivingGuideAccess().then(function (result) {
      if (result.access) {
        unlockSidebarLinks();
        return;
      }
      if (result.reason === 'expired') {
        var d = new Date(result.expires_at);
        var dateStr = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
        applyPaywall('expired', dateStr);
      } else {
        applyPaywall(result.reason, null);
      }
    }).catch(function () { /* fail silently */ });
  }

  /* ── Apply paywall to .guide-content ── */
  function applyPaywall(reason, expiredDate) {
    var content = document.querySelector('.guide-content');
    if (!content) return;

    /* Measure full height BEFORE moving nodes */
    var fullHeight = content.scrollHeight;
    var previewH   = Math.max(300, Math.floor(fullHeight * 0.10));

    /* Wrap ALL existing children in a preview div with overflow:hidden.
       The banner is then appended as a sibling inside .guide-content —
       no DOM-tree navigation needed, works in any layout (flex/grid/block). */
    var preview = document.createElement('div');
    preview.style.cssText = 'max-height:' + previewH + 'px;overflow:hidden;position:relative;';
    while (content.firstChild) {
      preview.appendChild(content.firstChild);
    }
    content.appendChild(preview);

    var fade = document.createElement('div');
    fade.className = 'paywall-fade';
    preview.appendChild(fade);

    var banner = document.createElement('div');
    banner.className = 'paywall-banner';
    banner.innerHTML = buildBanner(reason, expiredDate);
    content.appendChild(banner);

    var btn = banner.querySelector('#_pw_unlock_btn');
    if (btn) {
      btn.addEventListener('click', function () {
        if (reason === 'not_logged_in') { triggerLogin(); }
        else { showModal(); }
      });
    }
    var loginLink = banner.querySelector('#_pw_login');
    if (loginLink) {
      loginLink.addEventListener('click', function (e) { e.preventDefault(); triggerLogin(); });
    }
  }

  /* ── Banner HTML ── */
  function buildBanner(reason, expiredDate) {
    var expiredHtml = '';
    if (reason === 'expired' && expiredDate) {
      expiredHtml = '<p class="paywall-banner__expired">'
        + TEXT.expiredMsg + expiredDate + TEXT.expiredSuffix + '</p>';
    }
    var btnLabel = reason === 'expired' ? TEXT.renewBtn : TEXT.unlockBtn;
    var loginRow = (reason === 'not_logged_in' || reason === 'not_purchased')
      ? '<span class="paywall-banner__login">' + TEXT.loginHint + '</span>' : '';

    return '<p class="paywall-banner__eyebrow">' + TEXT.eyebrow + '</p>'
      + '<h2 class="paywall-banner__title">' + TEXT.bannerTitle + '</h2>'
      + '<p class="paywall-banner__sub">' + TEXT.bannerSub + '</p>'
      + expiredHtml
      + '<button class="paywall-banner__btn" id="_pw_unlock_btn">' + btnLabel + '</button>'
      + loginRow;
  }

  /* ── Payment modal ── */
  function showModal() {
    if (document.getElementById('_pw_modal_overlay')) return;
    var overlay = document.createElement('div');
    overlay.className = 'paywall-modal-overlay';
    overlay.id = '_pw_modal_overlay';
    overlay.innerHTML = '<div class="paywall-modal">'
      + '<button class="paywall-modal__close" id="_pw_modal_close">✕</button>'
      + '<div class="paywall-modal__icon">📖</div>'
      + '<h2 class="paywall-modal__title">' + TEXT.modalTitle + '</h2>'
      + '<p class="paywall-modal__desc">' + TEXT.modalDesc + '</p>'
      + '<ul class="paywall-modal__features">'
      + TEXT.features.map(function (f) { return '<li>' + f + '</li>'; }).join('')
      + '</ul>'
      + '<div class="paywall-modal__price">' + TEXT.price + '</div>'
      + '<div class="paywall-modal__price-sub">' + TEXT.priceSub + '</div>'
      + '<button class="paywall-modal__buy-btn" id="_pw_buy_btn">' + TEXT.buyBtn + '</button>'
      + '<div class="paywall-modal__secondary">' + TEXT.alreadyPurchased + '</div>'
      + '</div>';
    document.body.appendChild(overlay);

    document.getElementById('_pw_modal_close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

    var buyBtn = document.getElementById('_pw_buy_btn');
    buyBtn.addEventListener('click', function () {
      buyBtn.disabled = true;
      buyBtn.textContent = TEXT.buying;
      startCheckout();
    });

    var loginLink2 = document.getElementById('_pw_login2');
    if (loginLink2) {
      loginLink2.addEventListener('click', function (e) {
        e.preventDefault(); closeModal(); triggerLogin();
      });
    }
  }

  function closeModal() {
    var el = document.getElementById('_pw_modal_overlay');
    if (el) el.remove();
  }

  /* ── Stripe Checkout ── */
  function startCheckout() {
    window.IsshoAuth.getUser().then(function (user) {
      if (!user) { closeModal(); triggerLogin(); return; }

      fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:    user.id,
          email:      user.email,
          return_url: window.location.href,
        }),
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          alert(isEN ? 'Payment error. Please try again.' : '付款發生錯誤，請再試。');
          resetBuyBtn();
        }
      })
      .catch(function () {
        alert(isEN ? 'Network error. Please try again.' : '網絡錯誤，請再試。');
        resetBuyBtn();
      });
    });
  }

  function resetBuyBtn() {
    var btn = document.getElementById('_pw_buy_btn');
    if (btn) { btn.disabled = false; btn.textContent = TEXT.buyBtn; }
  }

  /* ── Unlock sidebar links (paid / admin) ── */
  function unlockSidebarLinks() {
    document.querySelectorAll('.guide-sidebar .guide-locked-link').forEach(function (a) {
      a.style.pointerEvents = '';
      a.style.opacity = '';
    });
    document.querySelectorAll('.guide-mobile-select option.guide-locked-opt').forEach(function (o) {
      o.disabled = false;
    });
  }

  /* ── Login trigger ── */
  function triggerLogin() {
    /* 1. Click the nav login button (core.js listens on [data-open-login]) */
    var loginBtn = document.querySelector('[data-open-login]')
      || document.querySelector('.btn-login')
      || document.getElementById('loginBtn');
    if (loginBtn) { loginBtn.click(); return; }
    /* 2. Directly open #loginModal (mirrors core.js openModal logic) */
    var modal = document.getElementById('loginModal');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      return;
    }
    /* 3. Last resort custom event */
    document.dispatchEvent(new CustomEvent('issho:require-login'));
  }

  /* ── Payment processing overlay ── */
  function showProcessingOverlay() {
    var el = document.createElement('div');
    el.className = 'paywall-processing';
    el.innerHTML = '<div class="paywall-processing__spinner"></div>'
      + '<div>' + TEXT.processingTitle + '</div>'
      + '<div style="font-size:13px;opacity:.6">' + TEXT.processingSub + '</div>';
    document.body.appendChild(el);
  }

  /* ── Bootstrap ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
