/* =========================================================
   峰岚佳韵 · script.js
   功能清单：
   1) 导航形态 ghost/solid + logo 明暗切色
   2) 顶部阅读进度条
   3) scroll-spy：抽屉高亮 + 胶囊章节号
   4) 章节目录抽屉：汉堡 toggle / 暗纱关闭 / Esc 关闭
   5) 滚动入场 reveal
   6) 数字墙计数
   7) 报名表单（前端演示）+ 席位三处联动
   8) 页脚年份
   9) 滚动条滑显停隐
   （旧"首屏手机视差/弹幕/活数据"已随手机模型移除而删除）
   ========================================================= */
(function () {
  "use strict";

  const nav    = document.getElementById('nav');
  const body   = document.body;
  const themed = [...document.querySelectorAll('[data-theme]')];
  const isDark = t => t === 'dark' || t === 'orange';

  /* ---------- 1. 导航形态 + logo 切色 ---------- */
  function syncForm() {
    const probeY = (nav?.offsetHeight || 64) / 2 + 8;
    let theme = themed[0]?.dataset.theme || 'light';
    for (const sec of themed) {
      const r = sec.getBoundingClientRect();
      if (r.top <= probeY && r.bottom > probeY) { theme = sec.dataset.theme; break; }
    }
    const dark = isDark(theme);
    nav.classList.toggle('ghost', dark);
    nav.classList.toggle('solid', !dark);
    body.classList.toggle('on-dark', dark);
  }

  /* ---------- 2. 顶部进度条 ---------- */
  const bar = document.getElementById('navProgressBar');
  function syncProgress() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? (h.scrollTop || body.scrollTop) / max : 0;
    if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
  }

  /* ---------- 3. scroll-spy ---------- */
  const chapterBtn = document.getElementById('navChapter');
  const chapterNum = document.getElementById('navChapterNum');
  const chapterTxt = document.getElementById('navChapterTxt');
  const drawer     = document.getElementById('navDrawer');
  const dLinks     = [...(drawer?.querySelectorAll('.nav-drawer-list a') || [])];

  const CHAPTERS = { hero:'00', pain:'01', run:'02', result:'03', join:'04' };
  const NAMES    = { hero:'峰岚佳韵', pain:'卡在哪里', run:'陪跑流程', result:'成果', join:'预约报名' };

  let lastChapter = null;
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.id;
      dLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
      const num = CHAPTERS[id] ?? '00';
      if (num !== lastChapter) {
        lastChapter = num;
        if (chapterNum) chapterNum.textContent = num;
        if (chapterTxt) chapterTxt.textContent = NAMES[id] ?? '峰岚佳韵';
        if (chapterBtn) {
          chapterBtn.classList.remove('tick');
          void chapterBtn.offsetWidth;
          chapterBtn.classList.add('tick');
        }
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
  themed.forEach(s => { if (s.id) spy.observe(s); });

  /* ---------- 4. 章节目录抽屉 ---------- */
  const burger  = document.getElementById('navBurger');
  const drawerX = document.getElementById('navDrawerClose');
  const scrim   = document.getElementById('navScrim');
  let lastFocus = null;

  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    scrim?.classList.add('show');
    drawer.removeAttribute('inert');
    drawer.setAttribute('aria-hidden', 'false');
    burger?.setAttribute('aria-expanded', 'true');
    body.style.overflow = 'hidden';
    drawerX?.focus();
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    scrim?.classList.remove('show');
    drawer.setAttribute('inert', '');
    drawer.setAttribute('aria-hidden', 'true');
    burger?.setAttribute('aria-expanded', 'false');
    body.style.overflow = '';
    lastFocus?.focus?.();
  }
  function toggleDrawer() { drawer.classList.contains('open') ? closeDrawer() : openDrawer(); }

  burger?.addEventListener('click', toggleDrawer);
  chapterBtn?.addEventListener('click', openDrawer);
  drawerX?.addEventListener('click', closeDrawer);
  scrim?.addEventListener('click', closeDrawer);
  drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer?.classList.contains('open')) closeDrawer();
  });

  /* ---------- 5. 滚动入场 reveal ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        e.target.style.transitionDelay = (Math.min(i, 4) * 70) + 'ms';
        e.target.classList.add('in');
        revealIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

  /* ---------- 6. 数字墙计数 ---------- */
  function animateCount(el) {
    const to  = parseFloat(el.dataset.to || '0');
    const pre = el.dataset.prefix || '';
    const suf = el.dataset.suffix || '';
    const dur = 1400, start = performance.now();
    (function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(to * eased);
      el.innerHTML = (pre ? `<span class="pre">${pre}</span>` : '') + val +
                     (suf ? `<span class="suf">${suf}</span>` : '');
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { animateCount(e.target); countIO.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num').forEach(el => countIO.observe(el));

  /* ---------- 7. 报名表单 + 席位联动 ---------- */
  const form    = document.getElementById('joinForm');
  const note    = document.getElementById('formNote');
  const seatsEl = document.getElementById('seatsLeft');

  function setSeats(n) {
    document.querySelectorAll('#navSeats, #drawerSeats, #seatsLeft')
      .forEach(el => { el.textContent = String(n); });
  }
  window.__setSeats = setSeats;

  form?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data  = new FormData(form);
    const name  = (data.get('name') || '').toString().trim();
    const phone = (data.get('phone') || '').toString().trim();
    if (!name || !phone) { note.textContent = '请把称呼和联系方式填全～'; return; }
    if (!/^[0-9+\-\s]{6,}$/.test(phone)) { note.textContent = '联系方式格式好像不太对，再检查一下？'; return; }
    note.textContent = `收到，${name}！导师会在 48 小时内联系你 ✦`;
    form.reset();
    if (seatsEl) {
      const n = parseInt(seatsEl.textContent, 10) || 0;
      if (n > 1) setSeats(n - 1);
    }
  });

  /* ---------- 8. 页脚年份 ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- 统一滚动/resize ---------- */
  const onScroll = () => { syncForm(); syncProgress(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', syncForm);

  syncForm();
  syncProgress();
})();

/* ---------- 9. 滚动条：滑动浮现，停手 1s 淡隐 ---------- */
(function(){
  var t, r = document.documentElement;
  function on(){
    r.classList.add('is-scrolling');
    clearTimeout(t);
    t = setTimeout(function(){ r.classList.remove('is-scrolling'); }, 1000);
  }
  addEventListener('scroll', on, { passive: true });
})();

/* ---------- 10. 滚动钉屏视差（背景退远 + 浮层） ----------
   首屏：背景层(.hero-bg)随滚动进度 向上移 + 缩小 + 微暗 = 退进深处；
         文字/脸由 CSS sticky 钉死，JS 不碰 → 真正的"钉子"。
   正文：痛点大编号 / 成果数字 轻微漂浮，叠一层层次。
   进度 p 以 hero 的 pin 行程归一 → 首屏静止 p=0，对位不破坏。
   移动端系数减半；prefers-reduced-motion 时背景不退、浮层不漂。 */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = matchMedia('(pointer:coarse)').matches;
  var floatK = coarse ? 0.5 : 1;            // 浮层幅度：手机减半

  /* —— 首屏背景退远 —— */
  var hero  = document.getElementById('hero');
  var stage = hero && hero.querySelector('.hero-stage');
  var bg    = hero && hero.querySelector('.hero-bg');

  function pinMetrics() {
    if (!hero || !stage) return null;
    var r   = hero.getBoundingClientRect();
    var top = r.top + (window.pageYOffset || document.documentElement.scrollTop);
    var pin = hero.offsetHeight - stage.offsetHeight;   // 钉屏行程
    return { top: top, pin: pin > 0 ? pin : 1 };
  }
  var pm = pinMetrics();

  function applyBg(y) {
    if (!bg || !pm) return;
    var p = (y - pm.top) / pm.pin;
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    if (reduce) { bg.style.transform = ''; bg.style.filter = ''; return; }
    var ty = -p * 16;                       // 向上移 16%
    var sc = 1 - p * 0.12;                  // 缩到 0.88
    var br = 1 - p * 0.10;                  // 退暗一点，纵深暗示
    bg.style.transform = 'translate3d(0,' + ty.toFixed(2) + '%,0) scale(' + sc.toFixed(3) + ')';
    bg.style.filter = 'brightness(' + br.toFixed(3) + ')';
  }

  /* —— 正文浮层：以"元素相对视口中心"为基准，居中=0 —— */
  var floats = [];
  function addFloat(sel, speed) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.style.willChange = 'transform';
      floats.push({ el: el, speed: speed });
    });
  }
  if (!reduce) {
    addFloat('.pain-item .num', 0.05);
    addFloat('.stat-num',       0.04);
  }
  function applyFloats() {
    var c = innerHeight / 2;
    for (var i = 0; i < floats.length; i++) {
      var L = floats[i], r = L.el.getBoundingClientRect();
      var ty = (r.top + r.height / 2 - c) * L.speed * floatK;
      L.el.style.transform = 'translate3d(0,' + ty.toFixed(1) + 'px,0)';
    }
  }

  if (!bg && !floats.length) return;

  var ticking = false;
  function update() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop;
    applyBg(y);
    applyFloats();
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', function () { pm = pinMetrics(); onScroll(); }, { passive: true });
  update();
})();