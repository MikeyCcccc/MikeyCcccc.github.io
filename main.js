"use strict";
// 标记脚本可用：隐藏态只在 .js 下生效，脚本失败时内容默认可见（gate 62）
document.documentElement.classList.add('js');
(function () {
  gsap.registerPlugin(ScrollTrigger);

  // hero swiper — from reference: slide + parallax + autoplay 2s
  new Swiper('.hero-swiper', {
    effect: 'slide', loop: true, parallax: true,
    slidesPerView: 1, speed: 1000,
    autoplay: { delay: 2200 }
  });

  // work experience — 黑底双图轮播，同款 slide + parallax 假翻页
  new Swiper('.work-exp-swiper', {
    effect: 'slide', loop: true, parallax: true,
    slidesPerView: 1, speed: 1100,
    autoplay: { delay: 2600 }
  });

  // hero — 大标题随下滑精确飞到 nav 的 ACTOR·DANCER 上方（brand-name 位置）
  // 关键修复：起止坐标全部用「函数式值」，ScrollTrigger 每次 refresh 都重新测量。
  // 用「h1 相对 hero 的偏移」而非绝对视口坐标 —— 该差值与当前滚动位置无关，
  // 因此用户在字体/图片加载完成前就滚动，也不会算出错误的起点导致动画不触发。
  var heroH1 = document.querySelector('#heroInner h1');
  var fly = null;
  var heroEl = document.querySelector('.hero');
  if (window.innerWidth > 860 && heroH1 && heroEl) {
    fly = document.createElement('div');
    fly.className = 'name-fly';
    fly.textContent = heroH1.textContent;
    document.body.appendChild(fly);
    var brandName = document.querySelector('#brandName');

    // 起点：h1 相对 hero 左上角的位置（滚动无关）
    function flyStartX() { return heroH1.getBoundingClientRect().left - heroEl.getBoundingClientRect().left; }
    function flyStartY() { return heroH1.getBoundingClientRect().top - heroEl.getBoundingClientRect().top; }
    // 终点：brand 在固定 nav 中，位置稳定；按最终盒高中点补偿基线
    function flyScale() {
      var h = parseFloat(getComputedStyle(heroH1).fontSize) || 1;
      var b = parseFloat(getComputedStyle(brandName).fontSize) || 1;
      return b / h;
    }
    function flyEndX() { return brandName.getBoundingClientRect().left; }
    function flyEndY() {
      var br = brandName.getBoundingClientRect();
      var h = parseFloat(getComputedStyle(heroH1).fontSize) || 1;
      var flyLH = parseFloat(getComputedStyle(fly).lineHeight) || h * 0.95;
      var yAdjust = (br.height - flyLH * flyScale()) / 2;
      return br.top + yAdjust;
    }

    gsap.set(heroH1, { opacity: 0 });
    gsap.fromTo(fly,
      { x: flyStartX, y: flyStartY, scale: 1, fontSize: function () { return getComputedStyle(heroH1).fontSize; } },
      {
        x: flyEndX, y: flyEndY, scale: flyScale, ease: 'none', immediateRender: true,
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 55%',
          scrub: 0.4, invalidateOnRefresh: true }
      });
  }

  if (window.innerWidth > 860) {
    gsap.timeline({
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.25 }
    })
      .to('.hero-tags', { opacity: 0, y: '3rem', ease: 'none' }, 0)
      .to('#heroSticky', { rotation: -8, scale: 0.6, ease: 'none' }, 0);
  }

  // nav flip to white after half screen — from reference
  gsap.timeline({
    scrollTrigger: { trigger: 'body', start: () => innerHeight / 2, end: () => innerHeight / 2,
      toggleActions: 'none play none reverse' }
  }).to('#nav', { backgroundColor: '#ffffff', duration: 0.5 });

  // nav 小字"陈翰霖"保持隐藏，由 hero 大标题缩小飞到左上角接管该位置
  gsap.set('#brandName', { opacity: 0 });

  // 视频加载：两级观察器，先把"下载缓冲"和"进入视口播放"分离，避免滚动到才下载导致卡几秒
  // 1) 预加载观察器：距离视口 900px 就开始下载（绝不在首屏触发，作品区离首屏很远）
  // 2) 播放观察器：进入视口才 play，此时视频通常已缓冲好，遮罩擦开即在动
  function markReady(v) {
    v.dataset.ready = '1';
    window.dispatchEvent(new CustomEvent('videoready', { detail: { video: v } }));
  }
  function attachVideoSource(v) {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    v.addEventListener('error', function onErr() {
      if (v.dataset.fallback) return;
      v.dataset.fallback = '1';
      var local = v.getAttribute('data-local');
      if (local) { v.src = local; v.load(); }
    });
    // 视频下载到可播放帧即置 ready，供 wipe 动画判断
    ['loadeddata', 'canplay'].forEach(function (evt) {
      v.addEventListener(evt, function () { if (!v.dataset.ready) markReady(v); }, { once: true });
    });
    v.src = v.getAttribute('data-src');
    v.load();
  }
  if ('IntersectionObserver' in window) {
    var lazyVideos = [].slice.call(document.querySelectorAll('video[data-src]'));
    // 预加载：距视口 900px 开始下载缓冲
    var preloadObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          attachVideoSource(e.target);
          preloadObserver.unobserve(e.target);
        }
      });
    }, { rootMargin: '900px 0px', threshold: 0 });
    // 播放：进入视口才播，离开暂停
    var playObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          attachVideoSource(v);
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else if (v.src) {
          v.pause();
        }
      });
    }, { rootMargin: '120px 0px', threshold: 0.01 });
    lazyVideos.forEach(function (v) { preloadObserver.observe(v); playObserver.observe(v); });
  } else {
    // 老浏览器兜底：直接加载全部
    [].slice.call(document.querySelectorAll('video[data-src]')).forEach(function (v) {
      v.addEventListener('error', function onErr() {
        if (v.dataset.fallback) return;
        v.dataset.fallback = '1';
        var local = v.getAttribute('data-local');
        if (local) { v.src = local; v.load(); }
      });
      v.src = v.getAttribute('data-src');
      v.load();
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  }

  // footer portrait — 视差：随滚动照片上移/回退（scrub 双向跟随）
  // 竖屏下整图铺底、人脸固定落在右侧清晰区，禁用视差避免人脸被推走；横屏/桌面保留
  var fportrait = document.querySelector('.footer-portrait img');
  if (fportrait && !(window.innerWidth <= 860 && window.matchMedia('(orientation: portrait)').matches)) {
    gsap.fromTo(fportrait,
      { yPercent: -8 },
      { yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom',
          scrub: 0.6, invalidateOnRefresh: true }
      });
  }

  // theater filmstrip — 初始只露第一张图顶部一小截 + 星星占位，下滑时照片向上划入
  var strip = document.querySelector('.theater-strip');
  var visual = document.querySelector('.theater-visual');
  if (strip && visual) {
    gsap.fromTo(strip,
      { y: function () { return visual.clientHeight * 0.95; } },
      { y: function () { return -(strip.scrollHeight - visual.clientHeight) - visual.clientHeight * 0.15; },
        ease: 'none',
        scrollTrigger: { trigger: '.theater', start: 'top top', end: 'bottom bottom',
          scrub: 0.5, invalidateOnRefresh: true }
      });
  }

  // theater star mark — 随着下滑淡出并上移消失（参考原站星形随滚动退场）
  (function () {
    var mark = document.querySelector('.theater-mark');
    var section = document.querySelector('.theater');
    if (!mark || !section) return;
    gsap.fromTo(mark,
      { opacity: 0.9, y: 0, scale: 1 },
      { opacity: 0, y: -40, scale: 0.7, ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: '35% top',
          scrub: 0.5, invalidateOnRefresh: true } });
  })();

  // dance — text flowing around the module border (SVG textPath)
  (function () {
    var stage = document.getElementById('danceStage');
    var svg = document.getElementById('danceOrbit');
    var path = document.getElementById('danceOrbitPath');
    var tp = document.getElementById('danceOrbitText');
    if (!stage || !svg || !path || !tp) return;
    var msg = '专业街舞 13 年。曾任南京大学 Passion 街舞社 Hiphop 队长；曾随队赴美进行街舞交流（同队北大 1 人、人大 1 人、西交 2 人、南大 1 人），腾讯公司全程资助。　✳　';
    var tween = null, ro = null;
    function build() {
      var w = stage.clientWidth, h = stage.clientHeight, pad = 14, r = 6;
      var x = pad, y = pad, W = w - pad * 2, H = h - pad * 2;
      path.setAttribute('d', 'M ' + (x + r) + ' ' + y +
        ' H ' + (x + W - r) + ' Q ' + (x + W) + ' ' + y + ' ' + (x + W) + ' ' + (y + r) +
        ' V ' + (y + H - r) + ' Q ' + (x + W) + ' ' + (y + H) + ' ' + (x + W - r) + ' ' + (y + H) +
        ' H ' + (x + r) + ' Q ' + x + ' ' + (y + H) + ' ' + x + ' ' + (y + H - r) +
        ' V ' + (y + r) + ' Q ' + x + ' ' + y + ' ' + (x + r) + ' ' + y + ' Z');
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      if (tween) tween.kill();
      tp.textContent = msg;
      var one = tp.getComputedTextLength();
      if (!one) return;
      var total = path.getTotalLength();
      var reps = Math.ceil(total / one) + 1;
      tp.textContent = new Array(reps + 1).join(msg);
      gsap.set(tp, { attr: { startOffset: 0 } });
      tween = gsap.to(tp, { attr: { startOffset: -one }, duration: one / 34,
        ease: 'none', repeat: -1 });
    }
    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(function () { clearTimeout(ro._t); ro._t = setTimeout(build, 150); });
      ro.observe(stage);
    } else {
      window.addEventListener('resize', function () { clearTimeout(ro); ro = setTimeout(build, 150); });
    }
  })();

  // education magazine photo — rises and tilts into place like reference book cover
  gsap.fromTo('#eduPhoto',
    { yPercent: 62, rotation: 16, opacity: 0.25 },
    { yPercent: -8, rotation: -6, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: '.edu', start: 'top bottom', end: 'bottom top', scrub: 0.75 } });

  // tilt-card parallax like reference book/netflix poster
  gsap.utils.toArray('.dance-card img').forEach(function (img) {
    gsap.fromTo(img, { yPercent: -8 }, {
      scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: 0.75 },
      yPercent: 8, ease: 'none'
    });
  });

  // magazine wall — 参考站 stagger-fade：进入视口底部即触发，从上到下一个个出现
  (function () {
    var grid = document.querySelector('.media-grid');
    var cells = gsap.utils.toArray('.media-grid .gcell--title');
    if (!grid || !cells.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cells.sort(function (a, b) {
      var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (ra.top - rb.top) || (ra.left - rb.left);
    });
    gsap.fromTo(cells,
      { y: '2rem', opacity: 0 },
      { y: '0rem', opacity: 1, duration: 0.5, ease: 'power1.out',
        stagger: { amount: 0.5 },
        scrollTrigger: { trigger: grid, start: 'top bottom', end: 'top 50%',
          toggleActions: 'none play none reset' } });
  })();

  // works role videos — 参考站 image-wipe：四个视频同步擦入 + 略微放大（1.15→1）
  (function () {
    var grid = document.getElementById('roleGrid');
    if (!grid || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var masks = gsap.utils.toArray(grid.querySelectorAll('.wipe-mask'));
    var videos = gsap.utils.toArray(grid.querySelectorAll('video'));
    if (!masks.length) return;
    // 单一 trigger：四个视频一起擦入，不逐行触发
    // 先设初始态，再用一个 scrub 的 timeline 驱动全部 mask + video
    gsap.set(masks, { scaleX: 1 });
    gsap.set(videos, { scale: 1.15 });
    var tl = gsap.timeline({ paused: true })
      .to(masks, { scaleX: 0, duration: 1.25, ease: 'power3.inOut' }, 0)
      .to(videos, { scale: 1, duration: 1.5, ease: 'power3.inOut' }, 0);
    // 等四个视频都缓冲到可播放帧再擦遮罩，遮罩擦开时画面已在动而非静态封面。
    // 超时 3500ms 兜底：某个视频加载失败也不能让遮罩永远不擦。
    var wipeFired = false;
    function playWipe() { if (wipeFired) return; wipeFired = true; tl.play(); }
    function allReady() {
      return videos.every(function (v) { return v.dataset.ready || v.dataset.fallback; });
    }
    function onReady(e) {
      if (!videos.includes(e.detail && e.detail.video)) return;
      if (allReady()) { playWipe(); window.removeEventListener('videoready', onReady); }
    }
    window.addEventListener('videoready', onReady);
    var wipeTimer = null;
    ScrollTrigger.create({
      trigger: grid, start: 'top 80%', end: 'top 30%',
      onEnter: function () {
        if (allReady()) { playWipe(); return; }
        // 兜底超时：即使视频没备好也擦开，避免长期停在封面
        wipeTimer = setTimeout(playWipe, 3500);
      },
      onLeaveBack: function () {
        if (wipeTimer) { clearTimeout(wipeTimer); wipeTimer = null; }
        tl.reverse();
      }
    });
  })();

  // reveal — staggered fade like reference stagger-fade
  gsap.utils.toArray('.reveal').forEach(function (el) {
    gsap.to(el, {
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
      opacity: 1, y: 0, duration: 0.6, ease: 'power2.out'
    });
  });

  // dynamic text fill — from reference index.js T()
  function fitText() {
    document.querySelectorAll('[data-fill]').forEach(function (el) {
      el.style.fontSize = '';
      var parentW = el.parentElement.clientWidth - 4;
      var cur = parseFloat(getComputedStyle(el).fontSize);
      var w = el.scrollWidth;
      if (w > 0) el.style.fontSize = (parentW / w * cur) + 'px';
    });
  }

  // 首屏特效"刚进页面触发不了"的根治：字体、图片、Swiper 都会改变布局，
  // 而 ScrollTrigger 只在初始化时测量一次触发点。任何布局变化后都必须 refresh，
  // 否则 hero 的 start/end 位置是旧值，滚动时动画不触发或位置错乱。
  var refreshRaf = null;
  function refreshAll() {
    fitText();
    if (refreshRaf) cancelAnimationFrame(refreshRaf);
    // 双 rAF：等样式重排 + 绘制完成后再测量，坐标最稳
    refreshRaf = requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });
  }
  fitText();
  window.addEventListener('load', refreshAll);
  // 字体就绪后 refresh（字体加载会改变 h1/font-size 与测量盒）
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshAll);
  // 首屏 4 张图逐张加载完也 refresh（object-fit 下不影响 hero 高度，但保险起见）
  var heroImgs = document.querySelectorAll('.hero-swiper img');
  var heroImgLeft = heroImgs.length;
  heroImgs.forEach(function (img) {
    if (img.complete) { heroImgLeft--; }
    else img.addEventListener('load', function () { if (--heroImgLeft <= 0) refreshAll(); }, { once: true });
  });
  // 兜底：DOMContentLoaded 后 300ms 强制 refresh 一次，覆盖以上事件都错过的情况
  setTimeout(refreshAll, 300);

  // menu overlay
  var menuBtn = document.getElementById('menuBtn');
  var overlay = document.getElementById('overlay');
  var closeBtn = document.getElementById('closeBtn');
  menuBtn.addEventListener('click', function () { overlay.classList.add('open'); });
  closeBtn.addEventListener('click', function () { overlay.classList.remove('open'); });
  overlay.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { overlay.classList.remove('open'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') overlay.classList.remove('open');
  });

  // 横屏引导提示：可关闭，localStorage 记住选择
  (function () {
    var tip = document.getElementById('rotateTip');
    var close = document.getElementById('rotateTipClose');
    if (!tip || !close) return;
    var KEY = 'chenRotateTipDismissed';
    try { if (localStorage.getItem(KEY) === '1') tip.classList.add('hidden'); } catch (e) {}
    close.addEventListener('click', function () {
      tip.classList.add('hidden');
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
    });
    // 滚出首屏后自动淡出，避免全程悬浮遮挡底部内容
    var ticking = false;
    function onScrollTip() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        if (window.scrollY > window.innerHeight * 0.6) tip.classList.add('hidden');
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScrollTip, { passive: true });
  })();

  // 横竖屏切换：让所有 ScrollTrigger 重新测量（布局断点变化后必须 refresh）
  var rzTimer = null;
  function refreshOnRotate() {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(function () {
      refreshAll();
    }, 250);
  }
  window.addEventListener('orientationchange', refreshOnRotate);
  window.addEventListener('resize', refreshOnRotate);
})();
