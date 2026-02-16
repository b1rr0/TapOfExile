import "dotenv/config";
import { Telegraf, Input } from "telegraf";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const welcomeImage = path.join(__dirname, "assets", "welcome.png");

bot.command("start", (ctx) => {
  const name = ctx.from.first_name || "Warrior";
  ctx.replyWithPhoto(Input.fromLocalFile(welcomeImage), {
    caption:
      "⚔️ *Let the game begin!*\n\n" +
      `Welcome, ${name}. Darkness is rising and monsters grow stronger.\n` +
      "Choose your class, gear up, and fight your way through!\n\n" +
      "Tap the button below to start your journey.",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "⚔️ Play Tap of Exile ⚔️",
            web_app: { url: WEBAPP_URL },
          },
        ],
      ],
    },
  });
});

bot.command("help", (ctx) => {
  ctx.reply(
    "Tap of Exile \u2014 a Telegram mini-app game.\n\n" +
      "Commands:\n" +
      "/start \u2014 Open the game\n" +
      "/help \u2014 Show this message"
  );
});

bot.launch();
console.log("Bot is running...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
