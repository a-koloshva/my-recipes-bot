import pkg from 'telegraf';
const { Markup } = pkg;
import {
    CATEGORIES,
    addRecipe,
    getAllRecipes,
    getRecipesByCategory,
    deleteRecipe,
} from '../data.js';
import { getSession, resetSession } from '../sessions.js';
import { mainMenu, backToMenu } from '../keyboards/main.js';
import { mealsMenu, categoryActions } from '../keyboards/meals.js';

export function registerCallbacks(bot) {
    bot.on('callback_query', async (ctx) => {
        const query = ctx.callbackQuery.data;
        const msg = ctx.callbackQuery.message;
        if (!msg) return;

        const session = getSession(ctx.chat.id);

        // 🗑 Удаление рецепта по ID
        const deleteMatch = query.match(/^delete_(\d+)$/);
        if (deleteMatch) {
            const id = parseInt(deleteMatch[1]);
            const deleted = await deleteRecipe(id);
            if (deleted) {
                await ctx.editMessageText('✅ Рецепт удален!', mainMenu());
            } else {
                await ctx.answerCbQuery('❌ Рецепт не найден', { show_alert: true });
            }
            return;
        }

        // ⬅️ Назад в главное меню
        if (query === 'back_to_menu') {
            resetSession(session);
            await ctx.editMessageText('Выбери действие:', mainMenu());
            return;
        }

        // 📩 Выбор категории при добавлении рецепта
        const categoryMatch = query.match(/^category_(.+)$/);
        if (categoryMatch && session.addStep === 'wait_category') {
            const category = categoryMatch[1];
            const name = session.pendingName || 'Рецепт';
            const recipe = await addRecipe(name, category, session.pendingDescription);

            resetSession(session);

            await ctx.editMessageText(
                `✅ Рецепт добавлен!\n\n` +
                    `🆔 ID: ${recipe.id}\n` +
                    `📝 Название: ${recipe.name}\n` +
                    `📂 Категория: ${CATEGORIES[recipe.category]}`,
                mainMenu(),
            );
            return;
        }

        // ⬅️ Вернуться к приёмам пищи
        if (query === 'back_to_meals') {
            session.selectCategory = undefined;
            await ctx.editMessageText('🍽 Выбери приём пищи:', mealsMenu());
            return;
        }

        // 🍽 Выбор блюда из категории
        const chooseRecipeMatch = query.match(/^choose_recipe_(breakfast|lunch|dinner)$/);
        if (chooseRecipeMatch) {
            const category = chooseRecipeMatch[1];
            const recipes = await getRecipesByCategory(category);

            if (recipes.length === 0) {
                await ctx.answerCbQuery(
                    `❌ Блюд в категории "${CATEGORIES[category]}" не найдено`,
                    { show_alert: true },
                );
                return;
            }

            let message = `🍽 Блюда категории «${CATEGORIES[category]}»:\n\n`;

            recipes.forEach((recipe, index) => {
                message += `${index + 1}. *${recipe.name}*\n`;
            });

            message += '\nВведи порядковый номер блюда:';

            session.selectCategory = category;

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...categoryActions(category),
            });
            return;
        }

        // ---------- Главное меню ----------
        switch (query) {
            // ➕ Добавить рецепт — ждём название
            case 'add_recipe': {
                session.addStep = 'wait_name';
                await ctx.editMessageText(
                    '📝 Введи название блюда или вернись к меню',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('⬅️ Главное меню', 'back_to_menu')],
                    ]),
                );
                return;
            }

            // 📋 Все рецепты
            case 'list_all': {
                const allRecipes = await getAllRecipes();

                if (allRecipes.length === 0) {
                    await ctx.answerCbQuery('❌ Рецептов не найдено', { show_alert: true });
                    return;
                }

                let message = '📋 Все рецепты:\n\n';

                Object.keys(CATEGORIES).forEach((category) => {
                    const categoryRecipes = allRecipes.filter((r) => r.category === category);
                    if (categoryRecipes.length > 0) {
                        message += `*${CATEGORIES[category]}:*\n`;
                        categoryRecipes.forEach((recipe) => {
                            message += `  • ${recipe.name}\n`;
                        });
                        message += '\n';
                    }
                });

                await ctx.editMessageText(message, {
                    parse_mode: 'Markdown',
                    ...backToMenu(),
                });
                return;
            }

            // 🍽 Приёмы пищи
            case 'show_meals': {
                await ctx.editMessageText('🍽 Выбери приём пищи:', mealsMenu());
                return;
            }

            // 🍳 Завтрак
            case 'show_breakfast': {
                await showCategory(ctx, 'breakfast');
                return;
            }

            // 🥗 Обед
            case 'show_lunch': {
                await showCategory(ctx, 'lunch');
                return;
            }

            // 🍲 Ужин
            case 'show_dinner': {
                await showCategory(ctx, 'dinner');
                return;
            }

            // 🗑 Удалить рецепт — показать список с кнопками
            case 'delete_recipe': {
                const allRecipes = await getAllRecipes();

                if (allRecipes.length === 0) {
                    await ctx.answerCbQuery('❌ Нет рецептов для удаления', { show_alert: true });
                    return;
                }

                const deleteButtons = allRecipes.map((recipe) => [
                    Markup.button.callback(`🗑 ${recipe.name}`, `delete_${recipe.id}`),
                ]);

                deleteButtons.push([Markup.button.callback('⬅️ Главное меню', 'back_to_menu')]);

                await ctx.editMessageText(
                    '🗑 Выбери рецепт для удаления:',
                    Markup.inlineKeyboard(deleteButtons),
                );
                return;
            }
        }
    });
}

// Вспомогательная функция — показать категорию
async function showCategory(ctx, category) {
    const recipes = await getRecipesByCategory(category);

    if (recipes.length === 0) {
        await ctx.answerCbQuery(`❌ Блюд в категории "${CATEGORIES[category]}" не найдено`, {
            show_alert: true,
        });
        return;
    }

    let message = `🍽 ${CATEGORIES[category]}:\n\n`;

    recipes.forEach((recipe, index) => {
        message += `${index + 1}. *${recipe.name}*\n   _${recipe.description || 'Описание отсутствует'}_\n\n`;
    });

    await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...categoryActions(category),
    });
}
