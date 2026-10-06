/**
 * «Магнетар» — заявки с сайта и бот-анкета в Telegram.
 *
 * Один скрипт делает две вещи:
 *  1. Принимает заявки с формы на сайте и присылает их вам в Telegram.
 *  2. Работает ботом: клиент пишет боту, бот задаёт наводящие вопросы
 *     и присылает вам готовую анкету (бриф).
 *
 * Секреты НЕ хранятся в коде — они в «Настройки проекта → Свойства скрипта»:
 *   TELEGRAM_BOT_TOKEN — токен от @BotFather
 *   OWNER_CHAT_ID      — куда присылать заявки: ваш личный ID или ID группы
 *   WEBAPP_URL         — URL веб-приложения (…/exec), появляется после развёртывания
 *   WEBHOOK_SECRET     — создаётся сам при запуске setWebhook
 *
 * Как развернуть — см. backend/README.md.
 */

var MIN_FILL_MS = 3000;          // быстрее человек форму не заполнит
var CONTACT_COOLDOWN_SEC = 120;  // одна заявка с одного контакта раз в 2 минуты
var GLOBAL_LIMIT = 30;           // не больше 30 заявок с сайта за 10 минут
var GLOBAL_WINDOW_SEC = 600;
var STATE_TTL_SEC = 21600;       // анкета «помнит» ответы 6 часов
var PLANS = ["Старт", "Бизнес", "Вау", "Пока не знаю"];

/* ───────── Вопросы бота ─────────
   buttons — варианты кнопками; free: true — можно ответить своими словами;
   skip — кнопка «Пропустить»; contact — кнопка «Поделиться номером». */
var QUESTIONS = [
  { key: "business", title: "Бизнес", text: "Здравствуйте! Я помогу собрать бриф для сайта — это займёт минуту.\n\n<b>1/6. Чем занимается ваш бизнес?</b>",
    buttons: ["Кафе или ресторан", "Салон, услуги", "Магазин", "Медицина", "Обучение"], free: true },
  { key: "task", title: "Задача", text: "<b>2/6. Что нужно сделать?</b>",
    buttons: ["Новый лендинг", "Редизайн сайта", "Перенос с Тильды", "Пока не знаю"] },
  { key: "plan", title: "Пакет", text: "<b>3/6. Какой пакет ближе?</b>\n\nСтарт — 5 000 ₽, 7 дней\nБизнес — 10 000 ₽, 10–14 дней\nВау — 15 000 ₽, 3–4 недели\n\nОплата — только когда сайт уже работает.",
    buttons: ["Старт", "Бизнес", "Вау", "Помогите выбрать"] },
  { key: "extras", title: "Дополнительно", text: "<b>4/6. Что ещё нужно на сайте?</b>\nНапример: квиз, корзина, онлайн-запись, тексты, логотип. Напишите своими словами.",
    free: true, skip: true },
  { key: "deadline", title: "Срок", text: "<b>5/6. К какому сроку нужен сайт?</b>",
    buttons: ["Как можно скорее", "В течение месяца", "Не горит"] },
  { key: "name", title: "Имя", text: "<b>6/6. Как к вам обращаться?</b>", free: true },
  { key: "phone", title: "Телефон", text: "И последнее — телефон для связи. Нажмите кнопку ниже или напишите номер.",
    free: true, contact: true, skip: true },
];

/* ───────── Точка входа ───────── */

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.update_id !== undefined) return handleTelegram_(e, body);
    return handleSiteForm_(body);
  } catch (err) {
    console.error(err);
    return json_({ ok: false });
  }
}

/** Открытие URL в браузере — просто проверка, что скрипт развёрнут. */
function doGet() {
  return json_({ ok: true, service: "magnetar-leads" });
}

/* ───────── 1. Заявка с формы сайта ───────── */

