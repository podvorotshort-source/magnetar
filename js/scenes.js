// Живые сцены в карточках «Как я работаю» и цифры в блоке «Только код».
// Всё рисуется кодом — ни одной картинки.
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (tl, s) => tl.to({}, { duration: s });

  /* ---------- 1. Чат с клиентом ---------- */
  function chatScene(scene) {
    const msgs = scene.querySelectorAll('.msg');
    const typing = scene.querySelector('.typing');
    const tl = gsap.timeline({ repeat: -1, paused: true });
    tl.set(msgs, { display: 'none', opacity: 0, y: 10 })
      .set(typing, { display: 'none' });
    msgs.forEach(m => {
      const out = m.classList.contains('msg--out');
      tl.call(() => typing.classList.toggle('out', out))
        .set(typing, { display: 'flex' });
      wait(tl, 0.9);
      tl.set(typing, { display: 'none' })
        .set(m, { display: 'block' })
        .to(m, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
      wait(tl, 0.5);
    });
    wait(tl, 2.2);
    tl.to(msgs, { opacity: 0, duration: 0.4 });
    return tl;
  }

  /* ---------- 2. Чертёж прототипа ---------- */
  function wireScene(scene) {
    const shapes = scene.querySelectorAll('.w');
    const labels = scene.querySelectorAll('.wl');
    const tl = gsap.timeline({ repeat: -1, paused: true });
    tl.set(shapes, { strokeDashoffset: 1, fill: 'rgba(14,14,16,0)', opacity: 1 })
      .set(labels, { opacity: 0, x: -6 })
      .to(shapes, { strokeDashoffset: 0, duration: 0.7, stagger: 0.15, ease: 'power2.inOut' })
      .to(shapes, { fill: 'rgba(14,14,16,0.07)', duration: 0.4, stagger: 0.04 }, '-=0.3')
      .to(labels, { opacity: 1, x: 0, duration: 0.3, stagger: 0.25 });
    wait(tl, 2.5);
    tl.to([shapes, labels], { opacity: 0, duration: 0.5 });
    return tl;
  }

  /* ---------- 3. Серые блоки окрашиваются в дизайн ---------- */
  function designScene(scene) {
    const q = s => scene.querySelector(s);
    const grey = '#cfccc5';
    const paint = [
      [q('.d-logo'), '#0e0e10'],
      [q('.d-links'), 'rgba(14,14,16,0.25)'],
      [q('.d-t1'), '#0e0e10'],
      [q('.d-t2'), '#0e0e10'],
      [q('.d-p'), 'rgba(14,14,16,0.3)'],
      [q('.d-btn'), '#ff5b2e'],
      ...[...scene.querySelectorAll('.d-cards i')].map((el, i) => [el, ['#ff5b2e', '#3b3bff', '#0e0e10'][i]]),
    ];
    const targets = paint.map(p => p[0]);
    const swatches = scene.querySelectorAll('.swatches span');
    const fill = q('.d-fill'), orb = q('.d-orb'), btn = q('.d-btn');
    const cards = scene.querySelectorAll('.d-cards i');

    const tl = gsap.timeline({ repeat: -1, paused: true });
    tl.set(targets, { backgroundColor: grey })
      .set([fill, orb], { opacity: 0, x: 0, y: 0 })
      .set(swatches, { scale: 0 });
    wait(tl, 0.6);
    tl.to(swatches, { scale: 1, duration: 0.4, stagger: 0.1, ease: 'back.out(2.5)' });
    paint.forEach(([el, color], i) => {
      tl.to(el, { backgroundColor: color, duration: 0.35 }, i ? '-=0.2' : '+=0.2');
    });
    tl.to(fill, { opacity: 1, duration: 0.5 }, '-=0.3')
      .to(orb, { opacity: 1, duration: 0.4 })
      // оживает: анимации
      .to(orb, { x: '60%', y: '50%', duration: 0.9, yoyo: true, repeat: 1, ease: 'sine.inOut' })
      .to(cards, { y: -8, duration: 0.25, stagger: 0.1, yoyo: true, repeat: 1, ease: 'power2.out' }, '<')
      .to(btn, { scale: 1.15, duration: 0.25, yoyo: true, repeat: 3, ease: 'power1.inOut' }, '<0.3');
    wait(tl, 1.6);
    tl.to(targets, { backgroundColor: grey, duration: 0.5 })
      .to([fill, orb], { opacity: 0, duration: 0.5 }, '<')
      .to(swatches, { scale: 0, duration: 0.3 }, '<');
    return tl;
  }

  /* ---------- 4. Запуск: терминал и прогресс ---------- */
  function launchScene(scene) {
    const lines = scene.querySelectorAll('.t-line');
    const bar = scene.querySelector('.t-progress i');
    const pct = scene.querySelector('.t-pct');
    const status = scene.querySelector('.t-status');
    const p = { v: 0 };
    const tl = gsap.timeline({ repeat: -1, paused: true });
    tl.set(lines, { opacity: 0, x: -10 })
      .set(status, { opacity: 0, scale: 0.8 })
      .set(p, { v: 0 })
      .set(bar, { scaleX: 0 });
    wait(tl, 0.4);
    tl.to(p, {
      v: 100, duration: 3.2, ease: 'none',
      onUpdate: () => {
        gsap.set(bar, { scaleX: p.v / 100 });
        pct.textContent = `${Math.round(p.v)}%`;
      },
    });
    lines.forEach((l, i) => tl.to(l, { opacity: 1, x: 0, duration: 0.3 }, 0.6 + i * 0.8));
    tl.to(status, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' });
    wait(tl, 2.5);
    tl.to([lines, status], { opacity: 0, duration: 0.4 });
    return tl;
  }

  /* ---------- 5. Оплата открывается только после запуска ---------- */
  function payScene(scene) {
    const icon = scene.querySelector('.pay-icon');
    const title = scene.querySelector('.pay-title');
    const bill = scene.querySelector('.pay-bill');
    const btn = scene.querySelector('.pay-btn');
    const note = scene.querySelector('.pay-note');
    const reset = () => {
      icon.classList.remove('ok');
      title.textContent = 'Проверяем сайт…';
      btn.textContent = 'Оплатить';
      btn.classList.remove('paid');
      note.textContent = 'Оплата откроется только после запуска';
    };
    const tl = gsap.timeline({ repeat: -1, paused: true, onRepeat: reset });
    tl.set(bill, { opacity: 0.35 })
      .set(btn, { scale: 1 });
    wait(tl, 1.8);
    tl.call(() => {
      icon.classList.add('ok');
      title.textContent = 'Сайт работает';
      note.textContent = 'Сайт запущен — теперь можно оплатить';
    })
      .to(bill, { opacity: 1, duration: 0.5 })
      .to(btn, { scale: 1.08, duration: 0.25, yoyo: true, repeat: 3, ease: 'power1.inOut' })
      .to(btn, { scale: 0.92, duration: 0.1, yoyo: true, repeat: 1 })
      .call(() => {
        btn.textContent = 'Оплачено ✓';
        btn.classList.add('paid');
        note.textContent = 'Готово! Сайт работает, оплата получена';
      });
    wait(tl, 2.8);
    reset();
    return tl;
  }

  const builders = {
    'scene-chat': chatScene,
    'scene-wire': wireScene,
    'scene-design': designScene,
    'scene-launch': launchScene,
    'scene-pay': payScene,
  };

  document.querySelectorAll('.scene').forEach(scene => {
    const type = Object.keys(builders).find(c => scene.classList.contains(c));
    if (!type) return;
    const tl = builders[type](scene);
    if (reduceMotion) { tl.progress(0.7).pause(); return; }
    // сцена крутится, только пока её видно
    new IntersectionObserver(([e]) => { if (e.isIntersecting) tl.play(); else tl.pause(); })
      .observe(scene);
  });

  /* ---------- Блок «Только код»: честные цифры, посчитанные вживую ---------- */
  const section = document.querySelector('.nocode');
  if (!section) return;
  const stat = name => section.querySelector(`[data-stat="${name}"]`);

  // сколько картинок реально загружено: <img>, фоновые картинки и запросы изображений
  function countImages() {
    let n = document.images.length;
    document.querySelectorAll('body *').forEach(el => {
      if (getComputedStyle(el).backgroundImage.includes('url(')) n++;
    });
    n += performance.getEntriesByType('resource').filter(r => r.initiatorType === 'img').length;
    return n;
  }

  // свой код: считаем строки и вес файлов, из которых собран сайт
  const FILES = ['index.html', 'css/style.css', 'css/extras.css', 'js/config.js', 'js/preloader.js', 'js/main.js', 'js/hero.js', 'js/scenes.js', 'js/extras.js'];
  const codeStats = Promise.all(FILES.map(f => fetch(f).then(r => r.text())))
    .then(texts => ({
      lines: texts.reduce((s, t) => s + t.split('\n').length, 0),
      kb: Math.round(texts.reduce((s, t) => s + new TextEncoder().encode(t).length, 0) / 1024),
    }))
    .catch(() => null);

  const countUp = (el, to) => {
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('ru-RU'); } });
  };

  ScrollTrigger.create({
    trigger: section,
    start: 'top 70%',
    once: true,
    onEnter: () => {
      // большой ноль отсчитывается вниз
      const zero = section.querySelector('.nocode-zero');
      const z = { v: 99 };
      gsap.to(z, { v: 0, duration: 1.4, ease: 'power3.out', onUpdate: () => { zero.textContent = Math.round(z.v); } });
      stat('images').textContent = countImages();
      codeStats.then(s => {
        if (!s) return;
        countUp(stat('lines'), s.lines);
        countUp(stat('kb'), s.kb);
      });
    },
  });

  // FPS — замеряем прямо сейчас
  let frames = 0, last = performance.now();
  const fpsEl = stat('fps');
  (function tick(now) {
    frames++;
    if (now - last >= 500) {
      fpsEl.textContent = Math.min(144, Math.round(frames * 1000 / (now - last)));
      frames = 0;
      last = now;
    }
    requestAnimationFrame(tick);
  })(last);
})();
