// Яндекс Метрика с вебвизором — грузится только после «Разрешить» в плашке про cookie.
// Номер счётчика — metrikaId в js/config.js. Цели: lead (заявка с формы), telegram (переход в бота).
(() => {
  const id = Number((window.SITE_CONFIG || {}).metrikaId);
  const KEY = 'magnetar-cookie';
  const reset = document.querySelector('.cookie-reset');
  window.metrikaGoal = goal => window.ym && ym(id, 'reachGoal', goal);
  if (!id) { reset && (reset.hidden = true); return; }

  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const save = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };

  function load() {
    if (window.ym) return;
    window.ym = function () { (ym.a = ym.a || []).push(arguments); };
    ym.l = Date.now();
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + id;
    document.head.appendChild(s);
    ym(id, 'init', { ssr: true, webvisor: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, referrer: document.referrer, url: location.href });
    // номер посетителя уходит вместе с заявкой — по нему визит находится в Вебвизоре
    ym(id, 'getClientID', cid => { window.metrikaClientId = cid; });
  }

  // клики по кнопкам Telegram-бота (они появляются из JS, поэтому слушаем документ)
  document.addEventListener('click', e => {
    if (e.target.closest('a[href*="t.me/"]')) metrikaGoal('telegram');
  });

  function ask() {
    if (document.querySelector('.cookie')) return;
    const box = document.createElement('div');
    box.className = 'cookie';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Cookie');
    box.innerHTML = 'Сайт использует cookie Яндекс Метрики, чтобы понимать, что посетителям интересно. Подробнее — в <a href="privacy.html">политике</a>.'
      + '<div class="cookie-actions"><button type="button" class="cookie-yes">Разрешить</button><button type="button" class="cookie-no">Только необходимые</button></div>';
    document.body.appendChild(box);
    box.offsetWidth; // применяем начальные стили, чтобы плашка выехала плавно
    box.classList.add('show');
    box.addEventListener('click', e => {
      const yes = e.target.closest('.cookie-yes'), no = e.target.closest('.cookie-no');
      if (!yes && !no) return;
      save(yes ? 'yes' : 'no');
      if (yes) load();
      box.classList.remove('show');
      setTimeout(() => box.remove(), 500);
    });
  }

  // отказ после разрешения: Метрика уже загружена, поэтому перезагружаем страницу без неё
  reset && reset.addEventListener('click', () => {
    if (read() === 'yes') { save(''); location.reload(); } else { save(''); ask(); }
  });

  const choice = read();
  if (choice === 'yes') load();
  // плашку показываем, когда заставка уже ушла
  else if (choice !== 'no') addEventListener('load', () => setTimeout(ask, 2500));
})();
