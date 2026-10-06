// Мобильное меню, плавающая кнопка связи, концепты и пасхалка.
// Использует `lenis` и `reduceMotion` из main.js.

/* ---------- Мобильное меню ---------- */
(() => {
  const burger = document.querySelector('.burger');
  const menu = document.querySelector('.mmenu');
  if (!burger || !menu) return;
  const links = menu.querySelectorAll('.mmenu-links a');
  let open = false;

  function toggle(state) {
    open = state;
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.setAttribute('aria-hidden', !open);
    document.querySelector('.nav').classList.remove('hidden');
    if (open) {
      lenis && lenis.stop();
      gsap.set(menu, { visibility: 'visible' });
      gsap.to(menu, { clipPath: 'circle(150% at calc(100% - 6vw - 24px) 42px)', duration: 0.8, ease: 'power3.inOut' });
      gsap.fromTo(links, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.06, delay: 0.25, ease: 'power3.out' });
    } else {
      lenis && lenis.start();
      gsap.to(menu, {
        clipPath: 'circle(0% at calc(100% - 6vw - 24px) 42px)', duration: 0.6, ease: 'power3.inOut',
        onComplete: () => { if (!open) gsap.set(menu, { visibility: 'hidden' }); },
      });
    }
  }

  burger.addEventListener('click', () => toggle(!open));
  // ссылки прокручивает main.js, здесь только закрываем меню
  links.forEach(a => a.addEventListener('click', () => toggle(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && open) toggle(false); });
  addEventListener('resize', () => { if (open && innerWidth > 900) toggle(false); });
})();

/* ---------- Плавающая кнопка связи ---------- */
(() => {
  const fab = document.querySelector('.fab');
  if (!fab) return;
  const btn = fab.querySelector('.fab-btn');
  const panel = fab.querySelector('.fab-panel');

  // бот из js/config.js — сразу запускает анкету (?start=site)
  const bot = window.SITE_CONFIG && window.SITE_CONFIG.telegramBot;
  if (bot) {
    panel.insertAdjacentHTML('beforeend',
      `<a href="https://t.me/${bot}?start=site" class="fab-link" target="_blank" rel="noopener">Обсудить в Telegram</a>`);
  }

  const setOpen = state => {
    fab.classList.toggle('open', state);
    btn.setAttribute('aria-expanded', state);
  };
  btn.addEventListener('click', () => setOpen(!fab.classList.contains('open')));
  panel.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('click', e => { if (!fab.contains(e.target)) setOpen(false); });

  // показываем после главного экрана и прячем у формы заявки — там она не нужна
  let pastHero = false, atContact = false;
  const update = () => {
    const show = pastHero && !atContact;
    fab.classList.toggle('show', show);
    if (!show) setOpen(false);
  };
  ScrollTrigger.create({ trigger: '.hero', start: 'bottom 60%', end: 'max', onToggle: s => { pastHero = s.isActive; update(); } });
  ScrollTrigger.create({ trigger: '#contact', start: 'top 80%', end: 'bottom top', onToggle: s => { atContact = s.isActive; update(); } });
})();