function handleSiteForm_(d) {
  // Ловушка для ботов и слишком быстрая отправка — отвечаем «ок», чтобы не подсказывать
  if (d.website || Number(d.elapsedMs) < MIN_FILL_MS) return json_({ ok: true });

  var name = String(d.name || "").trim().slice(0, 60);
  var contact = String(d.contact || "").trim().slice(0, 80);
  var plan = PLANS.indexOf(d.plan) === -1 ? "Пока не знаю" : d.plan;
  var message = String(d.message || "").trim().slice(0, 1000);
  if (name.length < 2) return json_({ ok: false, error: "Укажите имя." });
  if (contact.length < 3) return json_({ ok: false, error: "Укажите телефон или Telegram." });

  var cache = CacheService.getScriptCache();
  var contactKey = "contact:" + contact.toLowerCase().replace(/\s/g, "");
  if (cache.get(contactKey)) return json_({ ok: false, error: "Заявка уже отправлена — скоро свяжусь!" });
  var count = Number(cache.get("global") || 0);
  if (count >= GLOBAL_LIMIT) return json_({ ok: false, error: "Слишком много заявок, попробуйте через несколько минут." });

  var lines = [
    "🔥 <b>Заявка с сайта</b>",
    "",
    "👤 <b>" + esc_(name) + "</b>",
    "📞 " + esc_(contact),
    "📦 Пакет: <b>" + esc_(plan) + "</b>",
  ];
  if (message) lines.push("💬 " + esc_(message));
  lines.push("", "<i>Оплата — после запуска сайта</i>");
  sendMessage_(ownerChatId_(), lines.join("\n"));

  cache.put(contactKey, "1", CONTACT_COOLDOWN_SEC);
  cache.put("global", String(count + 1), GLOBAL_WINDOW_SEC);
  return json_({ ok: true });
}

/* ───────── 2. Бот-анкета ───────── */

function handleTelegram_(e, update) {
  var props = PropertiesService.getScriptProperties();
  // Принимаем только запросы от Telegram: секрет передаётся в адресе вебхука
  if (!e.parameter || e.parameter.secret !== props.getProperty("WEBHOOK_SECRET")) return json_({ ok: true });

  // Telegram может прислать одно и то же обновление повторно — обрабатываем один раз
  var cache = CacheService.getScriptCache();
  var seenKey = "upd:" + update.update_id;
  if (cache.get(seenKey)) return json_({ ok: true });
  cache.put(seenKey, "1", STATE_TTL_SEC);

  var msg = update.message;
  var cb = update.callback_query;
  var chat = msg ? msg.chat : cb && cb.message && cb.message.chat;
  if (!chat || chat.type !== "private") return json_({ ok: true }); // в группах бот молчит
  var user = msg ? msg.from : cb.from;

  if (cb) callApi_("answerCallbackQuery", { callback_query_id: cb.id });

  var text = msg && msg.text ? msg.text.trim() : "";
  if (text.indexOf("/start") === 0 || text === "/restart") {
    var fresh = { step: 0, answers: {} };
    saveState_(chat.id, fresh);
    ask_(chat.id, fresh);
    return json_({ ok: true });
  }

  var state = loadState_(chat.id);
  if (!state) {
    sendMessage_(chat.id, "Чтобы заполнить бриф для сайта, нажмите /start");
    return json_({ ok: true });
  }
  var q = QUESTIONS[state.step];

  // Достаём ответ: кнопка, текст или номер телефона
  var answer = null;
  if (cb && cb.data) {
    var parts = cb.data.split("|"); // «шаг|номер варианта»
    if (Number(parts[0]) !== state.step) return json_({ ok: true }); // нажали старую кнопку
    answer = parts[1] === "skip" ? "—" : q.buttons[Number(parts[1])];
  } else if (msg && msg.contact && q.contact) {
    answer = msg.contact.phone_number;
  } else if (msg && msg.text && q.free) {
    answer = msg.text.slice(0, 500);
  } else if (msg && msg.text) {
    sendMessage_(chat.id, "Выберите вариант кнопкой ниже 👇");
    return json_({ ok: true });
  }
  if (answer === null) return json_({ ok: true });

  state.answers[q.key] = answer;
  state.step++;

  if (state.step < QUESTIONS.length) {
    saveState_(chat.id, state);
    ask_(chat.id, state);
  } else {
    finishBrief_(chat.id, user, state.answers);
    CacheService.getScriptCache().remove("state:" + chat.id);
  }
  return json_({ ok: true });
}

function ask_(chatId, state) {
  var q = QUESTIONS[state.step];
  var markup;
  if (q.contact) {
    // кнопка «Поделиться номером» — обычная клавиатура Telegram
    markup = { keyboard: [[{ text: "📱 Поделиться номером", request_contact: true }], [{ text: "Пропустить" }]], resize_keyboard: true, one_time_keyboard: true };
  } else if (q.buttons || q.skip) {
    var rows = (q.buttons || []).map(function (b, i) { return [{ text: b, callback_data: state.step + "|" + i }]; });
    if (q.skip) rows.push([{ text: "Пропустить", callback_data: state.step + "|skip" }]);
    markup = { inline_keyboard: rows };
  }
  sendMessage_(chatId, q.text, markup);
}

