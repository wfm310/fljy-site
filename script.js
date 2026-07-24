/* ═══════════════════════════════════════════════════════════════════
   script.js · 对齐终稿 · 整份替换（旧脚本直接删，不要追加）
   对齐你的原生 CSS：
   ─ 进度条用 width（不是 scaleX）
   ─ 导航肤色用 .nav.ghost / .nav.solid（不是 data-nav-theme）
   ─ 章节跳动挂 .nav-chapter.tick（你的 chTick 动画）
   ─ 抽屉"正在读"用 a.active（你的 .dl-now 机制）
   ─ 眨眼：检测到 CSS 已在动画就自动让位（你已有 blink/blinkOpen）
   ─ 滚动时喂 html.is-scrolling（你的滚动条显隐）
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var doc = document, win = window;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = matchMedia('(pointer: coarse)').matches;
  var SEATS = 7; /* ★ 本期席位只改这一处，全页 .seats 自动同步 */

  function $(s, c) { return (c || doc).querySelector(s); }
  function $all(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  /* ── 01 · 席位同步 + 页脚年份 ── */
  $all('.seats').forEach(function (el) { el.textContent = SEATS; });
  var footYear = $('#footYear');
  if (footYear) footYear.textContent = new Date().getFullYear();

  /* ── 02 · 导航：进度条 / 明暗 / 章节 ── */
  var nav = $('#nav'),
      progressBar = $('#navProgressBar'),
      chapBtn = $('#navChapter'),
      chapNum = $('#navChapterNum'),
      chapTxt = $('#navChapterTxt'),
      hero = $('#hero');

  /* 章节单一数据源：hero(00) + 所有 data-chap，顶栏与抽屉共用 */
  var chapters = [];
  if (hero) chapters.push({ el: hero, id: 'hero', num: '00', txt: '峰岚佳韵' });
  $all('section[data-chap]').forEach(function (s) {
    chapters.push({ el: s, id: s.id, num: s.getAttribute('data-chap'), txt: s.getAttribute('data-nav') || s.id });
  });

  /* 明暗源：data-theme 块 + hero(橙) + 引言(墨) + 页脚(墨)，三段无 data-theme 的深色区手动登记 */
  var DARK = { dark: 1, ink: 1, orange: 1 };
  var themeEls = $all('[data-theme]').map(function (el) { return { el: el, theme: el.getAttribute('data-theme') }; });
  if (hero) themeEls.push({ el: hero, theme: 'orange' });
  var introEl = $('.intro-sec'); if (introEl) themeEls.push({ el: introEl, theme: 'ink' });
  var footEl = $('.foot'); if (footEl) themeEls.push({ el: footEl, theme: 'ink' });

  var drawerLinks = $all('.nav-drawer-list a[data-target]');

  var M = { navH: 68, vh: 800, docH: 1, chapTops: [], themeTops: [], heroTop: 0, heroPin: 1 };

  function measure() {
    var y = win.pageYOffset || doc.documentElement.scrollTop;
    M.vh = win.innerHeight;
    M.navH = nav ? nav.offsetHeight : 68;
    M.docH = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
    M.chapTops = chapters.map(function (c) { return { c: c, top: c.el.getBoundingClientRect().top + y }; });
    M.themeTops = themeEls.map(function (t) {
      var r = t.el.getBoundingClientRect();
      return { t: t, top: r.top + y, bottom: r.top + y + r.height };
    }).sort(function (a, b) { return a.top - b.top; });
    var pin = hero && $('.hero-sticky-wrap', hero);
    if (hero && pin) {
      M.heroTop = hero.getBoundingClientRect().top + y;
      M.heroPin = Math.max(1, hero.offsetHeight - pin.offsetHeight);
    }
  }

  var lastChapId = null, lastDark = null;

  /* 换章时轻跳：tick 挂在 .nav-chapter 上，吃你的 chTick 动画 */
  function popChapter() {
    if (!chapBtn || reduce) return;
    chapBtn.classList.remove('tick');
    void chapBtn.offsetWidth; /* 重排一下，让跳动可以重复触发 */
    chapBtn.classList.add('tick');
  }

  function updateNav(y) {
    /* 进度条：你的 CSS 是 width 驱动 */
    if (progressBar) {
      progressBar.style.width = (clamp01(y / Math.max(1, M.docH - M.vh)) * 100).toFixed(2) + '%';
    }
    /* 明暗：探针 = 导航底沿下一点，落在橙/墨底 → .ghost（白logo白字） */
    var probeT = y + M.navH + 12, theme = 'light', i;
    for (i = 0; i < M.themeTops.length; i++) {
      if (probeT >= M.themeTops[i].top && probeT < M.themeTops[i].bottom) { theme = M.themeTops[i].t.theme; break; }
    }
    var dark = !!DARK[theme];
    if (nav && dark !== lastDark) { lastDark = dark; nav.classList.toggle('ghost', dark); }
    if (nav) nav.classList.toggle('solid', y > 8);
    /* 章节：探针 = 视口 40% 处 */
    var probeR = y + M.vh * 0.4, cur = chapters.length ? chapters[0] : null;
    for (i = 0; i < M.chapTops.length; i++) if (M.chapTops[i].top <= probeR) cur = M.chapTops[i].c;
    if (cur && cur.id !== lastChapId) {
      lastChapId = cur.id;
      if (chapNum) chapNum.textContent = cur.num;
      if (chapTxt) chapTxt.textContent = cur.txt;
      popChapter();
      drawerLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-target') === cur.id); });
    }
  }

  /* ── 03 · 首屏视差钉屏 + 编号浮层 ── */
  var heroBg = hero && $('.hero-bg', hero);
  var floats = [], floatK = coarse ? 0.5 : 1;
  if (!reduce) {
    [['.pain-item .num', 0.05], ['.lc-num', 0.04]].forEach(function (pair) {
      $all(pair[0]).forEach(function (el) { el.style.willChange = 'transform'; floats.push({ el: el, speed: pair[1] }); });
    });
  }
  function updateHero(y) {
    if (heroBg) {
      if (reduce) { heroBg.style.transform = ''; heroBg.style.filter = ''; }
      else {
        var p = clamp01((y - M.heroTop) / M.heroPin);
        heroBg.style.transform = 'translate3d(0,' + (-p * 16).toFixed(2) + '%,0) scale(' + (1 - p * 0.12).toFixed(3) + ')';
        heroBg.style.filter = 'brightness(' + (1 - p * 0.10).toFixed(3) + ')';
      }
    }
    var c = M.vh / 2;
    for (var i = 0; i < floats.length; i++) {
      var r = floats[i].el.getBoundingClientRect();
      floats[i].el.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - c) * floats[i].speed * floatK).toFixed(1) + 'px,0)';
    }
  }

  /* ── 04 · 总滚动驱动（rAF 节流）+ 滚动条显隐 ── */
  var ticking = false, sbTimer;
  function onFrame() {
    ticking = false;
    var y = win.pageYOffset || doc.documentElement.scrollTop;
    updateNav(y);
    updateHero(y);
    doc.documentElement.classList.add('is-scrolling');
    clearTimeout(sbTimer);
    sbTimer = setTimeout(function () { doc.documentElement.classList.remove('is-scrolling'); }, 900);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } }
  win.addEventListener('scroll', onScroll, { passive: true });

  var rsz;
  win.addEventListener('resize', function () { clearTimeout(rsz); rsz = setTimeout(function () { measure(); onScroll(); }, 150); }, { passive: true });
  win.addEventListener('load', function () { measure(); onScroll(); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { measure(); onScroll(); });
  measure(); onScroll();

  /* ── 05 · 章节目录抽屉 ── */
  var drawer = $('#navDrawer'), scrim = $('#navScrim'),
      burger = $('#navBurger'), dClose = $('#navDrawerClose'),
      lastFocus = null;

  function setDrawerAria(open) {
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (chapBtn) chapBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function openDrawer() {
    if (!drawer || drawer.classList.contains('open')) return;
    lastFocus = doc.activeElement;
    drawer.classList.add('open');
    drawer.removeAttribute('inert');
    drawer.setAttribute('aria-hidden', 'false');
    if (scrim) scrim.classList.add('show');
    doc.body.classList.add('drawer-lock');
    setDrawerAria(true);
    var first = $('a', drawer);
    if (first) first.focus();
  }
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    drawer.setAttribute('inert', '');
    drawer.setAttribute('aria-hidden', 'true');
    if (scrim) scrim.classList.remove('show');
    doc.body.classList.remove('drawer-lock');
    setDrawerAria(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (drawer) {
    if (!drawer.classList.contains('open')) drawer.setAttribute('inert', ''); /* 关闭态不可 Tab 进去 */
    if (burger) burger.addEventListener('click', function () { drawer.classList.contains('open') ? closeDrawer() : openDrawer(); });
    if (chapBtn) chapBtn.addEventListener('click', openDrawer);
    if (dClose) dClose.addEventListener('click', closeDrawer);
    if (scrim) scrim.addEventListener('click', closeDrawer);
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) closeDrawer(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  }

  /* ── 06 · 折叠手风琴（资料 + 答疑共用，同组可多选） ── */
  $all('[data-acc]').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var head = e.target.closest('.acc-head');
      if (!head) return;
      var item = head.closest('.acc-item');
      if (!item) return;
      var open = item.classList.toggle('open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ── 07 · 入场：.rv 与你的 .reveal 一并点亮 ── */
  var rvs = $all('.rv, .reveal');
  if (reduce || !('IntersectionObserver' in win)) {
    rvs.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    rvs.forEach(function (el) { io.observe(el); });
  }

  /* ── 08 · 眨眼：你的 CSS 已有 blink/blinkOpen 动画 → 自动让位；
        仅当 CSS 没动画时（比如被精简过）才由 JS 接管 ── */
  var face = $('.host-face');
  if (face && !reduce) {
    var eyeO = $('.eye-open', face), eyeC = $('.eye-closed', face);
    if (eyeO && eyeC) {
      var cssAnim = getComputedStyle(eyeC).animationName;
      if (!cssAnim || cssAnim === 'none') {
        eyeO.style.opacity = '1'; eyeC.style.opacity = '0';
        (function blink() {
          setTimeout(function () {
            eyeO.style.opacity = '0'; eyeC.style.opacity = '1';
            setTimeout(function () { eyeO.style.opacity = '1'; eyeC.style.opacity = '0'; blink(); }, 150);
          }, 2600 + Math.random() * 2600);
        })();
      }
    }
  }

  /* ── 09 · 一键复制微信号（clipboard API + 微信/webview 兜底） ── */
  $all('.cta-copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idEl = $('.cc-id', btn);
      var text = btn.getAttribute('data-copy') || (idEl ? idEl.textContent.trim() : '');
      function done() {
        btn.classList.add('copied');
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
        clearTimeout(btn._t);
        btn._t = setTimeout(function () { btn.classList.remove('copied'); }, 1600);
      }
      function legacy() {
        var ta = doc.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
        doc.body.appendChild(ta); ta.focus(); ta.select();
        try { doc.execCommand('copy'); done(); } catch (e) {}
        doc.body.removeChild(ta);
      }
      if (navigator.clipboard && win.isSecureContext) navigator.clipboard.writeText(text).then(done, legacy);
      else legacy();
    });
  });
})();