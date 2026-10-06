// Главный экран: чёрная дыра на фоне + макет лендинга, который собирается на глазах
(() => {
  const hero = document.querySelector('.hero');
  const vortex = document.querySelector('.vortex');
  const wrap = document.querySelector('.mock-wrap');
  const mock = document.querySelector('.mock');
  if (!hero || !mock) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Чёрная дыра (canvas) ----------
     Линии по спирали затягиваются в центр, который стоит за макетом */
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  vortex.appendChild(canvas);

  // на телефоне линий вдвое меньше — экран маленький, а процессор слабее
  const small = innerWidth < 700;
  const LINES = small ? 80 : 160, SEG = small ? 20 : 28;
  // линии задаём в единицах исходной сцены 696×316, центр в (0, 0)
  const lines = Array.from({ length: LINES }, () => {
    const a = Math.random() * Math.PI * 2;
    const r = 250 + Math.random() * 250;
    const twist = Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 2;
    const c1a = a - twist, c1r = r * 0.7;
    const c2a = a - twist / 2, c2r = r * 0.3;
    const duration = 6 + Math.random() * 8;
    return {
      p0: [r * Math.cos(a), r * Math.sin(a) * 0.5],
      p1: [c1r * Math.cos(c1a), c1r * Math.sin(c1a) * 0.6],
      p2: [c2r * Math.cos(c2a), c2r * Math.sin(c2a) * 0.8],
      width: 0.25 + Math.random() * 0.5,
      alpha: 0.08 + Math.random() * 0.3,
      color: Math.random() < 0.18 ? '255,91,46' : '242,240,235',
      duration,
      offset: Math.random() * duration, // линии уже в движении при загрузке
    };
  });

  // Холст на весь экран и закреплён — чёрная дыра видна на всём сайте
  let W = 0, H = 0, cx = 0, cy = 0, k = 1, dpr = 1, power = 1;
  function layoutVortex() {
    dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    k = Math.max(W, H * 696 / 316) / 696;
    if (reduceMotion) drawVortex(4000);
  }

  // На главном экране центр за макетом; при прокрутке плавно уходит
  // в сторону, а линии становятся тише, чтобы не мешать читать
  const lerp = (a, b, t) => a + (b - a) * t;
  function updateCenter() {
    const h = hero.getBoundingClientRect();
    const m = wrap.getBoundingClientRect();
    const mx = m.left + m.width / 2;
    const my = m.top + mock.offsetHeight / 2;
    const p = Math.min(1, Math.max(0, -h.top / h.height));
    const e = p * p * (3 - 2 * p);
    const restX = W < 700 ? W * 0.8 : W * 0.82;
    const restY = W < 700 ? H * 0.35 : H * 0.55;
    cx = lerp(mx, restX, e);
    cy = lerp(my, restY, e);
    // boost (0…1) — усиление для пасхалки: ярче, больше, быстрее
    power = lerp(1, 0.55, e) * (1 + 2.2 * vortexApi.boost);
  }

  // доступ к чёрной дыре из других скриптов (пасхалка в extras.js)
  const vortexApi = window.vortex = {
    boost: 0,
    get center() { return { x: cx, y: cy }; },
  };

  const bez = (a, b, c, t) => {
    const u = 1 - t;
    return u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0];
  };
  const bezY = (a, b, c, t) => {
    const u = 1 - t;
    return u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1];
  };

  function drawVortex(time) {
    updateCenter();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // свечение вокруг чёрной дыры
    const gr = 90 * k * (1 + vortexApi.boost);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
    glow.addColorStop(0, `rgba(255,91,46,${Math.min(0.9, 0.45 * power).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(255,91,46,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);

    ctx.lineCap = 'round';
    for (const l of lines) {
      const t = ((time / 1000 + l.offset) % l.duration) / l.duration;
      const fade = t < 0.5 ? t * 2 : (1 - t) * 2;
      if (fade <= 0.01) continue;
      ctx.strokeStyle = `rgba(${l.color},${Math.min(1, l.alpha * fade * power).toFixed(3)})`;
      ctx.lineWidth = l.width * k;
      ctx.beginPath();
      const n = Math.max(2, Math.round(SEG * t));
      for (let i = 0; i <= n; i++) {
        const s = (i / n) * t;
        const x = cx + bez(l.p0, l.p1, l.p2, s) * k;
        const y = cy + bezY(l.p0, l.p1, l.p2, s) * k;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }

    // сама чёрная дыра
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 44 * k);
    core.addColorStop(0, '#000');
    core.addColorStop(0.55, '#060607');
    core.addColorStop(0.75, 'rgba(14,14,16,.8)');
    core.addColorStop(1, 'rgba(14,14,16,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, 44 * k, 0, Math.PI * 2);
    ctx.fill();
  }

  // своё «время» линий: при усилении они летят быстрее
  let vt = 0, lastT = performance.now();
  function loop(now) {
    vt += Math.min(now - lastT, 100) * (1 + 5 * vortexApi.boost);
    lastT = now;
    drawVortex(vt);
    requestAnimationFrame(loop);
  }
  layoutVortex();
  addEventListener('resize', layoutVortex);
  document.fonts.ready.then(layoutVortex);
  if (!reduceMotion) requestAnimationFrame(loop);

  /* ---------- Сборка макета ---------- */
  const $ = s => mock.querySelector(s);
  const $$ = s => mock.querySelectorAll(s);
  const steps = document.querySelectorAll('.mock-steps li');
  const input = $('.m-input');
  const submit = $('.m-submit');
  const count = $('.m-count');
  const cursorEl = $('.m-cursor');
  const toast = $('.m-toast');
  const PHONE = input.textContent;

  const setStep = i => steps.forEach((li, j) => li.classList.toggle('active', j <= i));

  function resetTexts() {
    input.textContent = 'Ваш телефон';
    submit.textContent = 'Отправить';
    submit.classList.remove('done');
    count.textContent = '12';
    setStep(-1);
  }

  if (reduceMotion) {
    setStep(steps.length - 1);
    gsap.set(toast, { opacity: 1 });
    return;
  }

  // Точка внутри макета, куда «ведём» курсор
  const point = (el, fx = 0.5, fy = 0.5) => {
    const m = mock.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - m.left + r.width * fx, y: r.top - m.top + r.height * fy };
  };

  const navParts = [$('.m-logo'), ...$$('.m-links i'), $('.m-navbtn')];
  const titleWords = $$('.m-title > span');
  const cards = $$('.m-card');
  const typing = { n: 0 };

  const tl = gsap.timeline({ repeat: -1, paused: true });

  // исходное состояние каждого круга
  tl.set(mock, { scale: 0.15, rotation: -30, opacity: 0 }, 0)
    .set(navParts, { y: -15, opacity: 0 }, 0)
    .set($$('.m-line'), { scaleX: 0, transformOrigin: 'left center' }, 0)
    .set($('.m-img'), { clipPath: 'inset(50% 50% 50% 50%)' }, 0)
    .set(cards, { y: 30, opacity: 0 }, 0)
    .set($('.m-form'), { y: 20, opacity: 0 }, 0)
    .set([$('.m-tag'), $('.m-btn')], { scale: 0, opacity: 0 }, 0)
    .set(titleWords, { yPercent: 80, opacity: 0 }, 0)
    .set($$('.m-circle'), { scale: 0 }, 0)
    .set($$('.m-card i'), { scale: 0 }, 0)
    .set(cursorEl, { opacity: 0, scale: 1 }, 0)
    .set(toast, { opacity: 0, x: 40 }, 0)
    .set(typing, { n: 0 }, 0);

  // макет вылетает из чёрной дыры
  tl.to(mock, { scale: 1, rotation: 0, opacity: 1, duration: 1.1, ease: 'expo.out' }, 0.05);

  // 1. Структура
  tl.call(setStep, [0], 0.6)
    .to(navParts, { y: 0, opacity: 1, stagger: 0.06, duration: 0.4, ease: 'power3.out' }, 0.6)
    .to($$('.m-line'), { scaleX: 1, stagger: 0.1, duration: 0.5, ease: 'power3.out' }, 0.8)
    .to($('.m-img'), { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power3.inOut' }, 0.9)
    .to(cards, { y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: 'power3.out' }, 1.1)
    .to($('.m-form'), { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 1.4);

  // 2. Дизайн
  tl.call(setStep, [1], 2.1)
    .to($('.m-tag'), { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, 2.1)
    .to(titleWords, { yPercent: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: 'power3.out' }, 2.2)
    .to($('.m-btn'), { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2.5)' }, 2.6)
    .to($$('.m-circle'), { scale: 1, stagger: 0.12, duration: 0.7, ease: 'back.out(1.7)' }, 2.5)
    .to($$('.m-card i'), { scale: 1, stagger: 0.08, duration: 0.4, ease: 'back.out(2)' }, 2.8);

  // 3. Анимации
  tl.call(setStep, [2], 3.5)
    .to(cards, { y: '-1.5cqw', stagger: 0.1, duration: 0.3, yoyo: true, repeat: 1, ease: 'power2.out' }, 3.5)
    .to($('.m-circle--1'), { scale: 1.2, duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.inOut' }, 3.5)
    .to($('.m-circle--2'), { x: '6cqw', y: '4cqw', duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.inOut' }, 3.5)
    .to($('.m-btn'), { scale: 1.1, duration: 0.25, yoyo: true, repeat: 3, ease: 'power1.inOut' }, 3.7);

  // 4. Заявки: курсор вводит телефон и жмёт «Отправить»
  tl.call(setStep, [3], 4.8)
    .fromTo(cursorEl,
      { x: () => mock.offsetWidth * 0.95, y: () => mock.offsetHeight * 1.05, opacity: 0 },
      { x: () => point(input, 0.3).x, y: () => point(input, 0.3).y, opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 4.8)
    .to(typing, {
      n: PHONE.length, duration: 1, ease: 'none',
      onUpdate: () => { input.textContent = PHONE.slice(0, Math.round(typing.n)) || 'Ваш телефон'; },
    }, 5.7)
    .to(cursorEl, { x: () => point(submit).x, y: () => point(submit).y, duration: 0.6, ease: 'power2.inOut' }, 6.8)
    .to(cursorEl, { scale: 0.75, duration: 0.1, yoyo: true, repeat: 1 }, 7.45)
    .call(() => { submit.textContent = '✓ Готово'; submit.classList.add('done'); }, null, 7.5)
    .to(toast, { opacity: 1, x: 0, duration: 0.6, ease: 'back.out(1.7)' }, 7.7)
    .call(() => { count.textContent = '13'; }, null, 8.1)
    .to(cursorEl, { opacity: 0, duration: 0.4 }, 8.4);

  // макет затягивает обратно в чёрную дыру
  tl.to(mock, {
    scale: 0, rotation: 35, opacity: 0, duration: 0.9, ease: 'power3.in',
    onComplete: resetTexts,
  }, 10.6);

  resetTexts();
  // сборка стартует, когда открылась заставка
  let ready = false;
  window.siteReady.then(() => { ready = true; tl.play(); });

  // не крутим анимации, когда главный экран не виден
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && ready) tl.play(); else tl.pause();
  }).observe(hero);

  // при смене ширины пересчитываем путь курсора и начинаем сборку заново
  let lastW = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    resetTexts();
    tl.invalidate().restart();
  });
})();
