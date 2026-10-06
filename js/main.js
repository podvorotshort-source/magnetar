gsap.registerPlugin(ScrollTrigger);

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Плавный скролл ---------- */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.08 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.4 });
  else target.scrollIntoView({ behavior: 'smooth' });
}

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target);
  });
});

/* ---------- Навигация: прячется при скролле вниз ---------- */
const nav = document.querySelector('.nav');
let lastY = 0;
function onScroll(y) {
  nav.classList.toggle('scrolled', y > 40);
  nav.classList.toggle('hidden', y > lastY && y > 300);
  lastY = y;
}
if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
else addEventListener('scroll', () => onScroll(scrollY), { passive: true });

/* ---------- Появление главного экрана ---------- */
// ждём заставку: скролл заблокирован, заголовок появляется, когда она раскрылась
if (lenis) lenis.stop();
if (!reduceMotion) {
  gsap.set('.hero h1 .word > span', { yPercent: 110 });
  gsap.set(['.hero-kicker', '.hero-sub', '.hero-actions'], { y: 30, opacity: 0 });
}
window.siteReady.then(() => {
  if (lenis) lenis.start();
  if (reduceMotion) return;
  gsap.to('.hero h1 .word > span', { yPercent: 0, duration: 1.2, ease: 'power4.out', stagger: 0.07, delay: 0.2 });
  gsap.to(['.hero-kicker', '.hero-sub', '.hero-actions'], { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.6 });
});

/* ---------- Курсор ----------
   Включается от движения именно мыши (а не по медиа-запросу при загрузке),
   поэтому не пропадает, если страница открылась в режиме телефона */
const cursor = document.querySelector('.cursor');
const isMouse = e => e.pointerType === 'mouse';
const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
addEventListener('pointermove', e => {
  cursor.classList.toggle('visible', isMouse(e));
  if (isMouse(e)) { xTo(e.clientX); yTo(e.clientY); }
});
document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('visible'));
document.addEventListener('pointerover', e => {
  cursor.classList.toggle('big', !!e.target.closest('[data-cursor]'));
});

/* ---------- Магнитные кнопки (вариант Г — пружинят) ---------- */
{
  document.querySelectorAll('[data-magnetic]').forEach(zone => {
    const btn = zone.querySelector('.btn');
    const inner = zone.querySelector('.mag-inner');
    const strength = parseFloat(zone.dataset.magnetic);
    zone.addEventListener('pointermove', e => {
      if (!isMouse(e)) return;
      const r = zone.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      gsap.to(btn, { x: x * strength, y: y * strength, duration: 0.6, ease: 'power3.out' });
      gsap.to(inner, { x: x * strength * 0.4, y: y * strength * 0.4, duration: 0.6, ease: 'power3.out' });
    });
    zone.addEventListener('pointerleave', () => {
      gsap.to([btn, inner], { x: 0, y: 0, duration: 1.4, ease: 'elastic.out(1.1, 0.3)' });
    });
  });
}

/* ---------- Манифест: слова проявляются при скролле ---------- */
document.querySelectorAll('[data-split]').forEach(el => {
  el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  gsap.to(el.querySelectorAll('.w'), {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
  });
});

/* ---------- Пакеты: появление ---------- */
if (!reduceMotion) {
  gsap.from('.plan', {
    y: 80, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12,
    scrollTrigger: { trigger: '.plans', start: 'top 80%' },
  });
}

/* ---------- Услуги: таймлайн с горизонтальным скроллом ----------
   Секция закрепляется, лента едет вбок, линия прорисовывается,
   а каждая услуга «вырастает» из линии, когда доезжает до середины экрана */
const track = document.querySelector('.j-track');
const trackDistance = () => Math.max(0, track.scrollWidth - innerWidth);
const slide = gsap.to(track, {
  x: () => -trackDistance(),
  ease: 'none',
  scrollTrigger: {
    trigger: '.journey',
    start: 'top top',
    end: () => '+=' + trackDistance(),
    pin: true,
    scrub: 1,
    invalidateOnRefresh: true,
  },
});

if (reduceMotion) {
  gsap.set('.j-bar', { scaleX: 1 });
} else {
  gsap.fromTo('.j-bar', { scaleX: 0 }, {
    scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: '.j-area', containerAnimation: slide, start: 'left 75%', end: 'right 95%', scrub: true },
  });

  document.querySelectorAll('.j-item').forEach(item => {
    gsap.timeline({
      // последняя услуга доезжает только до ~70% экрана, поэтому раскрытие заканчивается раньше
      scrollTrigger: { trigger: item, containerAnimation: slide, start: 'left 95%', end: 'left 72%', scrub: true },
    })
      .fromTo(item.querySelector('.j-stem'), { scaleY: 0 }, { scaleY: 1, duration: 0.4, ease: 'none' })
      .fromTo(item.querySelector('.j-dot'), { scale: 0 }, { scale: 1, duration: 0.4, ease: 'none' }, '<')
      .fromTo(item.querySelectorAll('.j-mask > *'), { yPercent: 110 }, { yPercent: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }, '-=0.2');
  });
}

