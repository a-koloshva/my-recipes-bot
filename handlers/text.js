import { CATEGORIES, getRecipesByCategory } from '../data.js';
import { getSession, resetSession } from '../sessions.js';
import { mainMenu, backToMenu } from '../keyboards/main.js';
import { categoryMenu } from '../keyboards/categories.js';
import pkg from 'telegraf';
const { Markup } = pkg;

export function registerText(bot) {
    bot.on('text', async (ctx) => {
        const text = ctx.message.text.trim();
        const session = getSession(ctx.chat.id);

        // Игнорируем команды (они обработаны регистрацией команд)
        if (text.startsWith('/')) {
            return;
        }

        // 🚫 Отмена
        if (text.toLowerCase() === 'cancel') {
            resetSession(session);
            await ctx.reply('Действие отменено.', mainMenu());
            return;
        }

        // 🔢 Выбор рецепта по номеру из категории
        if (session.selectCategory) {
            const recipeNumber = Number.parseInt(text, 10);

            if (!Number.isInteger(recipeNumber) || recipeNumber < 1) {
                await ctx.reply('❌ Введи корректный номер блюда.');
                return;
            }

            const recipes = await getRecipesByCategory(session.selectCategory);
            const recipe = recipes[recipeNumber - 1];

            if (!recipe) {
                await ctx.reply(`❌ Блюдо с номером ${recipeNumber} не найдено.`);
                return;
            }

            session.selectCategory = undefined;

            await ctx.reply(
                `🍽 *${recipe.name}*\n\n` +
                    `📝 ${recipe.description || 'Описание отсутствует'}\n\n` +
                    (recipe.link ? `🔗 ${recipe.link}\n\n` : '') +
                    `📂 Категория: ${CATEGORIES[recipe.category]}`,
                {
                    parse_mode: 'Markdown',
                    ...backToMenu(),
                },
            );
            return;
        }

        // 📝 Ввод названия рецепта
        if (session.addStep === 'wait_name') {
            if (!text) {
                await ctx.reply('❌ Название не может быть пустым.');
                return;
            }

            session.pendingName = text;
            session.addStep = 'wait_description';

            await ctx.reply(
                '📝 Введи описание блюда или вернись к меню',
                Markup.inlineKeyboard([
                    [Markup.button.callback('⬅️ Главное меню', 'back_to_menu')],
                ]),
            );
            return;
        }

        // 📝 Ввод описания рецепта
        if (session.addStep === 'wait_description') {
            if (!text) {
                await ctx.reply('❌ Описание не может быть пустым.');
                return;
            }

            session.pendingDescription = text;
            session.addStep = 'wait_link';

            await ctx.reply(
                '🔗 Введи ссылку на рецепт или напиши "пропустить"',
                Markup.inlineKeyboard([
                    [Markup.button.callback('⬅️ Главное меню', 'back_to_menu')],
                ]),
            );
            return;
        }

        // 🔗 Ввод необязательной ссылки
        if (session.addStep === 'wait_link') {
            session.pendingLink = ['пропустить', 'skip'].includes(text.toLowerCase()) ? '' : text;
            session.addStep = 'wait_category';

            await ctx.reply('📂 Выбери категорию блюда:', categoryMenu());
        }
    });
}
