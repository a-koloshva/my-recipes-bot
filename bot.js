import 'dotenv/config';
import pkg from 'telegraf';
const { Telegraf } = pkg;

if (!process.env.BOT_TOKEN) {
    console.error('Ошибка: BOT_TOKEN не найден в .env файле');
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// Регистрация обработчиков
import { registerCommands } from './handlers/commands.js';
import { registerCallbacks } from './handlers/callbacks.js';
import { registerText } from './handlers/text.js';

registerCommands(bot);
registerCallbacks(bot);
registerText(bot);

// Обработка ошибок
bot.catch((err, ctx) => {
    console.error('Ошибка бота:', err);
    console.error('Context ID:', ctx.update.update_id);
});

console.log('🚀 Бот запущен...');
bot.launch();

// Корректная остановка
process.once('SIGINT', () => {
    console.log('Остановка бота (SIGINT)');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    console.log('Остановка бота (SIGTERM)');
    bot.stop('SIGTERM');
});
