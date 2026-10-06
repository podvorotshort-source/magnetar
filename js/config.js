// Настройки сайта — всё, что нужно поменять, в одном месте
window.SITE_CONFIG = {
  // URL Google Apps Script (…/exec) — заявки с формы уходят вам в Telegram.
  // Как получить — см. backend/README.md. Этот адрес не секретный.
  formEndpoint: 'https://script.google.com/macros/s/AKfycbzggItvwsbDEsg2uci1yD3hVdaYB_of52y0r5o5giyRedTCHFnp8fHMkN2t_zHaADz6/exec',

  // Юзернейм бота без @, например 'magnetar_brief_bot'.
  // Появятся кнопки «Обсудить в Telegram» (в форме и в плавающей кнопке).
  telegramBot: 'magnetar_brief_bot',
};
