"use strict";
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
  var heroH1 = document.querySelector('#heroInner h1');
  var fly = null;
  if (window.innerWidth > 860 && heroH1) {
    fly = document.createElement('div');
    fly.className = 'name-fly';
    fly.textContent = heroH1.textContent;
    document.body.appendChild(fly);
    var brandName = document.querySelector('#brandName');

    function layoutFly() {
      var hr = heroH1.getBoundingClientRect();
      var br = brandName.getBoundingClientRect();
      var hSize = parseFloat(getComputedStyle(heroH1).fontSize);
      var bSize = parseFloat(getComputedStyle(brandName).fontSize);
      var scale = bSize / hSize;
      // 初始：固定在 h1 当前视口位置，原始字号
      gsap.set(fly, { x: hr.left, y: hr.top, scale: 1, fontSize: hSize + 'px' });
      gsap.set(heroH1, { opacity: 0 });
      if (layoutFly.tween) layoutFly.tween.kill();
      layoutFly.tween = gsap.to(fly, {
        x: br.left, y: br.top, scale: scale, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 55%',
          scrub: 0.4, invalidateOnRefresh: true }
      });
    }
    layoutFly();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutFly);
    window.addEventListener('resize', layoutFly);
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

  // showreel — autoplay muted when scrolled into view, pause when out
  var reel = document.getElementById('showreel');
  if (reel && 'IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { var p = reel.play(); if (p && p.catch) p.catch(function () {}); }
        else { reel.pause(); }
      });
    }, { threshold: 0.35 });
    ro.observe(reel);
  }

  // footer portrait — 视差：随滚动照片上移/回退（scrub 双向跟随）
  var fportrait = document.querySelector('.footer-portrait img');
  if (fportrait) {
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
    ScrollTrigger.create({
      trigger: grid, start: 'top 80%', end: 'top 30%',
      onEnter: function () { tl.play(); },
      onLeaveBack: function () { tl.reverse(); }
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
  window.addEventListener('load', fitText);
  window.addEventListener('resize', fitText);

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
})();
