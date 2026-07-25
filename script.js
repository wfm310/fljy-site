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

  /* ── 01 · 席位同步 ── */
  $all('.seats').forEach(function (el) { el.textContent = SEATS; });

  /* ── 02 · 导航：进度条 / 明暗 / 章节 ── */
  var nav = $('#nav'),
      progressBar = $('#navProgressBar'),
      chapBtn = $('#navChapter'),
      chapNum = $('#navChapterNum'),
      chapTxt = $('#navChapterTxt'),
      hero = $('#hero');

  /* 章节数据源：仅有 hero，顶栏与抽屉共用 */
  var chapters = [];
  if (hero) chapters.push({ el: hero, id: 'hero', num: '00', txt: '峰岚佳韵' });

  /* 明暗源：hero(橙) */
  var DARK = { dark: 1, ink: 1, orange: 1 };
  var themeEls = [];
  if (hero) themeEls.push({ el: hero, theme: 'orange' });

  var drawerLinks = $all('.nav-drawer-list a[data-target]');

  var M = { navH: 68, vh: 800, docH: 1, chapTops: [], themeTops: [] };

  function measure() {
    var y = win.pageYOffset || doc.documentElement.scrollTop;
    M.vh = win.innerHeight;
    M.navH = nav ? nav.offsetHeight : 68;
    M.docH = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
    M.chapTops = chapters.map(function (c) { return { c: c, top: c.el.getBoundingClientRect().top + y }; });
    M.themeTops = themeEls.map(function (t) {
      /* sticky 元素（hero）用 offsetTop/offsetHeight，因为 sticky 吸附后
         getBoundingClientRect().top 恒为 0，会导致区间随 y 漂移，永远覆盖后续区域 */
      var top, h;
      if (t.el === hero) { top = hero.offsetTop; h = hero.offsetHeight; }
      else { var r = t.el.getBoundingClientRect(); top = r.top + y; h = r.height; }
      return { t: t, top: top, bottom: top + h };
    }).sort(function (a, b) { return a.top - b.top; });

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

  /* ── 03 · 总滚动驱动（rAF 节流）+ 滚动条显隐 ── */
  var ticking = false, sbTimer;
  function onFrame() {
    ticking = false;
    var y = win.pageYOffset || doc.documentElement.scrollTop;
    updateNav(y);
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

  /* ── Logo 点击回首页（sticky hero 下 #hash 锚点不可靠，JS 兜底） ── */
  var brandLink = $('.nav-brand');
  if (brandLink) {
    brandLink.addEventListener('click', function (e) {
      /* 仅当 href 指向 hero 时才接管（保持语义，未来换链也不误杀） */
      if (brandLink.getAttribute('href') === '#hero') {
        e.preventDefault();
        win.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }
    });
  }

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
    drawer.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link) return;
      /* #hero 锚点在 sticky hero 下不可靠，JS 兜底滚动到顶部 */
      if (link.getAttribute('href') === '#hero') {
        e.preventDefault();
        win.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }
      closeDrawer();
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  }

  /* ── 06 · 入场：.rv 与你的 .reveal 一并点亮 ── */
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

})();