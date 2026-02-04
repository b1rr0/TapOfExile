import "dotenv/config";
import { Telegraf } from "telegraf";

const BOT_TOKEN: string | undefined = process.env.BOT_TOKEN;
const WEBAPP_URL: string | undefined = process.env.WEBAPP_URL;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is not set. Set it via environment variable.");
  process.exit(1);
}

if (!WEBAPP_URL) {
  console.error("WEBAPP_URL is not set. Set it via environment variable.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.command("start", (ctx) => {
  ctx.reply("Welcome to 33Metro! Tap the button below to play.", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "\uD83D\uDE87 Play 33Metro",
            web_app: { url: WEBAPP_URL },
          },
        ],
      ],
    },
  });
});

bot.command("help", (ctx) => {
  ctx.reply(
    "33Metro \u2014 a Telegram mini-app game.\n\n" +
      "Commands:\n" +
      "/start \u2014 Open the game\n" +
      "/help \u2014 Show this message"
  );
});

bot.launch();
console.log("Bot is running...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
