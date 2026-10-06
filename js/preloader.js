// Заставка: буквы «Магнетар» слетаются к центру, счётчик доходит до 100,
// затем всё проваливается в точку и открывается сайт.
// window.siteReady выполняется, когда сайт начинает открываться — по нему
// стартуют анимации главного экрана.
window.siteReady = new Promise(resolve => {
  const pl = document.querySelector('.preloader');
  const root = document.documentElement;
  const cleanup = () => { pl && pl.remove(); root.classList.remove('is-loading'); };
  if (!pl) { resolve(); return; }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // полную заставку показываем один раз за визит, дальше — короткое затухание
  let seen = false;
  try {
    seen = sessionStorage.getItem('mg-seen') === '1';
    sessionStorage.setItem('mg-seen', '1');
  } catch (e) { /* хранилище недоступно — просто покажем заставку */ }

  if (reduceMotion) { cleanup(); resolve(); return; }
  root.classList.add('is-loading');

  if (seen) {
    gsap.to(pl, { opacity: 0, duration: 0.4, delay: 0.1, onStart: resolve, onComplete: cleanup });
    return;
  }

  const word = pl.querySelector('.pl-word');
  word.innerHTML = [...'Магнетар'].map(ch => `<span>${ch}</span>`).join('');
  const letters = word.querySelectorAll('span');
  const count = pl.querySelector('.pl-count');
  const ring = pl.querySelector('.pl-ring');
  const c = { v: 0 };
  const showCount = () => { count.textContent = Math.round(c.v); };

  // буквы прилетают из разных сторон — притяжение
  gsap.from(letters, {
    x: () => gsap.utils.random(-420, 420),
    y: () => gsap.utils.random(-320, 320),
    rotation: () => gsap.utils.random(-180, 180),
    scale: 0.3, opacity: 0,
    duration: 0.8, ease: 'expo.out', stagger: 0.03,
  });
  gsap.to(c, { v: 90, duration: 0.9, ease: 'power2.out', onUpdate: showCount });

  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const minTime = new Promise(r => setTimeout(r, 900));

  // смещение каждой буквы к центру слова
  const toCenter = axis => (i, el) => {
    const r = el.getBoundingClientRect(), w = word.getBoundingClientRect();
    return axis === 'x' ? (w.left + w.width / 2) - (r.left + r.width / 2) : 0;
  };

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    gsap.timeline({ onComplete: cleanup })
      .to(c, { v: 100, duration: 0.2, onUpdate: showCount })
      .to(letters, { x: toCenter('x'), scale: 0, rotation: 220, duration: 0.5, ease: 'power3.in', stagger: { each: 0.025, from: 'edges' } })
      .to(ring, { scale: 0, duration: 0.4, ease: 'power3.in' }, '<0.1')
      .to(count, { opacity: 0, duration: 0.25 }, '<')
      .call(resolve)
      .to(pl, { clipPath: 'circle(0% at 50% 50%)', duration: 0.7, ease: 'power3.inOut' });
  };
  // ждём только шрифты (без них буквы «прыгнут») — не всю страницу целиком
  Promise.all([fonts, minTime]).then(finish);
  // страховка: на медленном интернете не держим человека дольше 2,5 секунды
  setTimeout(finish, 2500);
});
