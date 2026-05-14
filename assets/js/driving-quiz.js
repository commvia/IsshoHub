// assets/js/driving-quiz.js
(function (global) {
  'use strict';

  /* ── 雙語字串 ── */
  var T = {
    tc: {
      intro_title:    '外免切替模擬試題',
      intro_desc:     '正式筆試前的最佳練習。訪客可練習 20 題；登入後解鎖全部 100 題，並記錄錯題。',
      qs_label:       '題',
      mode_guest:     '訪客模式',
      mode_member:    '完整模式',
      start_guest:    '開始測驗（訪客 · 20 題）',
      start_member:   '開始完整測驗（100 題）',
      start_note_guest:  '登入後可練習 100 題 + 記錄錯題',
      start_note_member: '全部 100 題，順序隨機排列',
      progress:       function (cur, tot) { return 'Q' + cur + ' / ' + tot; },
      btn_true:       '○ 正確',
      btn_false:      '✕ 錯誤',
      correct:        '✅ 正確！',
      wrong:          function (ans) { return '❌ 錯誤，正確答案是：' + (ans ? '○ 正確' : '✕ 錯誤'); },
      next:           '下一題 →',
      soft_msg:       '登入後可練習全部 100 題，並追蹤你的錯題',
      soft_cta:       '登入 / 註冊',
      soft_close:     '✕',
      result_score:   function (s, t) { return s + ' / ' + t + ' 答對'; },
      result_pct:     function (s, t) { return Math.round(s / t * 100) + '%'; },
      result_cta_sub: '完整版包含 100 題，並自動記錄你的錯題。',
      btn_register:   '立即免費註冊',
      btn_retry_guest:'再練習一次',
      btn_retry:      '再練習一次',
      btn_review:     function (n) { return '複習本次錯題（' + n + ' 題）'; },
      review_title:   '本次錯題複習',
      review_back:    '← 返回',
      review_answer:  function (ans) { return '正確答案：' + (ans ? '○ 正確' : '✕ 錯誤'); },
      ref_title:      '外免切替筆試題庫參考',
      ref_note:       '以下為全部 100 道練習題，展開可查看答案與解說。',
      ref_answer:     function (ans) { return '答案：' + (ans ? '○ 正確' : '✕ 錯誤'); },
    },
    en: {
      intro_title:    'Driving Licence Conversion Practice',
      intro_desc:     'Practice for the foreign licence conversion written test. Guests get 20 questions; members unlock all 100 + wrong-answer tracking.',
      qs_label:       'Qs',
      mode_guest:     'Guest mode',
      mode_member:    'Full mode',
      start_guest:    'Start Practice (Guest · 20 Qs)',
      start_member:   'Start Full Practice (100 Qs)',
      start_note_guest:  'Sign in to access 100 Qs + track wrong answers',
      start_note_member: 'All 100 questions in random order',
      progress:       function (cur, tot) { return 'Q' + cur + ' / ' + tot; },
      btn_true:       '○ True',
      btn_false:      '✕ False',
      correct:        '✅ Correct!',
      wrong:          function (ans) { return '❌ Wrong. Correct answer: ' + (ans ? '○ True' : '✕ False'); },
      next:           'Next →',
      soft_msg:       'Sign in to practice all 100 questions and track your mistakes',
      soft_cta:       'Sign In / Register',
      soft_close:     '✕',
      result_score:   function (s, t) { return s + ' / ' + t + ' correct'; },
      result_pct:     function (s, t) { return Math.round(s / t * 100) + '%'; },
      result_cta_sub: 'Full version has 100 questions with automatic wrong-answer tracking.',
      btn_register:   'Register Free',
      btn_retry_guest:'Try Again',
      btn_retry:      'Try Again',
      btn_review:     function (n) { return 'Review Wrong Answers (' + n + ')'; },
      review_title:   'Wrong Answer Review',
      review_back:    '← Back',
      review_answer:  function (ans) { return 'Correct answer: ' + (ans ? '○ True' : '✕ False'); },
      ref_title:      'Driving Test Question Reference',
      ref_note:       'All 100 practice questions. Expand each to see the answer and explanation.',
      ref_answer:     function (ans) { return 'Answer: ' + (ans ? '○ True' : '✕ False'); },
    }
  };

  /* ── 狀態 ── */
  var C        = global.IsshoCore;
  var user     = null;
  var questions   = [];
  var currentIdx  = 0;
  var score       = 0;
  var sessionWrongs = [];
  var softShown   = false;
  var answered    = false;

  /* ── helpers ── */
  function tObj() {
    var lang = C.getLang();
    return T[lang] || T.tc;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function $(id) { return document.getElementById(id); }

  function showScene(id) {
    ['scene-intro', 'scene-quiz', 'scene-result', 'scene-review'].forEach(function (s) {
      var el = $(s);
      if (el) el.style.display = (s === id) ? '' : 'none';
    });
  }

  /* ── 登入 Modal ── */
  function openLoginModal() {
    var m = $('loginModal');
    if (m) { m.style.display = ''; m.removeAttribute('aria-hidden'); }
  }

  /* ── 更新 Intro UI（依登入狀態）── */
  function updateIntroUI() {
    var s    = tObj();
    var isGuest = !user;

    $('intro-title').textContent    = s.intro_title;
    $('intro-desc').textContent     = s.intro_desc;
    $('intro-qs-num').textContent   = isGuest ? 20 : 100;
    $('intro-qs-label').textContent = s.qs_label;
    $('intro-mode').textContent     = isGuest ? s.mode_guest : s.mode_member;
    $('intro-start-btn').textContent  = isGuest ? s.start_guest : s.start_member;
    $('intro-start-note').textContent = isGuest ? s.start_note_guest : s.start_note_member;
  }

  /* ── 開始測驗 ── */
  function startQuiz() {
    if (typeof QUIZ_DATA === 'undefined' || !QUIZ_DATA.length) return;
    var isGuest = !user;
    var all = shuffle(QUIZ_DATA.slice());
    questions     = isGuest ? all.slice(0, 20) : all;
    currentIdx    = 0;
    score         = 0;
    sessionWrongs = [];
    softShown     = false;
    showScene('scene-quiz');
    renderQuestion();
  }

  /* ── 渲染題目 ── */
  function renderQuestion() {
    answered = false;
    var q     = questions[currentIdx];
    var s     = tObj();
    var total = questions.length;

    $('quiz-progress-fill').style.width = (currentIdx / total * 100) + '%';
    $('quiz-progress-text').textContent = s.progress(currentIdx + 1, total);

    var lang = C.getLang();
    var imgEl = $('quiz-img');
    if (q.img) {
      imgEl.src           = q.img;
      imgEl.alt           = (lang === 'en' && q.img_alt_en) ? q.img_alt_en : '';
      imgEl.style.display = '';
    } else {
      imgEl.style.display = 'none';
    }

    $('quiz-question').textContent = (lang === 'en' && q.q_en) ? q.q_en : q.q;

    $('quiz-btn-true').textContent  = s.btn_true;
    $('quiz-btn-false').textContent = s.btn_false;
    $('quiz-btn-true').disabled  = false;
    $('quiz-btn-false').disabled = false;

    var fb = $('quiz-feedback');
    fb.style.display = 'none';
    fb.className     = 'quiz-feedback';

    /* Soft banner: 訪客，currentIdx >= 14，只顯示一次 */
    if (!user && currentIdx >= 14 && !softShown) {
      softShown = true;
      var banner = $('quiz-soft-banner');
      banner.classList.add('visible');
      $('soft-msg').textContent   = s.soft_msg;
      $('soft-cta').textContent   = s.soft_cta;
      $('soft-close').textContent = s.soft_close;
    }
  }

  /* ── 作答 ── */
  function handleAnswer(userAnswer) {
    if (answered) return;
    answered = true;

    var q       = questions[currentIdx];
    var s       = tObj();
    var correct = (userAnswer === q.answer);

    $('quiz-btn-true').disabled  = true;
    $('quiz-btn-false').disabled = true;

    if (correct) {
      score++;
    } else {
      sessionWrongs.push(q);
      if (user) {
        var db = global.IsshoAuth.getClient();
        db.rpc('increment_quiz_wrong_count', {
          p_user_id:     user.id,
          p_quiz_type:   'driving',
          p_question_id: q.id
        }).catch(function () {});
      }
    }

    var fb = $('quiz-feedback');
    fb.className     = 'quiz-feedback ' + (correct ? 'correct' : 'wrong');
    fb.style.display = 'block';
    var lang = C.getLang();
    $('feedback-label').textContent       = correct ? s.correct : s.wrong(q.answer);
    $('feedback-explanation').textContent = (lang === 'en' && q.explanation_en) ? q.explanation_en : q.explanation;
    $('quiz-next-btn').textContent        = s.next;
  }

  /* ── 下一題 ── */
  function nextQuestion() {
    if (!answered) return;
    currentIdx++;
    if (currentIdx >= questions.length) {
      endQuiz();
    } else {
      renderQuestion();
    }
  }

  /* ── 完成測驗 ── */
  function endQuiz() {
    if (user) {
      var db = global.IsshoAuth.getClient();
      db.from('quiz_attempts').insert({
        user_id:  user.id,
        quiz_type:'driving',
        score:    score,
        total:    questions.length
      }).catch(function () {});
    }
    renderResult();
    showScene('scene-result');
  }

  /* ── 渲染成績頁 ── */
  function renderResult() {
    var s     = tObj();
    var total = questions.length;

    $('result-pct').textContent   = s.result_pct(score, total);
    $('result-label').textContent = s.result_score(score, total);

    var btns = $('result-btns');
    if (user) {
      var reviewBtn = sessionWrongs.length
        ? '<button class="quiz-result-btn-primary" id="btn-review">' + s.btn_review(sessionWrongs.length) + '</button>'
        : '';
      btns.innerHTML = reviewBtn +
        '<button class="quiz-result-btn-secondary" id="btn-retry">' + s.btn_retry + '</button>';
      var rb = $('btn-review');
      if (rb) rb.onclick = showReview;
      $('btn-retry').onclick = function () { showScene('scene-intro'); updateIntroUI(); };
    } else {
      btns.innerHTML =
        '<p class="quiz-result-sub">' + s.result_cta_sub + '</p>' +
        '<button class="quiz-result-btn-primary" id="btn-register">' + s.btn_register + '</button>' +
        '<button class="quiz-result-btn-secondary" id="btn-retry">' + s.btn_retry_guest + '</button>';
      $('btn-register').onclick = openLoginModal;
      $('btn-retry').onclick    = function () { showScene('scene-intro'); updateIntroUI(); };
    }
  }

  /* ── 錯題複習 ── */
  function showReview() {
    var s    = tObj();
    $('review-title').textContent    = s.review_title;
    $('review-back-btn').textContent = s.review_back;
    var list = $('review-list');
    var lang = C.getLang();
    list.innerHTML = sessionWrongs.map(function (q, i) {
      var qText   = (lang === 'en' && q.q_en)           ? q.q_en           : q.q;
      var expText = (lang === 'en' && q.explanation_en) ? q.explanation_en : q.explanation;
      var numLabel = lang === 'en' ? 'Wrong answer #' + (i + 1) : '第 ' + (i + 1) + ' 道錯題';
      return '<div class="quiz-review-item">' +
        '<div class="quiz-review-num">' + numLabel + '</div>' +
        (q.img ? '<img src="' + escapeHtml(q.img) + '" alt="' + escapeHtml((lang === 'en' && q.img_alt_en) ? q.img_alt_en : '') + '" class="quiz-review-img">' : '') +
        '<div class="quiz-review-q">' + escapeHtml(qText) + '</div>' +
        '<div class="quiz-review-answer">' + s.review_answer(q.answer) + '</div>' +
        '<div class="quiz-review-explanation">' + escapeHtml(expText) + '</div>' +
        '</div>';
    }).join('');
    showScene('scene-review');
  }

  /* ── 題目庫參考（SEO，動態渲染）── */
  function renderReference() {
    var titleEl = $('ref-title');
    var noteEl  = $('ref-note');
    var listEl  = $('ref-list');
    if (!titleEl || !noteEl || !listEl) return;
    if (typeof QUIZ_DATA === 'undefined' || !QUIZ_DATA.length) return;

    var lang = C.getLang();
    var isEn = lang === 'en';

    titleEl.textContent = isEn ? 'Driving Test Question Reference' : '外免切替筆試題庫參考';
    noteEl.textContent  = isEn
      ? 'All 100 practice questions. Expand each to see the question. Image questions (🖼) should be answered with reference to the image shown.'
      : '以下為全部 100 道練習題，展開可查看題目。有圖片的題目（🖼）需對照圖片作答。';

    listEl.innerHTML = QUIZ_DATA.map(function (q) {
      var qText  = (isEn && q.q_en) ? q.q_en : q.q;
      var hasImg = !!q.img;
      var imgIcon = hasImg ? ' 🖼' : '';
      var label  = isEn ? ('Q' + q.id + imgIcon + ': ') : ('第 ' + q.id + ' 題' + imgIcon + '：');
      var imgHtml = hasImg
        ? '<img src="' + q.img + '" alt="' + ((isEn && q.img_alt_en) ? q.img_alt_en : '') + '" style="max-width:100%;max-height:200px;display:block;margin-bottom:8px;">'
        : '';
      return '<details>' +
        '<summary>' + label + qText + '</summary>' +
        '<div class="ref-body">' + imgHtml + '<div class="ref-q">' + qText + '</div></div>' +
        '</details>';
    }).join('\n');
  }

  /* ── 語言切換重新渲染 ── */
  function onLangChange() {
    var scenes = ['scene-intro','scene-quiz','scene-result','scene-review'];
    var visible = null;
    for (var i = 0; i < scenes.length; i++) {
      var el = $(scenes[i]);
      if (el && el.style.display !== 'none') { visible = scenes[i]; break; }
    }
    if (visible === 'scene-intro')  updateIntroUI();
    if (visible === 'scene-result') renderResult();
    if (visible === 'scene-review') showReview();
    if (visible === 'scene-quiz')   renderQuestion();
    renderReference();
  }

  /* ── 初始化 ── */
  function init() {
    global.IsshoAuth.getUser().then(function (u) {
      user = u;
      updateIntroUI();
    });
    global.IsshoAuth.onAuthChange(function (event, session) {
      user = session ? session.user : null;
      updateIntroUI();
    });

    var startBtn = $('intro-start-btn');
    if (startBtn) startBtn.addEventListener('click', startQuiz);

    var btnTrue  = $('quiz-btn-true');
    var btnFalse = $('quiz-btn-false');
    if (btnTrue)  btnTrue.addEventListener('click',  function () { handleAnswer(true); });
    if (btnFalse) btnFalse.addEventListener('click', function () { handleAnswer(false); });

    var nextBtn = $('quiz-next-btn');
    if (nextBtn) nextBtn.addEventListener('click', nextQuestion);

    var softCta   = $('soft-cta');
    var softClose = $('soft-close');
    if (softCta)   softCta.addEventListener('click', openLoginModal);
    if (softClose) softClose.addEventListener('click', function () {
      $('quiz-soft-banner').classList.remove('visible');
    });

    var backBtn = $('review-back-btn');
    if (backBtn) backBtn.addEventListener('click', function () {
      renderResult();
      showScene('scene-result');
    });

    C.onLangChange(onLangChange);
    showScene('scene-intro');
    renderReference();

    /* ── 防複製：右鍵 + Cmd/Ctrl+C ── */
    var lockEls = [
      document.querySelector('.quiz-card'),
      document.getElementById('question-reference')
    ];
    lockEls.forEach(function (el) {
      if (!el) return;
      el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      el.addEventListener('copy',        function (e) { e.preventDefault(); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