/* ---------- Концепты: вкладки и живые элементы мини-сайтов ---------- */
(() => {
  const section = document.querySelector('.concepts');
  if (!section) return;
  const tabs = section.querySelectorAll('.c-tab');
  const pages = section.querySelectorAll('.cpt');
  const view = section.querySelector('.c-view');
  const url = section.querySelector('.c-url');

  tabs.forEach(tab => tab.addEventListener('click', () => {
    const i = +tab.dataset.c;
    tabs.forEach(t => {
      t.classList.toggle('active', t === tab);
      t.setAttribute('aria-selected', t === tab);
    });
    pages.forEach((p, j) => p.classList.toggle('active', j === i));
    url.textContent = tab.dataset.url;
    view.scrollTop = 0;
    if (!reduceMotion) gsap.fromTo(pages[i], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
  }));

  // кофейня: корзина
  const cart = section.querySelector('.cc-cart');
  const count = section.querySelector('.cc-count');
  let n = 0;
  section.querySelectorAll('.cc-add').forEach(b => b.addEventListener('click', () => {
    count.textContent = ++n;
    cart.classList.remove('bump');
    void cart.offsetWidth; // перезапуск анимации
    cart.classList.add('bump');
  }));

  // барбершоп: онлайн-запись
  const done = section.querySelector('.cb-done');
  const slots = section.querySelectorAll('.cb-slots button:not(:disabled)');
  slots.forEach(b => b.addEventListener('click', () => {
    slots.forEach(s => s.classList.toggle('picked', s === b));
    done.textContent = `Вы записаны на завтра, ${b.textContent} ✓`;
    done.classList.add('ok');
  }));

  // стоматология: квиз
  const res = section.querySelector('.cd-res');
  const opts = section.querySelectorAll('.cd-opts button');
  opts.forEach(b => b.addEventListener('click', () => {
    opts.forEach(o => o.classList.toggle('picked', o === b));
    res.classList.add('show');
  }));
})();

/* ---------- Пасхалка: зажмите мышь на пустом месте — сайт затянет в чёрную дыру ---------- */
(() => {
  if (reduceMotion || !window.vortex) return;
  const main = document.querySelector('main');
  const HOLD = 1.4; // секунд удержания
  const INTERACTIVE = 'a, button, input, textarea, label, p, h1, h2, h3, h4, li, .mock, .scene, .c-frame, .plan, .j-item, .faq-item, .stat, .nav, .fab, .mmenu';
  const toast = document.createElement('div');
  toast.className = 'egg-toast';
  toast.innerHTML = 'Вас затянуло в&nbsp;Магнетар<small>Вот так же сайт притягивает клиентов</small>';
  document.body.appendChild(toast);

  // Один запуск = одна «сессия» со своим списком блоков и своей анимацией.
  // Новый запуск сначала полностью сворачивает предыдущий — иначе они мешали
  // друг другу, и блок оставался наклонённым.
  let run = null;   // { targets, tl, swallowing }
  const props = 'transform,transformOrigin,opacity,willChange';

  function cleanup(r) {
    if (!r) return;
    r.tl && r.tl.kill();
    gsap.killTweensOf(r.targets);
    gsap.set(r.targets, { clearProps: props });
    if (run === r) {
      run = null;
      document.documentElement.classList.remove('egg-active');
      lenis && lenis.start();
    }
  }

  // Двигаем только блоки, которые сейчас на экране (а не всю страницу целиком) —
  // иначе браузер перерисовывает огромный слой и всё тормозит
  function visibleBlocks() {
    const c = window.vortex.center;
    return [...main.children].filter(el => {
      const r = el.getBoundingClientRect();
      if (!(r.bottom > 0 && r.top < innerHeight && r.height > 0)) return false;
      el.style.transformOrigin = `${c.x - r.left}px ${c.y - r.top}px`;
      el.style.willChange = 'transform, opacity';
      return true;
    });
  }

  function release() {
    const r = run;
    if (!r || r.swallowing) return;
    r.tl.kill();
    gsap.to(window.vortex, { boost: 0, duration: 0.6, overwrite: true });
    r.tl = gsap.to(r.targets, { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)', onComplete: () => cleanup(r) });
  }

  function swallow(r) {
    r.swallowing = true;
    r.tl = gsap.timeline({ onComplete: () => cleanup(r) })
      .to(r.targets, { scale: 0.02, rotation: 120, opacity: 0, duration: 0.7, ease: 'power3.in' })
      .to(toast, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, '-=0.1')
      .to({}, { duration: 1.4 })
      .to(toast, { opacity: 0, duration: 0.4 })
      .to(window.vortex, { boost: 0, duration: 0.8 }, '<')
      .to(r.targets, { scale: 1, rotation: 0, opacity: 1, duration: 1.2, ease: 'elastic.out(1, 0.5)' }, '<');
  }

  addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest(INTERACTIVE)) return;
    if (run && run.swallowing) return; // идёт затягивание — дождёмся конца
    cleanup(run);                       // предыдущий возврат ещё пружинит — сворачиваем
    const r = run = { targets: visibleBlocks(), swallowing: false };
    document.documentElement.classList.add('egg-active');
    lenis && lenis.stop();
    r.tl = gsap.timeline({ onComplete: () => swallow(r) })
      .to(window.vortex, { boost: 1, duration: HOLD, ease: 'power2.in', overwrite: true })
      .to(r.targets, { scale: 0.85, rotation: 6, duration: HOLD, ease: 'power2.in' }, 0);
  });
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
})();
