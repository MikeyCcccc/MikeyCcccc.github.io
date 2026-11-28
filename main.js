"use strict";
// 标记脚本可用：隐藏态只在 .js 下生效，脚本失败时内容默认可见（gate 62）
document.documentElement.classList.add('js');
(function () {
  gsap.registerPlugin(ScrollTrigger);
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // hero swiper — from reference: slide + parallax + autoplay 2s
  new Swiper('.hero-swiper', {
    effect: 'slide', loop: true, parallax: true,
    slidesPerView: 1, speed: 1000,
    autoplay: { delay: 2200 }
  });

  // work experience — FOUNDERS 版式：三张素材随滚动整体上移，叠压到大字上
  (function () {
    var fxCards = gsap.utils.toArray('.fx-card');
    var fxSec = document.querySelector('.work-exp');
    if (!fxCards.length || !fxSec) return;
    if (reduceMotion) { gsap.set(fxCards, { opacity: 1, y: 0 }); return; }
    // 文字区 sticky 贴顶固定，素材在其上继续上移叠入。
    // scrub 绑定整个 200vh section：sticky 周期内素材由下方升到文字区并继续上移。
    gsap.fromTo(fxCards,
      { y: function () { return window.innerHeight * 0.55; }, opacity: 0 },
      { y: -window.innerHeight * 0.18, opacity: 1, ease: 'none', stagger: 0.05,
        scrollTrigger: { trigger: fxSec, start: 'top top', end: 'bottom bottom', scrub: 0.7,
          invalidateOnRefresh: true } }
    );
  })();

  // hero — 大标题随下滑精确飞到 nav 的 ACTOR·DANCER 上方（brand-name 位置）
  // 关键修复：起止坐标全部用「函数式值」，ScrollTrigger 每次 refresh 都重新测量。
  // 用「h1 相对 hero 的偏移」而非绝对视口坐标 —— 该差值与当前滚动位置无关，
  // 因此用户在字体/图片加载完成前就滚动，也不会算出错误的起点导致动画不触发。
  var heroH1 = document.querySelector('#heroInner h1');
  var fly = null;
  var heroEl = document.querySelector('.hero');
  // 桌面与手机都启用（手机竖屏也要有标题飞入顶栏的特效），仅尊重减弱动效偏好
  if (!reduceMotion && heroH1 && heroEl) {
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
    // 给大标题和 ACTOR·DANCER 用相同的滚动区间，确保严格同步：
    // 陈翰霖飞入左上角的同时，ACTOR·DANCER 右移让位。
    // 注意：两个 ScrollTrigger 必须用各自独立的配置对象。共用同一对象会被
    // ScrollTrigger 注入内部引用而冲突，导致 scrub 动画卡在中途（实测卡在 68%）。
    function navTrigger() {
      return { trigger: '.hero', start: 'top top', end: 'bottom 55%',
        scrub: 0.4, invalidateOnRefresh: true };
    }
    gsap.fromTo(fly,
      { x: flyStartX, y: flyStartY, scale: 1, fontSize: function () { return getComputedStyle(heroH1).fontSize; } },
      {
        x: flyEndX, y: flyEndY, scale: flyScale, ease: 'none', immediateRender: true,
        scrollTrigger: navTrigger()
      });
    // ACTOR·DANCER 初始左移到左上角（占 brandName 的位置），随下滑右移回原位让位。
    // 用 offsetLeft 差值（不含 transform，避免测量循环），与标题飞行同步。
    var brandSmall = document.querySelector('.brand small');
    if (brandSmall) {
      gsap.fromTo(brandSmall,
        { x: function () { return brandName.offsetLeft - brandSmall.offsetLeft; } },
        { x: 0, ease: 'none', immediateRender: true, scrollTrigger: navTrigger() });
    }
  }

  if (!reduceMotion) {
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
    // 预加载：距视口 2200px 就开始下载缓冲（境外源站慢，快速滑动也要提前备好）
    var preloadObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          attachVideoSource(e.target);
          preloadObserver.unobserve(e.target);
        }
      });
    }, { rootMargin: '2200px 0px', threshold: 0 });
    // 播放：真正有数据（readyState>=3）才 play，避免无脑 play 卡在第一帧
    function doPlay(v) {
      if (v.dataset.want !== '1') return;   // 可能已滑出视口
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    function playWhenReady(v) {
      v.dataset.want = '1';
      attachVideoSource(v);
      if (v.readyState >= 3) { doPlay(v); return; }
      // 数据还没到：等首帧就绪再播，而不是让 play() 请求挂起卡住
      v.addEventListener('loadeddata', function () { doPlay(v); }, { once: true });
      v.addEventListener('canplay', function () { doPlay(v); }, { once: true });
    }
    var playObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          playWhenReady(v);
        } else {
          v.dataset.want = '0';
          if (v.src) v.pause();
        }
      });
    }, { rootMargin: '120px 0px', threshold: 0.01 });
    lazyVideos.forEach(function (v) {
      preloadObserver.observe(v);   // rotor 片段也提前缓冲，保证轮播切换不卡
      // rotor 内的视频由下方轮播器单独接管，避免默认播放器和轮播同时 play
      if (!v.hasAttribute('data-rotor')) playObserver.observe(v);
    });
    // 作品页视频被 GSAP 初始移到视口下方，观察器要滚到附近才赋 src，
    // 境外源站下载慢导致滑出时仍卡第一帧。首屏加载后主动分批预载，错开带宽争抢：
    // 先预载铺底 showreel，2 秒后再预载四个卡片视频。
    var bgReel = document.querySelector('#showreel');
    if (bgReel && bgReel.hasAttribute('data-src')) { bgReel.preload = 'auto'; attachVideoSource(bgReel); }
    setTimeout(function () {
      [].slice.call(document.querySelectorAll('.role--stack video')).forEach(function (v) {
        if (v.hasAttribute('data-src')) { v.preload = 'auto'; attachVideoSource(v); }
      });
    }, 2000);
  } else {
    // 老浏览器兜底：直接加载全部（rotor 视频由轮播器自行加载）
    [].slice.call(document.querySelectorAll('video[data-src]:not([data-rotor])')).forEach(function (v) {
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

  // 杂志墙：每格两个片段循环轮播（右上 GIF→视频，左下 视频→视频）
  // 进入视口才开始，离开即暂停并清掉定时器，避免后台偷偷播放。
  [].slice.call(document.querySelectorAll('.reel-rotor[data-rotor]')).forEach(function (rotor) {
    var items = [].slice.call(rotor.querySelectorAll('.reel-item'));
    if (items.length < 2) return;
    // 右上格第一个是短 GIF（约 1.7s）：只让它完整播一次就切，避免视觉上重复三次
    var gifHold = rotor.closest('.gcell--tr') ? 1700 : 3500;
    var idx = 0, timer = null, running = false;

    function armTimer(ms) { clearTimeout(timer); timer = setTimeout(next, ms); }
    function playItem(item) {
      if (item.tagName === 'VIDEO') {
        attachVideoSource(item);
        var started = 0;
        // 片段播完若不足 2.5s 就补足停留，避免短片一闪而过（用户要的约 3s 节奏）
        item.onended = function () {
          clearTimeout(timer);
          timer = setTimeout(next, started ? Math.max(0, 2500 - (Date.now() - started)) : 0);
        };
        var kick = function () {
          if (!running || !item.classList.contains('is-active')) return;
          started = Date.now();
          var p = item.play();
          if (p && p.catch) p.catch(function () {});
        };
        if (item.readyState >= 3) kick();
        else {
          item.addEventListener('loadeddata', kick, { once: true });
          item.addEventListener('canplay', kick, { once: true });
        }
        // 兜底：境外源站首帧可能要数秒，视频尚未就绪时不能切换（否则刚切到就切走，永远播不到）。
        // 只在数据到达(readyState>=2)后才启动 9s 防卡计时；未就绪则 2s 复查一次，最长等 20s。
        var waitForData = 0;
        (function armFallback() {
          clearTimeout(timer);
          if (item.readyState >= 2) { armTimer(9000); return; }
          waitForData += 2000;
          if (waitForData > 20000) { if (running) next(); return; }
          timer = setTimeout(function () { if (running && !item.classList.contains('is-active')) return; armFallback(); }, 2000);
        })();
      } else {
        // GIF 片段定时切换；但下一段是视频时，若它尚未缓冲好就顺延，避免切到黑帧/空帧
        var nextItem = items[(idx + 1) % items.length];
        var goNext = function () {
          if (!running) return;
          if (nextItem.tagName === 'VIDEO' && nextItem.readyState < 2) {
            timer = setTimeout(goNext, 400); // 视频还没首帧，等它（最长由外层兜底接管）
            return;
          }
          next();
        };
        timer = setTimeout(goNext, gifHold);
      }
    }
    function next() {
      if (!running) return;
      clearTimeout(timer); timer = null;
      var cur = items[idx];
      cur.onended = null;
      if (cur.tagName === 'VIDEO') { cur.pause(); try { cur.currentTime = 0; } catch (e) {} }
      cur.classList.remove('is-active');
      idx = (idx + 1) % items.length;
      var nxt = items[idx];
      nxt.classList.add('is-active');
      playItem(nxt);
    }
    function startRotor() {
      if (running) return;
      running = true;
      idx = 0;
      items.forEach(function (it, i) {
        it.classList.toggle('is-active', i === 0);
        if (it.tagName === 'VIDEO' && i !== 0) { it.pause(); try { it.currentTime = 0; } catch (e) {} }
      });
      playItem(items[0]);
    }
    function stopRotor() {
      running = false;
      clearTimeout(timer); timer = null;
      items.forEach(function (it) {
        it.onended = null;
        if (it.tagName === 'VIDEO') it.pause();
      });
    }
    if ('IntersectionObserver' in window) {
      var rotorObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) startRotor(); else stopRotor(); });
      }, { rootMargin: '60px 0px', threshold: 0.05 });
      rotorObserver.observe(rotor);
    } else {
      startRotor();
    }
  });

  // footer portrait — 视差：随滚动照片上移/回退（scrub 双向跟随）
  // 竖屏下整图铺底、人脸固定落在右侧清晰区，禁用视差避免人脸被推走；横屏/桌面保留
  var fportrait = document.querySelector('.footer-portrait img');
  if (fportrait && !(window.innerWidth <= 860 && window.matchMedia('(orientation: portrait)').matches)) {
    gsap.fromTo(fportrait,
      { yPercent: -4 },
      { yPercent: 4, ease: 'none',
        scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom',
          scrub: 0.6, invalidateOnRefresh: true }
      });
  }

  // theater filmstrip — 初始只露第一张图顶部一小截 + 星星占位，下滑时照片向上划入
  var strip = document.querySelector('.theater-strip');
  var visual = document.querySelector('.theater-visual');
  if (strip && visual) {
    gsap.fromTo(strip,
      // 起点：第一张照片顶部正好落在容器最底边（100%），完全贴底不外露，下滑才升起
      { y: function () { return visual.clientHeight * 1.0; } },
      // 终点：最后一张照片底边正好贴住容器最底边（不留空白条），签名压在其下缘并破到下一页
      { y: function () { return -(strip.scrollHeight - visual.clientHeight); },
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
  // 不做 opacity 动画：半透明会透出黑底、让照片发灰像蒙了黑罩。始终不透明，只保留位移+旋转。
  gsap.fromTo('#eduPhoto',
    { yPercent: 62, rotation: 16, opacity: 1 },
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

  // works — 参考 sophiaamoruso：底视频铺满，斜卡片逐个「滑入→停留→向上滑出」，标题随首个卡片滑出而上移消失
  (function () {
    var sec = document.querySelector('.works');
    var stage = document.querySelector('.works-stage');
    var cards = gsap.utils.toArray('.role--stack');
    var head = document.querySelector('.works-headline');
    if (!sec || !stage || !cards.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set('.role--stack .wipe-mask', { scaleX: 0 });
      gsap.set('.role--stack video', { scale: 1 });
      gsap.set(cards, { opacity: 1, yPercent: 0 });
      return;
    }

    // 每张卡片初始：藏在其目标位置下方，带自身旋转角（无擦入遮罩、无缩放，整体出现）
    cards.forEach(function (card) {
      var rot = getComputedStyle(card).getPropertyValue('--rot').trim() || '0deg';
      gsap.set(card, { rotation: rot, yPercent: 135, opacity: 0, transformOrigin: 'center center' });
    });
    gsap.set('.role--stack .wipe-mask', { scaleX: 0 });  // 遮罩常开（不遮挡），直接整卡出现
    gsap.set('.role--stack video', { scale: 1 });

    // 四张卡片分两组：每组两张先错开滑入（左-右），第二个一到位就「锁定相对位置」同时整体上滑，
    // 且这一组上滑必须早于下一组出现——不能等第三张全现后才移第一二张。
    var tl = gsap.timeline({
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.7,
        invalidateOnRefresh: true }
    });
    var gap = 0.85, step = 0.4, inDur = 0.7, outDur = 0.75, groupGap = 1.35;
    // 每组：g=0 → 卡片1/2；g=1 → 卡片3/4
    [0, 2].forEach(function (start, g) {
      var pair = [cards[start], cards[start + 1]].filter(Boolean);
      var groupAt = gap + g * groupGap;
      pair.forEach(function (card, j) {
        var at = groupAt + j * step;
        // 出现：瞬间显示（不淡入）+ 从下方滑入到位，无擦入遮罩、无缩放
        tl.set(card, { opacity: 1 }, at);
        tl.to(card, { yPercent: 0, ease: 'power2.out', duration: inDur }, at);
      });
      // 第二张滑入开始时刻(groupAt+step) + inDur = 第二张全现；紧接其后立刻整组上滑。
      // 下一组在 groupAt+groupGap 才开始出现，晚于本组上滑起点，确保「第二个出来就移，不等第三个」。
      var slideOutAt = groupAt + step + inDur + 0.05;
      pair.forEach(function (card) {
        // 消失：纯位移上滑出视口，划出后瞬间隐藏（不淡出）
        tl.to(card, { yPercent: -150, ease: 'power2.in', duration: outDur }, slideOutAt);
        tl.set(card, { opacity: 0 }, slideOutAt + outDur);
      });
    });

    // 标题：必须与卡片共用同一条 timeline（同时间基准）。
    // 若另起独立 timeline，scrub 会把它自己的 short duration 重新映射到整个滚动区间，
    // 导致标题在中段仍可见。合并后按绝对时间：从 0 上移，第一个卡片全现(gap+inDur)时精确归零。
    if (head) {
      tl.to(head, { y: -200, opacity: 0, ease: 'power1.in', duration: gap + inDur }, 0);
    }
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
  // 竖屏 footer：让人像底图容器底边精确落在 footer-bottom 顶部的横线上。
  // 写死 rem 会因字体/换行/视口变化而错位（实测有 3.8px 缝隙），改为动态测量。
  function syncFooterPortraitBottom() {
    var portrait = document.querySelector('.footer-portrait');
    var rule = document.querySelector('.footer-bottom');
    var footer = document.querySelector('.footer');
    if (!portrait || !rule || !footer) return;
    var isPortrait = window.innerWidth <= 860 && window.matchMedia('(orientation: portrait)').matches;
    if (!isPortrait) { footer.style.removeProperty('--fpor-bottom'); return; }
    // portrait 是 absolute（相对 footer 定位），其底边距 footer 底边正好等于 --fpor-bottom。
    // 横线到 footer 底边的距离 = footer.bottom - rule.top，把它赋给 --fpor-bottom 即精确对齐。
    // portrait 脱离文档流，改这个值不会反过来影响横线位置，测量稳定。
    var dist = footer.getBoundingClientRect().bottom - rule.getBoundingClientRect().top;
    footer.style.setProperty('--fpor-bottom', Math.max(0, dist).toFixed(2) + 'px');
  }

  // 剧场数字对齐：让"观众人数 / 300,000+"各自左边缘贴"线"左、右边缘贴"场"右（即四字整行宽度）。
  // 两行字数不同，各自独立按目标宽度反算字号（等比缩放字高，不变形）。
  function alignTheaterBig() {
    var copy = document.querySelector('.theater-copy');
    var spans = document.querySelectorAll('.theater-top span');
    var mid = document.querySelector('.theater-mid');
    if (!copy || !mid || spans.length < 4) return;
    // 仅桌面端对齐；手机端（竖屏/横屏）四字紧凑，用户要求保持原样
    if (window.innerWidth <= 860) {
      mid.style.removeProperty('margin-left');
      mid.style.removeProperty('width');
      [].slice.call(mid.querySelectorAll('.theater-big')).forEach(function (el) { el.style.removeProperty('font-size'); });
      return;
    }
    // 用 Range 测「墨迹」边缘：letter-spacing 负值会让 scrollWidth 末尾留空白，
    // 导致盒子对齐了但视觉墨迹没到边（用户反馈右边差一截）。改按真实墨迹对齐。
    function inkEdge(el, side) {
      var rg = document.createRange();
      rg.selectNodeContents(el);
      var rects = [].slice.call(rg.getClientRects());
      if (!rects.length) return side === 'right' ? el.getBoundingClientRect().right : el.getBoundingClientRect().left;
      return side === 'right'
        ? Math.max.apply(null, rects.map(function (r) { return r.right; }))
        : Math.min.apply(null, rects.map(function (r) { return r.left; }));
    }
    var xianInkL = inkEdge(spans[0], 'left');   // 线 墨迹左
    var changInkR = inkEdge(spans[3], 'right'); // 场 墨迹右
    var copyL = copy.getBoundingClientRect().left;
    var targetL = xianInkL - copyL;
    var targetW = changInkR - xianInkL;
    if (targetW <= 0) return;
    mid.style.marginLeft = targetL.toFixed(2) + 'px';
    mid.style.width = targetW.toFixed(2) + 'px';
    [].slice.call(mid.querySelectorAll('.theater-big')).forEach(function (el) {
      el.style.fontSize = '';
      var base = parseFloat(getComputedStyle(el).fontSize); // CSS clamp 基准
      var natural = el.scrollWidth;
      if (natural <= 0) return;
      var fs = base * targetW / natural;
      el.style.fontSize = fs.toFixed(2) + 'px';
      // 墨迹校准：把字号按「目标墨迹宽 / 当前墨迹宽」再缩放一次
      var inkW = inkEdge(el, 'right') - inkEdge(el, 'left');
      if (inkW > 0) el.style.fontSize = (fs * targetW / inkW).toFixed(2) + 'px';
    });
  }

  var refreshRaf = null;
  function refreshAll() {
    fitText();
    alignTheaterBig();
    if (refreshRaf) cancelAnimationFrame(refreshRaf);
    // 双 rAF：等样式重排 + 绘制完成后再测量，坐标最稳
    refreshRaf = requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        syncFooterPortraitBottom();
        alignTheaterBig();
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });
  }
  fitText();
  alignTheaterBig();
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
