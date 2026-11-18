// Cloudflare Worker: Telegram bot (webhook) for Saman Chords.
// Secrets: BOT_TOKEN, WEBHOOK_SECRET  (npx wrangler secret put ...)

const APP_URL = "https://saman-h.github.io/saman-chords/?v=2";
const CHANNEL_URL = "https://t.me/Saman_sing";
const INSTAGRAM_URL = "https://www.instagram.com/saman.tunes";

const SOCIAL_TEXT =
  "📣 تلگرام: @Saman_sing\n" +
  "📷 اینستاگرام: instagram.com/saman.tunes";

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      // One-time setup: open  https://YOUR-WORKER-URL/?setup=WEBHOOK_SECRET  to connect the bot to this Worker.
      const u = new URL(request.url);
      const setup = u.searchParams.get("setup");
      if (setup !== null) {
        if (!env.BOT_TOKEN || !env.WEBHOOK_SECRET) {
          return new Response(
            "Missing Secret: " + (!env.BOT_TOKEN ? "BOT_TOKEN " : "") + (!env.WEBHOOK_SECRET ? "WEBHOOK_SECRET" : "")
          );
        }
        if (setup !== env.WEBHOOK_SECRET) {
          return new Response("Wrong setup secret: it does not match WEBHOOK_SECRET");
        }
        const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: u.origin,
            secret_token: env.WEBHOOK_SECRET,
            allowed_updates: ["message"]
          })
        });
        return new Response(await r.text());
      }
      return new Response("Saman Chords Bot is running! (v2)");
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (
      !env.BOT_TOKEN ||
      !env.WEBHOOK_SECRET ||
      request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const message = update.message;
    if (!message?.chat?.id || !message.text) {
      return new Response("OK");
    }

    const chatId = message.chat.id;
    const command = message.text.trim().split(/\s+/)[0].split("@")[0];

    let text;
    let replyMarkup;

    // Row 1: opens the mini app. Row 2: channel + Instagram.
    const socialRow = [
      { text: "📣 کانال تلگرام", url: CHANNEL_URL },
      { text: "📷 اینستاگرام", url: INSTAGRAM_URL }
    ];
    const appRow = [{ text: "🎸 اجرای Saman Chords", web_app: { url: APP_URL } }];

    const appButton = { inline_keyboard: [appRow, socialRow] };
    const socialButton = { inline_keyboard: [socialRow] };

    if (command === "/start") {
      text =
        "🎸 به Saman Chords خوش اومدی!\n\n" +
        "با حرکت دستت آکوردهای گیتار رو انتخاب کن و تجربه‌ای متفاوت از نوازندگی داشته باش.\n\n" +
        "برای شروع، روی دکمه زیر بزن.\n\n" +
        SOCIAL_TEXT;
      replyMarkup = appButton;
    } else if (command === "/help") {
      text =
        "🎵 راهنمای استفاده از Saman Chords\n\n" +
        "۱. اپ رو باز کن.\n" +
        "۲. اجازه دسترسی به دوربین رو بده.\n" +
        "۳. دستت رو داخل کادر دوربین قرار بده.\n" +
        "۴. از ژست‌های تعریف‌شده برای انتخاب آکوردها استفاده کن.\n\n" +
        "💡 نور مناسب و قرار گرفتن کامل دست در کادر به تشخیص بهتر کمک می‌کنه.\n\n" +
        SOCIAL_TEXT;
      replyMarkup = appButton;
    } else if (command === "/app") {
      text = "🎸 برای اجرای اپ روی دکمه زیر بزن:";
      replyMarkup = appButton;
    } else if (command === "/links" || command === "/channel" || command === "/instagram") {
      text = "🎶 صفحه‌های Saman.tunes:\n\n" + SOCIAL_TEXT;
      replyMarkup = socialButton;
    } else {
      return new Response("OK");
    }

    const result = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup })
    });

    if (!result.ok) {
      return new Response("Telegram API error", { status: 502 });
    }
    return new Response("OK");
  }
};