function finishBrief_(chatId, user, a) {
  if (a.phone === "Пропустить") a.phone = "—";
  sendMessage_(chatId,
    "Спасибо, " + esc_(a.name || "") + "! Бриф у меня — свяжусь с вами в ближайшее время.\n\nНапоминаю: оплата только когда сайт уже запущен и работает 🙌",
    { remove_keyboard: true });

  var who = user.username ? "@" + user.username : esc_([user.first_name, user.last_name].filter(Boolean).join(" "));
  var lines = ["🧲 <b>Новый бриф из Telegram</b>", "", "👤 " + who + ' · <a href="tg://user?id=' + user.id + '">написать</a>', ""];
  QUESTIONS.forEach(function (q) {
    lines.push("<b>" + q.title + ":</b> " + esc_(a[q.key] || "—"));
  });
  sendMessage_(ownerChatId_(), lines.join("\n"));
}

/* ───────── Состояние анкеты ───────── */

function loadState_(chatId) {
  var raw = CacheService.getScriptCache().get("state:" + chatId);
  return raw ? JSON.parse(raw) : null;
}

function saveState_(chatId, state) {
  CacheService.getScriptCache().put("state:" + chatId, JSON.stringify(state), STATE_TTL_SEC);
}

/* ───────── Telegram API ───────── */

function sendMessage_(chatId, text, markup) {
  var payload = { chat_id: chatId, text: text, parse_mode: "HTML", disable_web_page_preview: true };
  if (markup) payload.reply_markup = markup;
  return callApi_("sendMessage", payload);
}

function callApi_(method, payload) {
  var token = PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан в свойствах скрипта");
  var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  var data = JSON.parse(res.getContentText());
  if (!data.ok) throw new Error("Telegram " + method + ": " + res.getContentText());
  return data.result;
}

function ownerChatId_() {
  var id = PropertiesService.getScriptProperties().getProperty("OWNER_CHAT_ID");
  if (!id) throw new Error("OWNER_CHAT_ID не задан в свойствах скрипта");
  return id;
}

function esc_(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ───────── Служебные функции: запускаются вручную из редактора ───────── */

/**
 * Шаг 1: напишите боту /start в личке (или добавьте бота в группу и напишите там),
 * затем запустите эту функцию — в «Журнале выполнения» появятся ID чатов.
 * Работает только ДО setWebhook (потом Telegram отдаёт сообщения вебхуку).
 */
function findChatId() {
  var res = callApi_("getUpdates", {});
  var seen = {};
  res.forEach(function (u) {
    var m = u.message || u.my_chat_member || u.channel_post;
    if (m && m.chat && !seen[m.chat.id]) {
      seen[m.chat.id] = true;
      console.log((m.chat.type === "private" ? "Личка" : "Группа") + " «" + (m.chat.title || m.chat.first_name) + "» → OWNER_CHAT_ID = " + m.chat.id);
    }
  });
  if (!Object.keys(seen).length) console.log("Сообщений не найдено. Напишите боту /start и запустите ещё раз.");
}

/** Шаг 2: проверка — присылает тестовую заявку в OWNER_CHAT_ID. */
function sendTest() {
  sendMessage_(ownerChatId_(), "✅ <b>Магнетар на связи</b>\nСюда будут приходить заявки с сайта и брифы из бота.");
  console.log("Тестовое сообщение отправлено");
}

/** Шаг 3 (после развёртывания и WEBAPP_URL): подключает бота к скрипту. */
function setWebhook() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty("WEBAPP_URL");
  if (!url) throw new Error("Сначала добавьте WEBAPP_URL (адрес веб-приложения, заканчивается на /exec)");
  var secret = props.getProperty("WEBHOOK_SECRET");
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, "");
    props.setProperty("WEBHOOK_SECRET", secret);
  }
  callApi_("setWebhook", { url: url + "?secret=" + secret, drop_pending_updates: true, allowed_updates: ["message", "callback_query"] });
  callApi_("setMyCommands", { commands: [{ command: "start", description: "Заполнить бриф для сайта" }] });
  console.log("Готово! Бот подключён. Напишите ему /start и проверьте анкету.");
}

/** Если нужно снова узнать ID чата через findChatId — сначала отключите вебхук. */
function deleteWebhook() {
  callApi_("deleteWebhook", {});
  console.log("Вебхук отключён");
}