/* ---------- Процесс: карточки складываются в стопку ---------- */
const cards = gsap.utils.toArray('.stack-card');
cards.forEach((card, i) => {
  card.style.top = `calc(12vh + ${i * 22}px)`;
  if (i === cards.length - 1) return;
  gsap.to(card, {
    scale: 0.92 - (cards.length - 2 - i) * 0.02,
    filter: 'brightness(0.6)',
    ease: 'none',
    scrollTrigger: { trigger: cards[i + 1], start: 'top 65%', end: 'top 12%', scrub: true },
  });
});

/* ---------- Оплата в конце: раскрытие кругом ---------- */
gsap.to('.guarantee-circle', {
  clipPath: 'circle(75% at 50% 50%)',
  ease: 'none',
  scrollTrigger: { trigger: '.guarantee', start: 'top top', end: '+=120%', pin: true, scrub: true },
});

/* ---------- Бегущая строка ускоряется от скорости скролла ---------- */
document.querySelectorAll('.marquee').forEach(m => {
  const inner = m.querySelector('.marquee-inner');
  const COPIES = 6;
  inner.innerHTML = inner.innerHTML.repeat(COPIES);
  const dir = parseFloat(m.dataset.dir);
  let x = 0;
  gsap.ticker.add(() => {
    const v = lenis ? Math.abs(lenis.velocity) : 0;
    x += (1 + v * 0.6) * dir;
    const w = inner.scrollWidth / COPIES;
    if (x <= -w) x += w;
    if (x >= 0) x -= w;
    inner.style.transform = `translateX(${x}px)`;
  });
});

/* ---------- Вопросы: аккордеон ---------- */
document.querySelectorAll('.faq-q').forEach(q => {
  const answer = q.nextElementSibling;
  q.addEventListener('click', () => {
    const open = q.getAttribute('aria-expanded') !== 'true';
    q.setAttribute('aria-expanded', open);
    gsap.to(answer, {
      height: open ? 'auto' : 0,
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: () => ScrollTrigger.refresh(),
    });
  });
});

/* ---------- Кнопка «Выбрать» в пакете отмечает его в форме ---------- */
document.querySelectorAll('[data-plan]').forEach(btn => {
  btn.addEventListener('click', () => {
    const radio = document.querySelector(`.choice input[value="${btn.dataset.plan}"]`);
    if (radio) radio.checked = true;
  });
});

/* ---------- Форма заявки ---------- */
// Заявка уходит в Google Apps Script, он присылает её вам в Telegram (см. backend/README.md)
const form = document.getElementById('form');
const formOpenedAt = Date.now();
const { formEndpoint, telegramBot } = window.SITE_CONFIG || {};
const submitBtn = form.querySelector('button[type="submit"] .mag-inner');

// кнопка «Обсудить в Telegram» под формой — когда указан бот
if (telegramBot) {
  form.insertAdjacentHTML('beforeend',
    `<p class="form-alt">или <a href="https://t.me/${telegramBot}?start=site" target="_blank" rel="noopener" data-cursor>заполните бриф в Telegram →</a></p>`);
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const note = form.querySelector('.form-note');
  const required = [...form.querySelectorAll('[required]')];
  let ok = true;
  required.forEach(input => {
    const empty = !input.value.trim();
    input.closest('.field').classList.toggle('invalid', empty);
    if (empty) ok = false;
  });
  if (!ok) {
    note.textContent = 'Заполните имя и контакт для связи';
    return;
  }
  if (!formEndpoint) {
    note.textContent = 'Форма пока не подключена — напишите мне напрямую';
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  submitBtn.textContent = 'Отправляем…';
  note.textContent = '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(formEndpoint, {
      method: 'POST',
      // text/plain — «простой» запрос, Apps Script принимает его без CORS-preflight
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...data, elapsedMs: Date.now() - formOpenedAt }),
      signal: controller.signal,
    });
    const answer = await res.json().catch(() => null);
    if (!answer || !answer.ok) throw new Error((answer && answer.error) || '');
    form.innerHTML = '<p class="form-done">Спасибо, заявка отправлена!<span>Скоро свяжусь с вами.</span></p>';
    ScrollTrigger.refresh();
  } catch (err) {
    submitBtn.textContent = 'Отправить заявку';
    note.textContent = err.message || 'Не получилось отправить. Попробуйте ещё раз через минуту.';
  } finally {
    clearTimeout(timer);
  }
});
